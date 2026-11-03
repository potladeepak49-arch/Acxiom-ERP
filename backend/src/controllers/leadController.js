
const pool = require("../config/db");

const LEAD_CODE_SQL = `
    'LEAD-' || UPPER(
        SUBSTRING(REPLACE(gen_random_uuid()::text, '-', '') FROM 1 FOR 12)
    )
`;

async function writeLeadAudit(
    client,
    userId,
    action,
    leadId,
    oldValue,
    newValue,
    ipAddress
) {
    await client.query(
        `INSERT INTO audit_logs
        (user_id, action, entity_name, record_id, old_value, new_value, ip_address)
        VALUES ($1, $2, 'Lead', $3, $4::jsonb, $5::jsonb, $6)`,
        [
            userId,
            action,
            leadId,
            oldValue ? JSON.stringify(oldValue) : null,
            newValue ? JSON.stringify(newValue) : null,
            ipAddress || null
        ]
    );
}

// GET /api/leads
async function getLeads(req, res) {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(
            Math.max(parseInt(req.query.limit, 10) || 10, 1),
            100
        );
        const offset = (page - 1) * limit;

        const conditions = [];
        const values = [];

        if (req.query.search?.trim()) {
            values.push(`%${req.query.search.trim()}%`);
            const index = values.length;

            conditions.push(`
                (
                    l.lead_name ILIKE $${index}
                    OR l.email ILIKE $${index}
                    OR l.phone ILIKE $${index}
                    OR l.company_name ILIKE $${index}
                    OR l.lead_code ILIKE $${index}
                )
            `);
        }

        if (req.query.status) {
            values.push(req.query.status);
            conditions.push(`l.status = $${values.length}`);
        }

        if (req.query.priority) {
            values.push(req.query.priority);
            conditions.push(`l.priority = $${values.length}`);
        }

        if (req.user.role_name === "SalesExecutive") {
            values.push(req.user.user_id);
            conditions.push(`l.assigned_to = $${values.length}`);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS total
             FROM leads l
             ${whereClause}`,
            values
        );

        const dataValues = [...values, limit, offset];
        const limitIndex = dataValues.length - 1;
        const offsetIndex = dataValues.length;

        const result = await pool.query(
            `SELECT
                l.*,
                u.full_name AS assigned_to_name,
                creator.full_name AS created_by_name
             FROM leads l
             LEFT JOIN users u ON l.assigned_to = u.user_id
             LEFT JOIN users creator ON l.created_by = creator.user_id
             ${whereClause}
             ORDER BY l.created_at DESC
             LIMIT $${limitIndex}
             OFFSET $${offsetIndex}`,
            dataValues
        );

        const total = countResult.rows[0].total;

        return res.status(200).json({
            success: true,
            data: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Get leads error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve leads."
        });
    }
}

// GET /api/leads/:id
async function getLeadById(req, res) {
    try {
        const result = await pool.query(
            `SELECT
                l.*,
                u.full_name AS assigned_to_name,
                creator.full_name AS created_by_name
             FROM leads l
             LEFT JOIN users u ON l.assigned_to = u.user_id
             LEFT JOIN users creator ON l.created_by = creator.user_id
             WHERE l.lead_id = $1
               AND ($2::boolean = TRUE OR l.assigned_to = $3)`,
            [
                req.params.id,
                req.user.role_name !== "SalesExecutive",
                req.user.user_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Lead not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Get lead error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve lead."
        });
    }
}

// POST /api/leads
async function createLead(req, res) {
    const client = await pool.connect();

    try {
        const {
            lead_name,
            email,
            phone,
            company_name,
            source,
            status,
            priority,
            expected_value,
            assigned_to
        } = req.body;

        // Sales Executives can only assign leads to themselves.
        const assignedUser =
            req.user.role_name === "SalesExecutive"
                ? req.user.user_id
                : assigned_to || null;

        await client.query("BEGIN");

        const result = await client.query(
            `INSERT INTO leads (
                lead_code,
                lead_name,
                email,
                phone,
                company_name,
                source,
                status,
                priority,
                expected_value,
                assigned_to,
                created_by
            )
            VALUES (
                ${LEAD_CODE_SQL},
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
            )
            RETURNING *`,
            [
                lead_name,
                email || null,
                phone || null,
                company_name || null,
                source || null,
                status || "New",
                priority || "Medium",
                expected_value ?? 0,
                assignedUser,
                req.user.user_id
            ]
        );

        const lead = result.rows[0];

        await writeLeadAudit(
            client,
            req.user.user_id,
            "CREATE",
            lead.lead_id,
            null,
            lead,
            req.ip
        );

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            message: "Lead created successfully.",
            data: lead
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Create lead error:", error);

        if (error.code === "23503") {
            return res.status(400).json({
                success: false,
                message: "The assigned user does not exist."
            });
        }

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Lead code already exists. Please try again."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create lead."
        });
    } finally {
        client.release();
    }
}

// PUT /api/leads/:id
async function updateLead(req, res) {
    const client = await pool.connect();

    try {
        const allowedFields = [
            "lead_name",
            "email",
            "phone",
            "company_name",
            "source",
            "status",
            "priority",
            "expected_value",
            "assigned_to"
        ];

        const updates = Object.entries(req.body).filter(
            ([key]) => allowedFields.includes(key)
        );

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update."
            });
        }

        if (
            req.user.role_name === "SalesExecutive" &&
            updates.some(([key]) => key === "assigned_to")
        ) {
            return res.status(403).json({
                success: false,
                message: "You cannot reassign leads."
            });
        }

        await client.query("BEGIN");

        const existingResult = await client.query(
            `SELECT *
             FROM leads
             WHERE lead_id = $1
               AND ($2::boolean = TRUE OR assigned_to = $3)
             FOR UPDATE`,
            [
                req.params.id,
                req.user.role_name !== "SalesExecutive",
                req.user.user_id
            ]
        );

        if (existingResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Lead not found."
            });
        }

        const oldLead = existingResult.rows[0];

        if (
            oldLead.status === "Converted" &&
            updates.some(([key]) => key !== "status")
        ) {
            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "A converted lead cannot be edited."
            });
        }

        const values = [];
        const setClauses = [];

        for (const [key, value] of updates) {
            values.push(
                key === "email" || key === "phone" ||
                key === "company_name" || key === "source"
                    ? value || null
                    : value
            );

            setClauses.push(`${key} = $${values.length}`);
        }

        values.push(req.params.id);

        const updateResult = await client.query(
            `UPDATE leads
             SET ${setClauses.join(", ")},
                 updated_at = CURRENT_TIMESTAMP
             WHERE lead_id = $${values.length}
             RETURNING *`,
            values
        );

        const updatedLead = updateResult.rows[0];

        await writeLeadAudit(
            client,
            req.user.user_id,
            "UPDATE",
            req.params.id,
            oldLead,
            updatedLead,
            req.ip
        );

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: "Lead updated successfully.",
            data: updatedLead
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Update lead error:", error);

        if (error.code === "23503") {
            return res.status(400).json({
                success: false,
                message: "The assigned user does not exist."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update lead."
        });
    } finally {
        client.release();
    }
}

module.exports = {
    getLeads,
    getLeadById,
    createLead,
    updateLead
};
