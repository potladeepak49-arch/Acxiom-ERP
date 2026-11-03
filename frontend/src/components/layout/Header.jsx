import { Bell, Search, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Header.css";

function Header() {
    const { user } = useAuth();

    return (
        <header className="crm-header">
            <div className="header-left">
                <button className="mobile-menu-button" aria-label="Open menu">
                    <Menu size={21} />
                </button>

                <div>
                    <h2>Dashboard</h2>
                    <p>Welcome back, {user?.fullName}</p>
                </div>
            </div>

            <div className="header-right">
                <div className="header-search">
                    <Search size={18} />
                    <input
                        type="search"
                        placeholder="Search CRM..."
                        aria-label="Search CRM"
                    />
                </div>

                <button
                    className="header-notification"
                    aria-label="Notifications"
                >
                    <Bell size={19} />
                </button>

                <div className="header-profile">
                    <div className="header-avatar">
                        {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                        <strong>{user?.fullName}</strong>
                        <span>{user?.role}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;