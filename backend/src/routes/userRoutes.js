
const express = require("express");
const router = express.Router();

const {
  getUsers,
  getRoles,
  getUserById,
  createUser,
  updateUser
} = require("../controllers/userController");

const {
  validateCreateUser,
  validateUpdateUser
} = require("../validators/userValidator");

const {
  authenticateUser,
  authorizeRoles
} = require("../middleware/authMiddleware");

// All user-management routes require Admin access
router.use(authenticateUser);
router.use(authorizeRoles("Admin"));

router.get("/", getUsers);
router.get("/roles", getRoles);
router.get("/:id", getUserById);

router.post("/", validateCreateUser, createUser);
router.put("/:id", validateUpdateUser, updateUser);

module.exports = router;
