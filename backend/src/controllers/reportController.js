const pool = require("../config/db");

// Dashboard overview report
const getOverviewReport = async (req, res) => {
  try {
    const [
      customers,
      leads,
      opportunities,
      followups,
      activities,
      users
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'Active')::int AS active
        FROM customers
      `),

      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'Converted')::int AS converted,
          COUNT(*) FILTER (WHERE status = 'Lost')::int AS lost
        FROM leads
      `),

      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(amount) FILTER (WHERE status = 'Open'), 0) AS pipeline_value,
          COALESCE(SUM(amount * probability / 100)
            FILTER (WHERE status = 'Open'), 0) AS weighted_pipeline,
          COUNT(*) FILTER (WHERE status = 'Won')::int AS won,
          COUNT(*) FILTER (WHERE status = 'Lost')::int AS lost
        FROM opportunities
      `),

      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'Planned')::int AS planned,
          COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'Missed')::int AS missed
        FROM follow_ups
      `),

      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed
        FROM activities
      `),

      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_active = true)::int AS active
        FROM users
      `)
    ]);

    res.json({
      success: true,
      data: {
        customers: customers.rows[0],
        leads: leads.rows[0],
        opportunities: opportunities.rows[0],
        followups: followups.rows[0],
        activities: activities.rows[0],
        users: users.rows[0]
      }
    });
  } catch (error) {
    console.error("Overview report error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to generate overview report."
    });
  }
};

// Opportunity pipeline grouped by stage
const getPipelineReport = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        stage,
        COUNT(*)::int AS opportunity_count,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(amount * probability / 100), 0) AS weighted_amount
      FROM opportunities
      GROUP BY stage
      ORDER BY
        CASE stage
          WHEN 'Qualification' THEN 1
          WHEN 'Proposal' THEN 2
          WHEN 'Negotiation' THEN 3
          WHEN 'Won' THEN 4
          WHEN 'Lost' THEN 5
          ELSE 6
        END
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Pipeline report error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to generate pipeline report."
    });
  }
};

// Lead report grouped by status
const getLeadReport = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        status,
        COUNT(*)::int AS lead_count,
        COALESCE(SUM(expected_value), 0) AS expected_value
      FROM leads
      GROUP BY status
      ORDER BY lead_count DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Lead report error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to generate lead report."
    });
  }
};

// Follow-up report grouped by status
const getFollowupReport = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        status,
        COUNT(*)::int AS followup_count
      FROM follow_ups
      GROUP BY status
      ORDER BY followup_count DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Follow-up report error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to generate follow-up report."
    });
  }
};

// Customer report grouped by status
const getCustomerReport = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        status,
        COUNT(*)::int AS customer_count
      FROM customers
      GROUP BY status
      ORDER BY customer_count DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Customer report error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to generate customer report."
    });
  }
};

// Recent audit activity report
const getAuditReport = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.audit_log_id,
        a.action,
        a.entity_name,
        a.record_id,
        a.created_at,
        u.full_name AS user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.user_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Audit report error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to generate audit report."
    });
  }
};

module.exports = {
  getOverviewReport,
  getPipelineReport,
  getLeadReport,
  getFollowupReport,
  getCustomerReport,
  getAuditReport
};