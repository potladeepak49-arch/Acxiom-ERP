import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import StatCard from "../components/StatCard";
import SalesChart from "../components/SalesChart";

import "./Dashboard.css";

function Dashboard() {
    const stats = [
        {
            title: "Total Customers",
            value: "1,248",
            subtitle: "Sample dashboard data",
            type: "customers"
        },
        {
            title: "Active Leads",
            value: "356",
            subtitle: "Sample dashboard data",
            type: "leads"
        },
        {
            title: "Open Opportunities",
            value: "84",
            subtitle: "Sample dashboard data",
            type: "opportunities"
        },
        {
            title: "Expected Revenue",
            value: "₹12.8L",
            subtitle: "Sample dashboard data",
            type: "revenue"
        }
    ];

    const activities = [
        {
            title: "Customer record created",
            description: "A new customer was added to the CRM.",
            time: "Recent"
        },
        {
            title: "Lead management",
            description: "A lead was updated in the sales pipeline.",
            time: "Recent"
        },
        {
            title: "Follow-up scheduled",
            description: "A customer follow-up was scheduled.",
            time: "Upcoming"
        }
    ];

    return (
        <div className="crm-layout">
            <Sidebar />

            <main className="crm-main">
                <Header />

                <div className="dashboard-content">
                    <div className="dashboard-welcome">
                        <div>
                            <h3>Overview</h3>
                            <p>
                                Monitor your customer relationships
                                and sales performance.
                            </p>
                        </div>

                        <span className="dashboard-date">
                            AcxiomCRM Workspace
                        </span>
                    </div>

                    <div className="stats-grid">
                        {stats.map((stat) => (
                            <StatCard
                                key={stat.type}
                                {...stat}
                            />
                        ))}
                    </div>

                    <SalesChart />

                    <section className="activity-panel">
                        <div className="activity-heading">
                            <div>
                                <h5>Recent Activities</h5>
                                <p>Latest CRM workspace updates</p>
                            </div>
                        </div>

                        <div className="activity-list">
                            {activities.map((activity, index) => (
                                <div
                                    className="activity-item"
                                    key={index}
                                >
                                    <div className="activity-indicator" />

                                    <div className="activity-details">
                                        <strong>{activity.title}</strong>
                                        <p>{activity.description}</p>
                                    </div>

                                    <span className="activity-time">
                                        {activity.time}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <footer className="dashboard-footer">
                        © 2026 AcxiomCRM. All rights reserved.
                    </footer>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;