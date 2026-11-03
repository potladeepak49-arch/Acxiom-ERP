const express = require("express");

const {
    login,
    logout,
    getProfile
} = require("../controllers/authController");

const {
    validateLogin
} = require("../validators/authValidator");

const {
    authenticateUser
} = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/auth/login
router.post("/login", validateLogin, login);

// POST /api/auth/logout
router.post("/logout", authenticateUser, logout);

// GET /api/auth/me
router.get("/me", authenticateUser, getProfile);
// Admin-only test endpoint
router.get(
    "/admin-check",
    authenticateUser,
    require("../middleware/authMiddleware").authorizeRoles("Admin"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Admin authorization successful.",
            role: req.user.role_name
        });
    }
);

module.exports = router;