import {
    LayoutDashboard,
    Users,
    UserRoundSearch,
    Target,
    CalendarCheck,
    ClipboardList,
    UserCog,
    FileBarChart,
    ScrollText,
    LogOut,
    Building2
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

const navigation = [
    {
        title: "OVERVIEW",
        items: [
            {
                label: "Dashboard",
                path: "/dashboard",
                icon: LayoutDashboard
            }
        ]
    },
    {
        title: "SALES MANAGEMENT",
        items: [
            {
                label: "Customers",
                path: "/customers",
                icon: Users
            },
            {
                label: "Leads",
                path: "/leads",
                icon: UserRoundSearch
            },
            {
                label: "Opportunities",
                path: "/opportunities",
                icon: Target
            },
            {
                label: "Follow-ups",
                path: "/follow-ups",
                icon: CalendarCheck
            },
            {
                label: "Activities",
                path: "/activities",
                icon: ClipboardList
            }
        ]
    },
    {
        title: "ADMINISTRATION",
        roles: ["Admin", "Manager"],
        items: [
            {
                label: "User Management",
                path: "/users",
                icon: UserCog
            },
            {
                label: "Reports",
                path: "/reports",
                icon: FileBarChart
            },
            {
                label: "Audit Logs",
                path: "/audit-logs",
                icon: ScrollText,
                roles: ["Admin"]
            }
        ]
    }
];

function Sidebar() {
    const { user, logout } = useAuth();

    return (
        <aside className="crm-sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">A</div>

                <div>
                    <h4>AcxiomCRM</h4>
                    <span>Business Workspace</span>
                </div>
            </div>

            <div className="sidebar-navigation">
                {navigation.map((section) => {
                    if (
                        section.roles &&
                        !section.roles.includes(user?.role)
                    ) {
                        return null;
                    }

                    return (
                        <div className="sidebar-section" key={section.title}>
                            <p className="sidebar-section-title">
                                {section.title}
                            </p>

                            {section.items.map((item) => {
                                if (
                                    item.roles &&
                                    !item.roles.includes(user?.role)
                                ) {
                                    return null;
                                }

                                const Icon = item.icon;

                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.path === "/dashboard"}
                                        className={({ isActive }) =>
                                            `sidebar-link ${
                                                isActive ? "active" : ""
                                            }`
                                        }
                                    >
                                        <Icon size={19} strokeWidth={1.8} />
                                        <span>{item.label}</span>
                                    </NavLink>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            <div className="sidebar-bottom">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">
                        {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    <div className="sidebar-user-info">
                        <strong>{user?.fullName}</strong>
                        <span>{user?.role}</span>
                    </div>
                </div>

                <button
                    className="sidebar-logout"
                    onClick={logout}
                >
                    <LogOut size={18} />
                    <span>Sign out</span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;