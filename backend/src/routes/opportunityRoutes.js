
const express = require("express");
const router = express.Router();

const {
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity
} = require("../controllers/opportunityController");

const {
  validateOpportunity,
  validateOpportunityUpdate
} = require("../validators/opportunityValidator");

const {
  authenticateUser
} = require("../middleware/authMiddleware");

router.use(authenticateUser);

router.get("/", getOpportunities);
router.get("/:id", getOpportunityById);
router.post("/", validateOpportunity, createOpportunity);
router.put("/:id", validateOpportunityUpdate, updateOpportunity);

module.exports = router;
