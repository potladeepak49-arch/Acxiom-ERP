require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const leadRoutes = require("./routes/leadRoutes");
const followupRoutes = require("./routes/followupRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const opportunityRoutes = require("./routes/opportunityRoutes");
const activityRoutes = require("./routes/activityRoutes");
const userRoutes = require("./routes/userRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

// Security headers
app.use(helmet());

// Allow requests from the React frontend
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

// Parse incoming requests
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Parse cookies
app.use(cookieParser());
// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/followups", followupRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reports", reportRoutes);

// Rate limiting
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false
}));

// Root endpoint
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "AcxiomCRM API is running."
    });
});

// Database health check
app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                current_database() AS database_name,
                NOW() AS server_time
        `);

        res.status(200).json({
            success: true,
            message: "API and database are healthy.",
            database: result.rows[0].database_name,
            serverTime: result.rows[0].server_time
        });
    } catch (error) {
        console.error("Health check failed:", error.message);

        res.status(503).json({
            success: false,
            message: "Database connection failed."
        });
    }
});

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found."
    });
});

// Start server only after checking the database
async function startServer() {
    try {
        await pool.query("SELECT 1");

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`AcxiomCRM API running at http://localhost:${PORT}`);
            console.log("PostgreSQL connection verified.");
        });
    } catch (error) {
        console.error("Unable to start server:", error.message);
        process.exit(1);
    }
}

startServer();