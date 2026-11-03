const pool = require("../config/db");

const writeFollowupAudit = async (
  client,
  userId,
  action,
  followupId,
  oldValue = null,
  newValue = null
) => {
  await client.query(
    `INSERT INTO audit_logs
      (user_id, action, entity_name, record_id, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId,
      action,
      "FollowUp",
      followupId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
    ]
  );
};

// GET /api/followups
const getFollowups = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100
    );
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    const addCondition = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };

    if (req.user.role_name === "SalesExecutive") {
      addCondition("f.assigned_to = ?", req.user.user_id);
    }

    if (req.query.status) {
      addCondition("f.status = ?", req.query.status);
    }

    if (req.query.type) {
      addCondition("f.followup_type = ?", req.query.type);
    }

    if (req.query.search) {
      values.push(`%${req.query.search.trim()}%`);
      const index = values.length;
      conditions.push(
        `(f.subject ILIKE $${index} OR f.remarks ILIKE $${index})`
      );
    }

    if (req.query.from) {
      addCondition("f.followup_date >= ?", req.query.from);
    }

    if (req.query.to) {
      addCondition("f.followup_date <= ?", req.query.to);
    }

    if (req.query.view === "upcoming") {
      conditions.push(
        "f.status = 'Planned' AND f.followup_date >= NOW()"
      );
    } else if (req.query.view === "overdue") {
      conditions.push(
        "f.status = 'Planned' AND f.followup_date < NOW()"
      );
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM follow_ups f
       ${whereClause}`,
      values
    );

    const dataValues = [...values, limit, offset];

    const result = await pool.query(
      `SELECT
          f.followup_id,
          f.customer_id,
          f.lead_id,
          f.opportunity_id,
          f.followup_date,
          f.followup_type,
          f.subject,
          f.remarks,
          f.status,
          f.assigned_to,
          f.created_at,
          u.full_name AS assigned_to_name
       FROM follow_ups f
       LEFT JOIN users u ON u.user_id = f.assigned_to
       ${whereClause}
       ORDER BY f.followup_date ASC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      dataValues
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      },
    });
  } catch (error) {
    console.error("Get follow-ups error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve follow-ups.",
    });
  }
};

// GET /api/followups/:id
const getFollowupById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          f.*,
          u.full_name AS assigned_to_name
       FROM follow_ups f
       LEFT JOIN users u ON u.user_id = f.assigned_to
       WHERE f.followup_id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found.",
      });
    }

    const followup = result.rows[0];

    if (
      req.user.role_name === "SalesExecutive" &&
      followup.assigned_to !== req.user.user_id
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this follow-up.",
      });
    }

    return res.status(200).json({
      success: true,
      data: followup,
    });
  } catch (error) {
    console.error("Get follow-up error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve follow-up.",
    });
  }
};

// POST /api/followups
const createFollowup = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      customer_id,
      lead_id,
      opportunity_id,
      followup_date,
      followup_type,
      subject,
      remarks,
      status = "Planned",
      assigned_to,
    } = req.body;

    if (
      status === "Planned" &&
      new Date(followup_date) < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "A planned follow-up date cannot be in the past.",
      });
    }

    const finalAssignedTo =
      req.user.role_name === "SalesExecutive"
        ? req.user.user_id
        : assigned_to || req.user.user_id;

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO follow_ups (
          customer_id,
          lead_id,
          opportunity_id,
          followup_date,
          followup_type,
          subject,
          remarks,
          status,
          assigned_to
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        customer_id || null,
        lead_id || null,
        opportunity_id || null,
        followup_date,
        followup_type,
        subject,
        remarks || null,
        status,
        finalAssignedTo,
      ]
    );

    const followup = result.rows[0];

    await writeFollowupAudit(
      client,
      req.user.user_id,
      "CREATE",
      followup.followup_id,
      null,
      followup
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Follow-up created successfully.",
      data: followup,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create follow-up error:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "One of the linked records or assigned users does not exist.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create follow-up.",
    });
  } finally {
    client.release();
  }
};

// PUT /api/followups/:id
const updateFollowup = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT *
       FROM follow_ups
       WHERE followup_id = $1
       FOR UPDATE`,
      [req.params.id]
    );

    if (!existingResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Follow-up not found.",
      });
    }

    const existing = existingResult.rows[0];

    if (
      req.user.role_name === "SalesExecutive" &&
      existing.assigned_to !== req.user.user_id
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "You cannot update this follow-up.",
      });
    }

    const allowedFields = [
      "followup_date",
      "followup_type",
      "subject",
      "remarks",
      "status",
      "assigned_to",
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        if (field === "assigned_to" &&
            req.user.role_name === "SalesExecutive") {
          continue;
        }

        values.push(req.body[field] ?? null);
        updates.push(`${field} = $${values.length}`);
      }
    }

    if (!updates.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    const newDate = req.body.followup_date
      ? new Date(req.body.followup_date)
      : new Date(existing.followup_date);

    const newStatus = req.body.status || existing.status;

    if (newStatus === "Planned" && newDate < new Date()) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "A planned follow-up date cannot be in the past.",
      });
    }

    values.push(req.params.id);

    const result = await client.query(
      `UPDATE follow_ups
       SET ${updates.join(", ")}
       WHERE followup_id = $${values.length}
       RETURNING *`,
      values
    );

    const updated = result.rows[0];

    await writeFollowupAudit(
      client,
      req.user.user_id,
      "UPDATE",
      updated.followup_id,
      existing,
      updated
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Follow-up updated successfully.",
      data: updated,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update follow-up error:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "The assigned user does not exist.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update follow-up.",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getFollowups,
  getFollowupById,
  createFollowup,
  updateFollowup,
};