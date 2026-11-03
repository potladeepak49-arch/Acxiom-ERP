const { z } = require("zod");

const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Please enter a valid email address.")
        .max(150, "Email must not exceed 150 characters.")
        .transform((value) => value.toLowerCase()),

    password: z
        .string()
        .min(1, "Password is required.")
        .max(128, "Password must not exceed 128 characters.")
});

function validateLogin(req, res, next) {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            success: false,
            message: "Validation failed.",
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
    validateLogin
};