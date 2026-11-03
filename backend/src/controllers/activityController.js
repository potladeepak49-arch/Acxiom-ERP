
const pool = require("../config/db");

// Record activity changes in the audit log
const writeActivityAudit = async (
  client,
  userId,
  action,
  activityId,
  oldValue,
  newValue
) => {
  await client.query(
    `INSERT INTO audit_logs (
      user_id,
      action,
      entity_name,
      record_id,
      old_value,
      new_value
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      userId,
      action,
      "activities",
      activityId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null
    ]
  );
};


// GET ALL ACTIVITIES
const getActivities = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      activity_type
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(parseInt(limit, 10) || 10, 1),
      100
    );

    const offset = (pageNumber - 1) * pageSize;

    const conditions = [];
    const values = [];

    const addCondition = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };

    if (req.user.role_name === "SalesExecutive") {
      addCondition("a.assigned_to = ?", req.user.user_id);
    }

    if (status) {
      addCondition("a.status = ?", status);
    }

    if (activity_type) {
      addCondition("a.activity_type = ?", activity_type);
    }

    if (search) {
      values.push(`%${search}%`);
      const parameter = `$${values.length}`;

      conditions.push(`
        (
          a.subject ILIKE ${parameter}
          OR a.description ILIKE ${parameter}
          OR c.customer_name ILIKE ${parameter}
          OR l.lead_name ILIKE ${parameter}
        )
      `);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM activities a
       LEFT JOIN customers c
         ON c.customer_id = a.customer_id
       LEFT JOIN leads l
         ON l.lead_id = a.lead_id
       ${whereClause}`,
      values
    );

    const dataResult = await pool.query(
      `SELECT
          a.*,
          c.customer_name,
          l.lead_name,
          u.full_name AS assigned_user_name
       FROM activities a
       LEFT JOIN customers c
         ON c.customer_id = a.customer_id
       LEFT JOIN leads l
         ON l.lead_id = a.lead_id
       LEFT JOIN users u
         ON u.user_id = a.assigned_to
       ${whereClause}
       ORDER BY a.activity_date DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, pageSize, offset]
    );

    const total = countResult.rows[0].total;

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error("Get activities error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve activities."
    });
  }
};


// GET ACTIVITY BY ID
const getActivityById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          a.*,
          c.customer_name,
          l.lead_name,
          u.full_name AS assigned_user_name
       FROM activities a
       LEFT JOIN customers c
         ON c.customer_id = a.customer_id
       LEFT JOIN leads l
         ON l.lead_id = a.lead_id
       LEFT JOIN users u
         ON u.user_id = a.assigned_to
       WHERE a.activity_id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Activity not found."
      });
    }

    const activity = result.rows[0];

    if (
      req.user.role_name === "SalesExecutive" &&
      activity.assigned_to !== req.user.user_id
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this activity."
      });
    }

    res.json({
      success: true,
      data: activity
    });

  } catch (error) {
    console.error("Get activity error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve activity."
    });
  }
};


// CREATE ACTIVITY
const createActivity = async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const {
      activity_type,
      subject,
      description,
      activity_date,
      customer_id,
      lead_id,
      assigned_to,
      status
    } = req.body;

    const userId = req.user.user_id;

    const activityOwner =
      req.user.role_name === "SalesExecutive"
        ? userId
        : assigned_to || userId;

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO activities (
          activity_type,
          subject,
          description,
          activity_date,
          customer_id,
          lead_id,
          assigned_to,
          status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        activity_type,
        subject,
        description || null,
        activity_date,
        customer_id || null,
        lead_id || null,
        activityOwner,
        status || "Planned"
      ]
    );

    const activity = result.rows[0];

    await writeActivityAudit(
      client,
      userId,
      "CREATE",
      activity.activity_id,
      null,
      activity
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Activity created successfully.",
      data: activity
    });

  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error("Create activity error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create activity."
    });

  } finally {
    if (client) client.release();
  }
};


// UPDATE ACTIVITY
const updateActivity = async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const activityId = req.params.id;
    const userId = req.user.user_id;

    console.log("Activity update requested:", activityId);
    console.log("Activity update payload:", req.body);

    await client.query("BEGIN");

    // Get existing activity and lock the row
    const existingResult = await client.query(
      `SELECT *
       FROM activities
       WHERE activity_id = $1
       FOR UPDATE`,
      [activityId]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Activity not found."
      });
    }

    const existing = existingResult.rows[0];

    // Sales executives can only update their own activities
    if (
      req.user.role_name === "SalesExecutive" &&
      existing.assigned_to !== userId
    ) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "You cannot update this activity."
      });
    }

    // Only these fields can be updated
    const allowedFields = [
      "activity_type",
      "subject",
      "description",
      "activity_date",
      "status"
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        values.push(
          field === "description" && req.body[field] === ""
            ? null
            : req.body[field]
        );

        updates.push(`${field} = $${values.length}`);
      }
    }

    // Allow Admin and Manager to reassign activities
    if (
      ["Admin", "Manager"].includes(req.user.role_name) &&
      req.body.assigned_to !== undefined
    ) {
      values.push(req.body.assigned_to);
      updates.push(`assigned_to = $${values.length}`);
    }

    if (updates.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update."
      });
    }

    values.push(activityId);

    // Execute update
    const updateQuery = `
      UPDATE activities
      SET ${updates.join(", ")}
      WHERE activity_id = $${values.length}
      RETURNING *
    `;

    console.log("Executing activity update:", updateQuery);
    console.log("Activity update values:", values);

    const updateResult = await client.query(
      updateQuery,
      values
    );

    const updated = updateResult.rows[0];

    // Record old and new values in audit log
    await writeActivityAudit(
      client,
      userId,
      "UPDATE",
      activityId,
      existing,
      updated
    );

    await client.query("COMMIT");

    console.log("Activity updated successfully:", updated);

    res.json({
      success: true,
      message: "Activity updated successfully.",
      data: updated
    });

  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error("Update activity error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update activity.",
      error: process.env.NODE_ENV === "development"
        ? error.message
        : undefined
    });

  } finally {
    if (client) client.release();
  }
};


module.exports = {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity
};
