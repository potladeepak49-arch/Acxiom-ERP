import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend
} from "chart.js";

import { Bar, Doughnut } from "react-chartjs-2";

import "./SalesChart.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend
);

function SalesChart() {
    const salesData = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
            {
                label: "Sales Revenue",
                data: [12000, 19000, 15000, 25000, 22000, 32000],
                backgroundColor: "#3154a3",
                borderRadius: 6,
                barThickness: 28
            }
        ]
    };

    const salesOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: "#edf0f5"
                },
                ticks: {
                    callback: (value) => `₹${value / 1000}k`
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    };

    const leadData = {
        labels: ["New", "Contacted", "Qualified", "Converted", "Lost"],
        datasets: [
            {
                data: [35, 25, 20, 15, 5],
                backgroundColor: [
                    "#3154a3",
                    "#42a5a0",
                    "#e8aa45",
                    "#7c62bd",
                    "#d66a6a"
                ],
                borderWidth: 0,
                hoverOffset: 6
            }
        ]
    };

    const leadOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    usePointStyle: true,
                    padding: 18,
                    font: {
                        size: 11
                    }
                }
            }
        },
        cutout: "68%"
    };

    return (
        <div className="charts-grid">
            <section className="chart-panel">
                <div className="chart-heading">
                    <div>
                        <h5>Sales Performance</h5>
                        <p>Monthly revenue overview</p>
                    </div>

                    <span className="chart-period">Last 6 months</span>
                </div>

                <div className="sales-chart-container">
                    <Bar data={salesData} options={salesOptions} />
                </div>
            </section>

            <section className="chart-panel">
                <div className="chart-heading">
                    <div>
                        <h5>Lead Conversion</h5>
                        <p>Current lead distribution</p>
                    </div>
                </div>

                <div className="lead-chart-container">
                    <Doughnut data={leadData} options={leadOptions} />
                </div>
            </section>
        </div>
    );
}

export default SalesChart;