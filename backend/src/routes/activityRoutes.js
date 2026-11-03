const express = require("express");
const router = express.Router();

const {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity
} = require("../controllers/activityController");

const {
  validateActivity,
  validateActivityUpdate
} = require("../validators/activityValidator");

const {
  authenticateUser
} = require("../middleware/authMiddleware");

router.use(authenticateUser);

router.get("/", getActivities);
router.get("/:id", getActivityById);

router.post("/", validateActivity, createActivity);
router.put("/:id", validateActivityUpdate, updateActivity);

module.exports = router;