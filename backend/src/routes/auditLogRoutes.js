
const express = require("express");
const router = express.Router();

const { getAuditLogs } = require("../controllers/auditLogController");
const { authenticateUser, authorizeRoles } = require("../middleware/authMiddleware");

// Only Admin users can view audit history.
router.use(authenticateUser);
router.use(authorizeRoles("Admin"));

router.get("/", getAuditLogs);

module.exports = router;
