
const express = require("express");

const {
    getLeads,
    getLeadById,
    createLead,
    updateLead
} = require("../controllers/leadController");

const { authenticateUser } = require("../middleware/authMiddleware");

const {
    validateLead,
    validateLeadUpdate
} = require("../validators/leadValidator");

const router = express.Router();

// All lead routes require authentication.
router.use(authenticateUser);

router.get("/", getLeads);
router.get("/:id", getLeadById);
router.post("/", validateLead, createLead);
router.put("/:id", validateLeadUpdate, updateLead);

module.exports = router;
