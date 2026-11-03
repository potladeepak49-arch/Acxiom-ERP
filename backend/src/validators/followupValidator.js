const { z } = require("zod");

const followupBaseSchema = z.object({
  customer_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  opportunity_id: z.string().uuid().nullable().optional(),

  followup_date: z.coerce.date(),

  followup_type: z.enum([
    "Call",
    "Email",
    "Meeting",
    "Task",
  ]),

  subject: z.string().trim().min(2).max(150),

  remarks: z.string().trim().max(2000).nullable().optional(),

  status: z.enum([
    "Planned",
    "Completed",
    "Missed",
    "Cancelled",
  ]).default("Planned"),

  assigned_to: z.string().uuid().nullable().optional(),
});

const followupSchema = followupBaseSchema
  .refine(
    (data) => {
      const relations = [
        data.customer_id,
        data.lead_id,
        data.opportunity_id,
      ].filter(Boolean);

      return relations.length === 1;
    },
    {
      message:
        "A follow-up must be linked to exactly one customer, lead, or opportunity.",
      path: ["customer_id"],
    }
  )
  .refine(
    (data) => {
      if (data.status === "Planned") {
        return data.followup_date >= new Date();
      }
      return true;
    },
    {
      message: "A planned follow-up date cannot be in the past.",
      path: ["followup_date"],
    }
  );

const followupUpdateSchema = followupBaseSchema
  .omit({
    customer_id: true,
    lead_id: true,
    opportunity_id: true,
  })
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field is required for an update.",
    }
  );

const validateFollowup = (req, res, next) => {
  const result = followupSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req.body = result.data;
  next();
};

const validateFollowupUpdate = (req, res, next) => {
  const result = followupUpdateSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req.body = result.data;
  next();
};

module.exports = {
  validateFollowup,
  validateFollowupUpdate,
};