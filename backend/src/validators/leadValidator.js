
const { z } = require("zod");

const leadSchema = z.object({
    lead_name: z.string()
        .trim()
        .min(2, "Lead name must contain at least 2 characters.")
        .max(150),

    email: z.union([
        z.string().trim().email("Enter a valid email address.").max(150),
        z.literal("")
    ]).nullable().optional(),

    phone: z.union([
        z.string()
            .trim()
            .min(7, "Phone number must contain at least 7 characters.")
            .max(15)
            .regex(/^\+?[0-9\s()-]+$/, "Enter a valid phone number."),
        z.literal("")
    ]).nullable().optional(),

    company_name: z.string()
        .trim()
        .max(150)
        .nullable()
        .optional(),

    source: z.string()
        .trim()
        .max(50)
        .nullable()
        .optional(),

    status: z.enum([
        "New",
        "Contacted",
        "Qualified",
        "Unqualified",
        "Converted",
        "Lost"
    ]).default("New"),

    priority: z.enum([
        "Low",
        "Medium",
        "High"
    ]).default("Medium"),

    expected_value: z.coerce.number()
        .min(0, "Expected value cannot be negative.")
        .max(999999999999.99),

    assigned_to: z.string()
        .uuid("Invalid assigned user ID.")
        .nullable()
        .optional()
});

function validateLead(req, res, next) {
    const result = leadSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Lead validation failed.",
            errors: result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message
            }))
        });
    }

    req.body = result.data;
    next();
}

function validateLeadUpdate(req, res, next) {
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
            success: false,
            message: "Provide at least one field to update."
        });
    }

    const result = leadSchema.partial().safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Lead validation failed.",
            errors: result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message
            }))
        });
    }

    req.body = result.data;
    next();
}

module.exports = {
    validateLead,
    validateLeadUpdate
};
