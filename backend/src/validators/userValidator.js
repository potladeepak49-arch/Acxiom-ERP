
const { z } = require("zod");

const createUserSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  password: z.string().min(8).max(100),
  role_id: z.string().uuid(),
  phone: z.string().trim().max(15).nullable().optional(),
  is_active: z.boolean().optional().default(true)
});

const updateUserSchema = z.object({
  full_name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(150).optional(),
  password: z.string().min(8).max(100).optional(),
  role_id: z.string().uuid().optional(),
  phone: z.string().trim().max(15).nullable().optional(),
  is_active: z.boolean().optional()
}).refine(
  data => Object.keys(data).length > 0,
  { message: "At least one field must be provided." }
);

const validateCreateUser = (req, res, next) => {
  const result = createUserSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "User validation failed.",
      errors: result.error.issues
    });
  }

  req.body = result.data;
  next();
};

const validateUpdateUser = (req, res, next) => {
  const result = updateUserSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "User update validation failed.",
      errors: result.error.issues
    });
  }

  req.body = result.data;
  next();
};

module.exports = {
  validateCreateUser,
  validateUpdateUser
};
