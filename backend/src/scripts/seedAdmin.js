require("dotenv").config();

const bcrypt = require("bcryptjs");
const readline = require("readline");
const pool = require("../config/db");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function seedAdmin() {
    try {
        console.log("\n===== AcxiomCRM Admin Setup =====\n");

        const fullName = (await ask("Admin full name: ")).trim();
        const email = (await ask("Admin email: ")).trim().toLowerCase();
        const password = await ask("Admin password (minimum 12 characters): ");

        if (!fullName || fullName.length > 100) {
            throw new Error("Name is required and must not exceed 100 characters.");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("Please enter a valid email address.");
        }

        if (password.length < 12 || password.length > 128) {
            throw new Error("Password must contain between 12 and 128 characters.");
        }

        const existingUser = await pool.query(
            "SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)",
            [email]
        );

        if (existingUser.rows.length > 0) {
            throw new Error("An account with this email already exists.");
        }

        const roleResult = await pool.query(
            "SELECT role_id FROM roles WHERE role_name = $1",
            ["Admin"]
        );

        if (roleResult.rows.length === 0) {
            throw new Error("Admin role not found. Check the roles table.");
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users
                (full_name, email, password_hash, role_id, is_active)
             VALUES ($1, $2, $3, $4, TRUE)
             RETURNING user_id, full_name, email`,
            [
                fullName,
                email,
                passwordHash,
                roleResult.rows[0].role_id
            ]
        );

        console.log("\nAdmin account created successfully!");
        console.log("User ID:", result.rows[0].user_id);
        console.log("Name:", result.rows[0].full_name);
        console.log("Email:", result.rows[0].email);

    } catch (error) {
        console.error("\nAdmin setup failed:", error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
        await pool.end();
    }
}

seedAdmin();