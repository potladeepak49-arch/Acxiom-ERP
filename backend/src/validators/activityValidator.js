const { z } = require("zod");

const activityBaseSchema = z.object({
  activity_type: z.enum([
    "Call",
    "Meeting",
    "Email",
    "Task"
  ]),

  subject: z.string().trim().min(2).max(150),

  description: z.string().trim().max(2000).nullable().optional(),

  activity_date: z.coerce.date(),

  customer_id: z.string().uuid().nullable().optional(),

  lead_id: z.string().uuid().nullable().optional(),

  assigned_to: z.string().uuid().nullable().optional(),

  status: z.enum([
    "Planned",
    "Completed",
    "Cancelled"
  ]).default("Planned")
});

const validateActivity = (req, res, next) => {
  const result = activityBaseSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Activity validation failed.",
      errors: result.error.issues.map(issue => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  const data = result.data;

  if (!data.customer_id && !data.lead_id) {
    return res.status(400).json({
      success: false,
      message: "An activity must be linked to a customer or lead."
    });
  }

  if (data.customer_id && data.lead_id) {
    return res.status(400).json({
      success: false,
      message: "An activity can be linked to only one record."
    });
  }

  req.body = data;
  next();
};
const validateActivityUpdate = (req, res, next) => {
  const updateSchema = activityBaseSchema
    .omit({
      customer_id: true,
      lead_id: true
    })
    .partial();

  const result = updateSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Activity update validation failed.",
      errors: result.error.issues.map(issue => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (Object.keys(result.data).length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one field must be provided."
    });
  }

  req.body = result.data;
  next();
};

module.exports = { validateActivity, validateActivityUpdate };