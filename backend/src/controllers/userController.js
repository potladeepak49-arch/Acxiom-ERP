
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const writeUserAudit = async (
  client,
  userId,
  action,
  recordId,
  oldValue,
  newValue
) => {
  await client.query(
    `INSERT INTO audit_logs (
      user_id, action, entity_name, record_id, old_value, new_value
    )
    VALUES ($1, $2, 'users', $3, $4::jsonb, $5::jsonb)`,
    [
      userId,
      action,
      recordId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null
    ]
  );
};

const safeUser = (user) => ({
  user_id: user.user_id,
  full_name: user.full_name,
  email: user.email,
  phone: user.phone,
  role_id: user.role_id,
  role_name: user.role_name,
  is_active: user.is_active,
  failed_login_attempts: user.failed_login_attempts,
  lockout_until: user.lockout_until,
  created_at: user.created_at,
  updated_at: user.updated_at
});


// GET USERS
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      role_id,
      status
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(parseInt(limit, 10) || 10, 1),
      100
    );
    const offset = (pageNumber - 1) * pageSize;

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(
        `(u.full_name ILIKE $${values.length}
          OR u.email ILIKE $${values.length}
          OR u.phone ILIKE $${values.length})`
      );
    }

    if (role_id) {
      values.push(role_id);
      conditions.push(`u.role_id = $${values.length}`);
    }

    if (status === "active") {
      conditions.push("u.is_active = TRUE");
    } else if (status === "inactive") {
      conditions.push("u.is_active = FALSE");
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM users u
       ${whereClause}`,
      values
    );

    const result = await pool.query(
      `SELECT
          u.user_id,
          u.full_name,
          u.email,
          u.phone,
          u.role_id,
          r.role_name,
          u.is_active,
          u.failed_login_attempts,
          u.lockout_until,
          u.created_at,
          u.updated_at
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, pageSize, offset]
    );

    const total = countResult.rows[0].total;

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve users."
    });
  }
};


// GET ROLES
const getRoles = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT role_id, role_name
       FROM roles
       ORDER BY role_name`
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Get roles error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve roles."
    });
  }
};


// GET USER BY ID
const getUserById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          u.user_id,
          u.full_name,
          u.email,
          u.phone,
          u.role_id,
          r.role_name,
          u.is_active,
          u.failed_login_attempts,
          u.lockout_until,
          u.created_at,
          u.updated_at
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to retrieve user."
    });
  }
};


// CREATE USER
const createUser = async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const {
      full_name,
      email,
      password,
      role_id,
      phone,
      is_active
    } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    const roleResult = await client.query(
      "SELECT role_id FROM roles WHERE role_id = $1",
      [role_id]
    );

    if (!roleResult.rows.length) {
      return res.status(400).json({
        success: false,
        message: "Selected role does not exist."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO users (
        full_name, email, password_hash, role_id, phone, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        user_id, full_name, email, phone, role_id,
        is_active, created_at, updated_at`,
      [
        full_name,
        normalizedEmail,
        passwordHash,
        role_id,
        phone || null,
        is_active
      ]
    );

    const user = result.rows[0];

    const role = await client.query(
      "SELECT role_name FROM roles WHERE role_id = $1",
      [role_id]
    );

    const safeCreatedUser = {
      ...user,
      role_name: role.rows[0].role_name
    };

    await writeUserAudit(
      client,
      req.user.user_id,
      "CREATE",
      user.user_id,
      null,
      safeCreatedUser
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: safeCreatedUser
    });

  } catch (error) {
    if (client) await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists."
      });
    }

    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to create user."
    });

  } finally {
    if (client) client.release();
  }
};


// UPDATE USER
const updateUser = async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const userId = req.params.id;
    const currentUserId = req.user.user_id;

    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT
          u.user_id,
          u.full_name,
          u.email,
          u.phone,
          u.role_id,
          r.role_name,
          u.is_active,
          u.failed_login_attempts,
          u.lockout_until,
          u.created_at,
          u.updated_at
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = $1
       FOR UPDATE OF u`,
      [userId]
    );

    if (!existingResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const existing = existingResult.rows[0];
    const updates = [];
    const values = [];

    const allowedFields = [
      "full_name",
      "email",
      "phone",
      "role_id",
      "is_active"
    ];

    const changes = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];

        if (field === "email") {
          value = value.toLowerCase().trim();
        }

        values.push(value);
        updates.push(`${field} = $${values.length}`);
        changes[field] = value;
      }
    }

    if (req.body.password !== undefined) {
      const passwordHash = await bcrypt.hash(req.body.password, 12);
      values.push(passwordHash);
      updates.push(`password_hash = $${values.length}`);
    }

    if (!updates.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "No valid fields provided."
      });
    }

    if (
      userId === currentUserId &&
      changes.is_active === false
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account."
      });
    }

    if (changes.role_id) {
      const roleResult = await client.query(
        "SELECT role_id FROM roles WHERE role_id = $1",
        [changes.role_id]
      );

      if (!roleResult.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Selected role does not exist."
        });
      }
    }

    // Clear lockout counters when the account is reactivated.
    if (changes.is_active === true) {
      updates.push("failed_login_attempts = 0");
      updates.push("lockout_until = NULL");
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");

    values.push(userId);

    const updateResult = await client.query(
      `UPDATE users
       SET ${updates.join(", ")}
       WHERE user_id = $${values.length}
       RETURNING
         user_id, full_name, email, phone, role_id,
         is_active, failed_login_attempts, lockout_until,
         created_at, updated_at`,
      values
    );

    const updated = updateResult.rows[0];

    const roleResult = await client.query(
      "SELECT role_name FROM roles WHERE role_id = $1",
      [updated.role_id]
    );

    const safeUpdatedUser = {
      ...updated,
      role_name: roleResult.rows[0].role_name
    };

    await writeUserAudit(
      client,
      currentUserId,
      "UPDATE",
      userId,
      safeUser(existing),
      safeUpdatedUser
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "User updated successfully.",
      data: safeUpdatedUser
    });

  } catch (error) {
    if (client) await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists."
      });
    }

    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to update user."
    });

  } finally {
    if (client) client.release();
  }
};


module.exports = {
  getUsers,
  getRoles,
  getUserById,
  createUser,
  updateUser
};
