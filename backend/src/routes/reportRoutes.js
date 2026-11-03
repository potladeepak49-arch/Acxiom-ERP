const express = require("express");
const router = express.Router();

const {
  getOverviewReport,
  getPipelineReport,
  getLeadReport,
  getFollowupReport,
  getCustomerReport,
  getAuditReport
} = require("../controllers/reportController");

const {
  authenticateUser,
  authorizeRoles
} = require("../middleware/authMiddleware");

// Reports are available to Admin and Manager.
router.use(authenticateUser);
router.use(authorizeRoles("Admin", "Manager"));

router.get("/overview", getOverviewReport);
router.get("/pipeline", getPipelineReport);
router.get("/leads", getLeadReport);
router.get("/follow-ups", getFollowupReport);
router.get("/customers", getCustomerReport);
router.get("/audit", getAuditReport);

module.exports = router;