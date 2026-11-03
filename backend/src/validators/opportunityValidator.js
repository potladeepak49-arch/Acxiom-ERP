
const { z } = require("zod");

const opportunityBaseSchema = z.object({
  opportunity_name: z.string().trim().min(2).max(150),

  customer_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),

  amount: z.coerce.number().positive().max(999999999999),

  stage: z.enum([
    "Qualification",
    "Proposal",
    "Negotiation",
    "Won",
    "Lost"
  ]).default("Qualification"),

  probability: z.coerce.number().min(0).max(100),

  expected_close_date: z.coerce.date(),

  status: z.enum(["Open", "Won", "Lost"]).default("Open"),

  assigned_to: z.string().uuid().nullable().optional(),

  notes: z.string().trim().max(2000).nullable().optional()
});

const validateOpportunity = (req, res, next) => {
  const result = opportunityBaseSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Opportunity validation failed.",
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
      message: "An opportunity must be linked to a customer or lead."
    });
  }

  if (data.status === "Open" && data.amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Open opportunities must have an amount greater than zero."
    });
  }

  if (
    (data.stage === "Won" && data.status !== "Won") ||
    (data.stage === "Lost" && data.status !== "Lost") ||
    (["Qualification", "Proposal", "Negotiation"].includes(data.stage) &&
      data.status !== "Open")
  ) {
    return res.status(400).json({
      success: false,
      message: "Opportunity stage and status do not match."
    });
  }

  if (
    data.status === "Open" &&
    data.expected_close_date < new Date(new Date().toDateString())
  ) {
    return res.status(400).json({
      success: false,
      message: "Expected close date cannot be in the past for open opportunities."
    });
  }

  req.body = data;
  next();
};
const validateOpportunityUpdate = (req, res, next) => {
  const updateSchema = opportunityBaseSchema
    .omit({
      customer_id: true,
      lead_id: true
    })
    .partial();

  const result = updateSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Opportunity update validation failed.",
      errors: result.error.issues.map(issue => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (Object.keys(result.data).length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one field must be provided for update."
    });
  }

  req.body = result.data;
  next();
};
module.exports = { validateOpportunity,
    validateOpportunityUpdate
 };
