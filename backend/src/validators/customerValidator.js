const { z } = require("zod");

const optionalEmail = z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(150)
    .or(z.literal(""))
    .nullable()
    .optional();

const optionalPhone = z
    .string()
    .trim()
    .max(20, "Phone number is too long.")
    .regex(
        /^[+]?[\d\s()-]*$/,
        "Enter a valid phone number."
    )
    .or(z.literal(""))
    .nullable()
    .optional();

const customerSchema = z.object({
    customer_name: z
        .string()
        .trim()
        .min(2, "Customer name must contain at least 2 characters.")
        .max(150, "Customer name cannot exceed 150 characters."),

    email: optionalEmail,

    phone: optionalPhone,

    company_name: z
        .string()
        .trim()
        .max(150)
        .nullable()
        .optional(),

    address: z
        .string()
        .trim()
        .max(500)
        .nullable()
        .optional(),

    city: z
        .string()
        .trim()
        .max(100)
        .nullable()
        .optional(),

    state: z
        .string()
        .trim()
        .max(100)
        .nullable()
        .optional(),

    status: z
        .enum(["Active", "Inactive"])
        .default("Active")
});

const updateCustomerSchema = customerSchema.partial();

function validateCustomer(req, res, next) {
    const result = customerSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Customer validation failed.",
            errors: result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message
            }))
        });
    }

    req.body = result.data;
    next();
}

function validateCustomerUpdate(req, res, next) {
    const result = updateCustomerSchema.safeParse(req.body);

    if (!result.success || Object.keys(result.data || {}).length === 0) {
        return res.status(400).json({
            success: false,
            message: "Please provide valid customer fields to update.",
            errors: result.error?.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message
            })) || []
        });
    }

    req.body = result.data;
    next();
}

module.exports = {
    validateCustomer,
    validateCustomerUpdate
};