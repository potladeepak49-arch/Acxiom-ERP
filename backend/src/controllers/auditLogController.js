
const pool = require("../config/db");

const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );
    const offset = (page - 1) * limit;

    const {
      user_id,
      entity_name,
      action,
      from_date,
      to_date,
      search,
    } = req.query;

    const conditions = [];
    const values = [];

    const addCondition = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };

    if (user_id) {
      addCondition("a.user_id = ?::uuid", user_id);
    }

    if (entity_name) {
      addCondition("LOWER(a.entity_name) = LOWER(?)", entity_name);
    }

    if (action) {
      addCondition("LOWER(a.action) = LOWER(?)", action);
    }

    if (from_date) {
      addCondition("a.created_at >= ?::date", from_date);
    }

    if (to_date) {
      addCondition("a.created_at < (?::date + INTERVAL '1 day')", to_date);
    }

    if (search) {
      values.push(`%${search}%`);
      const parameter = `$${values.length}`;

      conditions.push(`(
        a.entity_name ILIKE ${parameter}
        OR a.action ILIKE ${parameter}
        OR u.full_name ILIKE ${parameter}
        OR u.email ILIKE ${parameter}
        OR a.record_id::text ILIKE ${parameter}
      )`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.user_id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, values);
    const total = Number(countResult.rows[0].total);

    const dataQuery = `
      SELECT
        a.audit_log_id,
        a.user_id,
        u.full_name AS user_name,
        u.email AS user_email,
        a.action,
        a.entity_name,
        a.record_id,
        a.old_value,
        a.new_value,
        a.ip_address,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.user_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const result = await pool.query(dataQuery, [
      ...values,
      limit,
      offset,
    ]);

    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve audit logs.",
    });
  }
};

module.exports = { getAuditLogs };
