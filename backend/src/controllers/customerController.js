
const pool = require("../config/db");

const CUSTOMER_CODE_SQL = `
  'CUS-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12))
`;

// Helper: write an audit log entry
async function createCustomerAudit(
  client,
  userId,
  action,
  customerId,
  oldValue,
  newValue,
  ipAddress
) {
  await client.query(
    `INSERT INTO audit_logs
      (user_id, action, entity_name, record_id, old_value, new_value, ip_address)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
    [
      userId,
      action,
      "Customer",
      customerId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ipAddress || null
    ]
  );
}

// GET /api/customers
// Supports pagination, search and status filtering
async function getCustomers(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );
    const offset = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const status = req.query.status;

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      const index = values.length;

      conditions.push(`
        (
          c.customer_name ILIKE $${index}
          OR c.email ILIKE $${index}
          OR c.phone ILIKE $${index}
          OR c.company_name ILIKE $${index}
          OR c.customer_code ILIKE $${index}
        )
      `);
    }

    if (status && ["Active", "Inactive"].includes(status)) {
      values.push(status);
      conditions.push(`c.status = $${values.length}`);
    }

    // Sales Executives can only see their own customers.
    if (req.user.role_name === "SalesExecutive") {
      values.push(req.user.user_id);
      conditions.push(`c.owner_id = $${values.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM customers c
       ${whereClause}`,
      values
    );

    const total = countResult.rows[0].total;

    const dataValues = [...values];
    dataValues.push(limit);
    const limitIndex = dataValues.length;

    dataValues.push(offset);
    const offsetIndex = dataValues.length;

    const customersResult = await pool.query(
      `SELECT
         c.customer_id,
         c.customer_code,
         c.customer_name,
         c.email,
         c.phone,
         c.company_name,
         c.address,
         c.city,
         c.state,
         c.status,
         c.owner_id,
         c.created_by,
         c.created_at,
         c.updated_at,
         u.full_name AS owner_name
       FROM customers c
       LEFT JOIN users u ON c.owner_id = u.user_id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${limitIndex}
       OFFSET $${offsetIndex}`,
      dataValues
    );

    return res.status(200).json({
      success: true,
      data: customersResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve customers."
    });
  }
}

// GET /api/customers/:id
async function getCustomerById(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         c.*,
         u.full_name AS owner_name
       FROM customers c
       LEFT JOIN users u ON c.owner_id = u.user_id
       WHERE c.customer_id = $1
         AND ($2::boolean = TRUE OR c.owner_id = $3)`,
      [
        id,
        req.user.role_name !== "SalesExecutive",
        req.user.user_id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Customer not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Get customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve customer."
    });
  }
}

// POST /api/customers
async function createCustomer(req, res) {
  const client = await pool.connect();

  try {
    const {
      customer_name,
      email,
      phone,
      company_name,
      address,
      city,
      state,
      status
    } = req.body;

    await client.query("BEGIN");

    const insertResult = await client.query(
      `INSERT INTO customers (
         customer_code,
         customer_name,
         email,
         phone,
         company_name,
         address,
         city,
         state,
         status,
         owner_id,
         created_by
       )
       VALUES (
         ${CUSTOMER_CODE_SQL},
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $9
       )
       RETURNING *`,
      [
        customer_name,
        email,
        phone,
        company_name ?? null,
        address ?? null,
        city ?? null,
        state ?? null,
        status || "Active",
        req.user.user_id
      ]
    );

    const customer = insertResult.rows[0];

    await createCustomerAudit(
      client,
      req.user.user_id,
      "CREATE",
      customer.customer_id,
      null,
      customer,
      req.ip
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      data: customer
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create customer error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A customer with this email, phone or customer code already exists."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create customer."
    });
  } finally {
    client.release();
  }
}

// PUT /api/customers/:id
async function updateCustomer(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const allowedFields = [
      "customer_name",
      "email",
      "phone",
      "company_name",
      "address",
      "city",
      "state",
      "status"
    ];

    const updates = Object.entries(req.body).filter(([key]) =>
      allowedFields.includes(key)
    );

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update."
      });
    }

    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT *
       FROM customers
       WHERE customer_id = $1
         AND ($2::boolean = TRUE OR owner_id = $3)
       FOR UPDATE`,
      [
        id,
        req.user.role_name !== "SalesExecutive",
        req.user.user_id
      ]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Customer not found."
      });
    }

    const oldCustomer = existingResult.rows[0];

    const setClauses = [];
    const values = [];

    for (const [key, value] of updates) {
      values.push(value);
      setClauses.push(`${key} = $${values.length}`);
    }

    values.push(id);

    const updateResult = await client.query(
      `UPDATE customers
       SET ${setClauses.join(", ")},
           updated_at = CURRENT_TIMESTAMP
       WHERE customer_id = $${values.length}
       RETURNING *`,
      values
    );

    const updatedCustomer = updateResult.rows[0];

    await createCustomerAudit(
      client,
      req.user.user_id,
      "UPDATE",
      id,
      oldCustomer,
      updatedCustomer,
      req.ip
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
      data: updatedCustomer
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update customer error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A customer with this email or phone already exists."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update customer."
    });
  } finally {
    client.release();
  }
}

// PATCH /api/customers/:id/deactivate
async function deactivateCustomer(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT *
       FROM customers
       WHERE customer_id = $1
         AND ($2::boolean = TRUE OR owner_id = $3)
       FOR UPDATE`,
      [
        id,
        req.user.role_name !== "SalesExecutive",
        req.user.user_id
      ]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Customer not found."
      });
    }

    const oldCustomer = existingResult.rows[0];

    if (oldCustomer.status === "Inactive") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Customer is already inactive."
      });
    }

    const updateResult = await client.query(
      `UPDATE customers
       SET status = 'Inactive',
           updated_at = CURRENT_TIMESTAMP
       WHERE customer_id = $1
       RETURNING *`,
      [id]
    );

    const updatedCustomer = updateResult.rows[0];

    await createCustomerAudit(
      client,
      req.user.user_id,
      "DEACTIVATE",
      id,
      oldCustomer,
      updatedCustomer,
      req.ip
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Customer deactivated successfully.",
      data: updatedCustomer
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Deactivate customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate customer."
    });
  } finally {
    client.release();
  }
}

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deactivateCustomer
};
