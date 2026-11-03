
const pool = require("../config/db");

const writeOpportunityAudit = async (
  client, userId, action, opportunityId, oldValue, newValue
) => {
  await client.query(
    `INSERT INTO audit_logs
      (user_id, action, entity_name, record_id, old_value, new_value)
     VALUES ($1, $2, 'Opportunity', $3, $4, $5)`,
    [
      userId,
      action,
      opportunityId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null
    ]
  );
};

const getOpportunities = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1), 100
    );
    const offset = (page - 1) * limit;

    const { search, stage, status, assigned_to } = req.query;
    const values = [];
    const conditions = [];

    const addCondition = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(o.opportunity_name ILIKE $${values.length}
          OR c.customer_name ILIKE $${values.length}
          OR l.lead_name ILIKE $${values.length})`
      );
    }

    if (stage) addCondition("o.stage = ?", stage);
    if (status) addCondition("o.status = ?", status);
    if (assigned_to) addCondition("o.assigned_to = ?::uuid", assigned_to);

    if (req.user.role_name === "SalesExecutive") {
      addCondition("o.assigned_to = ?::uuid", req.user.user_id);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM opportunities o
       LEFT JOIN customers c ON o.customer_id = c.customer_id
       LEFT JOIN leads l ON o.lead_id = l.lead_id
       ${whereClause}`,
      values
    );

    const total = Number(countResult.rows[0].total);

    const result = await pool.query(
      `SELECT
        o.*,
        c.customer_name,
        l.lead_name,
        u.full_name AS assigned_user_name,
        (o.amount * o.probability / 100) AS weighted_amount
       FROM opportunities o
       LEFT JOIN customers c ON o.customer_id = c.customer_id
       LEFT JOIN leads l ON o.lead_id = l.lead_id
       LEFT JOIN users u ON o.assigned_to = u.user_id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get opportunities error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve opportunities."
    });
  }
};

const getOpportunityById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, c.customer_name, l.lead_name,
              u.full_name AS assigned_user_name,
              (o.amount * o.probability / 100) AS weighted_amount
       FROM opportunities o
       LEFT JOIN customers c ON o.customer_id = c.customer_id
       LEFT JOIN leads l ON o.lead_id = l.lead_id
       LEFT JOIN users u ON o.assigned_to = u.user_id
       WHERE o.opportunity_id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found."
      });
    }

    const opportunity = result.rows[0];

    if (
      req.user.role_name === "SalesExecutive" &&
      opportunity.assigned_to !== req.user.user_id
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this opportunity."
      });
    }

    return res.status(200).json({
      success: true,
      data: opportunity
    });
  } catch (error) {
    console.error("Get opportunity error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve opportunity."
    });
  }
};

const createOpportunity = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      opportunity_name, customer_id, lead_id, amount,
      stage, probability, expected_close_date, status,
      assigned_to, notes
    } = req.body;

    const userId = req.user.user_id;
    const ownerId = req.user.role_name === "SalesExecutive"
      ? userId
      : (assigned_to || userId);

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO opportunities (
        opportunity_name, customer_id, lead_id, amount,
        stage, probability, expected_close_date, status,
        assigned_to, created_by, notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        opportunity_name,
        customer_id || null,
        lead_id || null,
        amount,
        stage,
        probability,
        expected_close_date,
        status,
        ownerId,
        userId,
        notes || null
      ]
    );

    const opportunity = result.rows[0];

    await writeOpportunityAudit(
      client, userId, "CREATE",
      opportunity.opportunity_id, null, opportunity
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Opportunity created successfully.",
      data: opportunity
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create opportunity error:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Selected customer, lead, or assigned user does not exist."
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Duplicate opportunity."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create opportunity."
    });
  } finally {
    client.release();
  }
};

const updateOpportunity = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.user_id;

    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT * FROM opportunities
       WHERE opportunity_id = $1
       FOR UPDATE`,
      [req.params.id]
    );

    if (!existingResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Opportunity not found."
      });
    }

    const oldValue = existingResult.rows[0];

    if (
      req.user.role_name === "SalesExecutive" &&
      oldValue.assigned_to !== userId
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "You cannot update this opportunity."
      });
    }

    const allowedFields = [
      "opportunity_name",
      "amount",
      "stage",
      "probability",
      "expected_close_date",
      "status",
      "notes"
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        values.push(req.body[field]);
        updates.push(`${field} = $${values.length}`);
      }
    }

    if (req.user.role_name !== "SalesExecutive" &&
        req.body.assigned_to !== undefined) {
      values.push(req.body.assigned_to);
      updates.push(`assigned_to = $${values.length}`);
    }

    if (!updates.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "No valid fields supplied for update."
      });
    }

    const merged = { ...oldValue, ...req.body };

    if (
      (merged.stage === "Won" && merged.status !== "Won") ||
      (merged.stage === "Lost" && merged.status !== "Lost") ||
      (["Qualification", "Proposal", "Negotiation"].includes(merged.stage) &&
        merged.status !== "Open")
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Opportunity stage and status do not match."
      });
    }

    if (merged.status === "Open" && Number(merged.amount) <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Open opportunities must have an amount greater than zero."
      });
    }

    if (
      merged.status === "Open" &&
      new Date(merged.expected_close_date) <
        new Date(new Date().toDateString())
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Expected close date cannot be in the past."
      });
    }

    values.push(req.params.id);

    const result = await client.query(
      `UPDATE opportunities
       SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE opportunity_id = $${values.length}
       RETURNING *`,
      values
    );

    const newValue = result.rows[0];

    await writeOpportunityAudit(
      client, userId, "UPDATE",
      req.params.id, oldValue, newValue
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Opportunity updated successfully.",
      data: newValue
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update opportunity error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update opportunity."
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity
};
