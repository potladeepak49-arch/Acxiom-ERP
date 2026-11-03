const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
};

// Record important authentication events
async function createAuditLog(userId, action, ipAddress) {
    try {
        await pool.query(
            `INSERT INTO audit_logs
                (user_id, action, entity_name, ip_address)
             VALUES ($1, $2, $3, $4)`,
            [userId || null, action, "Authentication", ipAddress || null]
        );
    } catch (error) {
        console.error("Audit log error:", error.message);
    }
}

// LOGIN
async function login(req, res) {
    try {
        const { email, password } = req.body;

        const result = await pool.query(
            `SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.password_hash,
                u.role_id,
                u.is_active,
                u.failed_login_attempts,
                u.lockout_until,
                r.role_name
             FROM users u
             JOIN roles r ON u.role_id = r.role_id
             WHERE LOWER(u.email) = LOWER($1)`,
            [email]
        );

        if (result.rows.length === 0) {
            await createAuditLog(null, "LOGIN_FAILED", req.ip);

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = result.rows[0];

        if (!user.is_active) {
            await createAuditLog(user.user_id, "LOGIN_BLOCKED", req.ip);

            return res.status(403).json({
                success: false,
                message: "This account is inactive. Contact your administrator."
            });
        }

        // Check whether the account is currently locked
        if (
            user.lockout_until &&
            new Date(user.lockout_until) > new Date()
        ) {
            return res.status(423).json({
                success: false,
                message: "Account temporarily locked. Please try again later."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            // Increment failed attempts and lock after five failures
            const updateResult = await pool.query(
                `UPDATE users
                 SET
                    failed_login_attempts =
                        CASE
                            WHEN lockout_until IS NOT NULL
                                 AND lockout_until <= NOW()
                            THEN 1
                            ELSE failed_login_attempts + 1
                        END,
                    lockout_until =
                        CASE
                            WHEN (
                                CASE
                                    WHEN lockout_until IS NOT NULL
                                         AND lockout_until <= NOW()
                                    THEN 1
                                    ELSE failed_login_attempts + 1
                                END
                            ) >= $2
                            THEN NOW() + ($3 * INTERVAL '1 minute')
                            ELSE NULL
                        END,
                    updated_at = NOW()
                 WHERE user_id = $1
                 RETURNING failed_login_attempts, lockout_until`,
                [
                    user.user_id,
                    MAX_LOGIN_ATTEMPTS,
                    LOCKOUT_MINUTES
                ]
            );

            const updatedUser = updateResult.rows[0];

            await createAuditLog(
                user.user_id,
                "LOGIN_FAILED",
                req.ip
            );

            if (
                updatedUser.failed_login_attempts >= MAX_LOGIN_ATTEMPTS
            ) {
                return res.status(423).json({
                    success: false,
                    message: "Too many failed attempts. Account locked for 15 minutes."
                });
            }

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Successful login: reset failed attempts
        await pool.query(
            `UPDATE users
             SET
                failed_login_attempts = 0,
                lockout_until = NULL,
                updated_at = NOW()
             WHERE user_id = $1`,
            [user.user_id]
        );

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user.user_id,
                role: user.role_name
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "1d"
            }
        );

        // Store JWT in an HTTP-only cookie
        res.cookie("token", token, {
            ...cookieOptions,
            maxAge: 24 * 60 * 60 * 1000
        });

        await createAuditLog(
            user.user_id,
            "LOGIN_SUCCESS",
            req.ip
        );

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            user: {
                userId: user.user_id,
                fullName: user.full_name,
                email: user.email,
                role: user.role_name
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "An error occurred during login."
        });
    }
}

// LOGOUT
async function logout(req, res) {
    try {
        if (req.user) {
            await createAuditLog(
                req.user.user_id,
                "LOGOUT",
                req.ip
            );
        }

        res.clearCookie("token", cookieOptions);

        return res.status(200).json({
            success: true,
            message: "Logout successful."
        });

    } catch (error) {
        console.error("Logout error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Logout failed."
        });
    }
}

// GET CURRENT USER
async function getProfile(req, res) {
    return res.status(200).json({
        success: true,
        user: {
            userId: req.user.user_id,
            fullName: req.user.full_name,
            email: req.user.email,
            role: req.user.role_name
        }
    });
}

module.exports = {
    login,
    logout,
    getProfile
};