const express = require("express");

const router = express.Router();

const {
  getFollowups,
  getFollowupById,
  createFollowup,
  updateFollowup,
} = require("../controllers/followupController");

const { authenticateUser } = require("../middleware/authMiddleware");

const {
  validateFollowup,
  validateFollowupUpdate,
} = require("../validators/followupValidator");

router.use(authenticateUser);

router.get("/", getFollowups);

router.get("/:id", getFollowupById);

router.post("/", validateFollowup, createFollowup);

router.put("/:id", validateFollowupUpdate, updateFollowup);

module.exports = router;