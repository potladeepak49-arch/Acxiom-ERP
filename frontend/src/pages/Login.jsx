import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, ArrowRight } from "lucide-react";
import api from "../services/api";
import "../styles/Login.css";

function Login({ onLogin }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!email.trim() || !password) {
            setError("Please enter your email and password.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post("/auth/login", {
                email: email.trim(),
                password
            });

            onLogin(response.data.user);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to connect to the server. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-brand-panel">
                <div className="brand-content">
                    <div className="brand-logo">A</div>
                    <h1>AcxiomCRM</h1>
                    <p className="brand-tagline">
                        Build stronger customer relationships.
                    </p>

                    <div className="brand-decoration">
                        <div className="decoration-circle circle-one"></div>
                        <div className="decoration-circle circle-two"></div>
                        <div className="decoration-circle circle-three"></div>
                    </div>

                    <p className="brand-footer">
                        Customer Relationship Management Platform
                    </p>
                </div>
            </div>

            <div className="login-form-panel">
                <div className="login-card">
                    <div className="mobile-brand">
                        <div className="brand-logo">A</div>
                        <h2>AcxiomCRM</h2>
                    </div>

                    <span className="welcome-label">WELCOME BACK</span>

                    <h2>Sign in to your account</h2>

                    <p className="login-description">
                        Enter your credentials to access your CRM workspace.
                    </p>

                    {error && (
                        <div className="login-error" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="login-field">
                            <label htmlFor="email">Email address</label>

                            <div className="login-input-wrapper">
                                <Mail size={18} />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    maxLength={150}
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="login-field">
                            <label htmlFor="password">Password</label>

                            <div className="login-input-wrapper">
                                <LockKeyhole size={18} />

                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    maxLength={128}
                                    autoComplete="current-password"
                                    required
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPassword
                                        ? <EyeOff size={18} />
                                        : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign in"}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <p className="login-security">
                        <LockKeyhole size={14} />
                        Secure access to your workspace
                    </p>

                    <p className="login-copyright">
                        © 2026 AcxiomCRM. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;