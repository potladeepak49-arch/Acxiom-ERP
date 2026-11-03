import {
    Users,
    UserRoundSearch,
    Target,
    IndianRupee
} from "lucide-react";

import "./StatCard.css";

const icons = {
    customers: Users,
    leads: UserRoundSearch,
    opportunities: Target,
    revenue: IndianRupee
};

function StatCard({ title, value, subtitle, type }) {
    const Icon = icons[type];

    return (
        <div className="stat-card">
            <div className="stat-card-top">
                <span>{title}</span>

                <div className={`stat-icon ${type}`}>
                    <Icon size={21} />
                </div>
            </div>

            <h3>{value}</h3>

            <p>{subtitle}</p>
        </div>
    );
}

export default StatCard;
