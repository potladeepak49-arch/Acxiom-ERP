import { useEffect, useState } from "react";
import {
  Bar,
  Doughnut
} from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

import {
  Users,
  UserPlus,
  Target,
  CalendarCheck,
  Activity,
  TrendingUp,
  RefreshCw
} from "lucide-react";

import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "../styles/Reports.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

function Reports() {
  const [overview, setOverview] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [leads, setLeads] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const results = await Promise.all([
        api.get("/reports/overview"),
        api.get("/reports/pipeline"),
        api.get("/reports/leads"),
        api.get("/reports/follow-ups"),
        api.get("/reports/customers"),
        api.get("/reports/audit")
      ]);

      setOverview(results[0].data.data);
      setPipeline(results[1].data.data);
      setLeads(results[2].data.data);
      setFollowups(results[3].data.data);
      setCustomers(results[4].data.data);
      setAudit(results[5].data.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load reports."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(value || 0));

  const stats = overview
    ? [
        {
          title: "Total Customers",
          value: overview.customers.total,
          detail: `${overview.customers.active} active`,
          icon: Users
        },
        {
          title: "Total Leads",
          value: overview.leads.total,
          detail: `${overview.leads.converted} converted`,
          icon: UserPlus
        },
        {
          title: "Open Pipeline",
          value: money(overview.opportunities.pipeline_value),
          detail: `${overview.opportunities.total} opportunities`,
          icon: Target
        },
        {
          title: "Weighted Pipeline",
          value: money(overview.opportunities.weighted_pipeline),
          detail: `${overview.opportunities.won} won`,
          icon: TrendingUp
        },
        {
          title: "Follow-Ups",
          value: overview.followups.total,
          detail: `${overview.followups.completed} completed`,
          icon: CalendarCheck
        },
        {
          title: "Activities",
          value: overview.activities.total,
          detail: `${overview.activities.completed} completed`,
          icon: Activity
        }
      ]
    : [];

  const pipelineChart = {
    labels: pipeline.map(item => item.stage),
    datasets: [
      {
        label: "Opportunity Value",
        data: pipeline.map(item => Number(item.total_amount)),
        backgroundColor: [
          "#6366f1",
          "#0ea5e9",
          "#f59e0b",
          "#16a34a",
          "#ef4444"
        ],
        borderRadius: 6
      }
    ]
  };

  const leadChart = {
    labels: leads.map(item => item.status),
    datasets: [
      {
        label: "Leads",
        data: leads.map(item => Number(item.lead_count)),
        backgroundColor: [
          "#6366f1",
          "#0ea5e9",
          "#f59e0b",
          "#16a34a",
          "#ef4444",
          "#64748b"
        ],
        borderWidth: 0
      }
    ]
  };

  const followupChart = {
    labels: followups.map(item => item.status),
    datasets: [
      {
        label: "Follow-Ups",
        data: followups.map(item => Number(item.followup_count)),
        backgroundColor: [
          "#6366f1",
          "#16a34a",
          "#ef4444",
          "#94a3b8"
        ],
        borderWidth: 0
      }
    ]
  };

  const customerChart = {
    labels: customers.map(item => item.status),
    datasets: [
      {
        label: "Customers",
        data: customers.map(item => Number(item.customer_count)),
        backgroundColor: ["#16a34a", "#94a3b8"],
        borderWidth: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom"
      }
    }
  };

  const downloadAuditCSV = () => {
    const rows = [
      ["User", "Action", "Module", "Record ID", "Date"],
      ...audit.map(item => [
        item.user_name || "Unknown",
        item.action,
        item.entity_name,
        item.record_id || "",
        new Date(item.created_at).toLocaleString()
      ])
    ];

    const csv = rows
      .map(row =>
        row.map(value =>
          `"${String(value ?? "").replace(/"/g, '""')}"`
        ).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "acxiomcrm-audit-report.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="crm-layout">
      <Sidebar />

      <main className="crm-main">
        <Header />

        <div className="reports-page">
          <div className="reports-heading">
            <div>
              <h1>Reports & Analytics</h1>
              <p>
                Monitor CRM performance, sales pipeline and team activity.
              </p>
            </div>

            <button
              className="report-refresh-btn"
              onClick={loadReports}
              disabled={loading}
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="report-error">{error}</div>
          )}

          {loading ? (
            <div className="report-loading">
              Loading reports...
            </div>
          ) : overview ? (
            <>
              <section className="report-stats">
                {stats.map((stat, index) => {
                  const Icon = stat.icon;

                  return (
                    <div className="report-stat-card" key={index}>
                      <div className="report-stat-top">
                        <span>{stat.title}</span>
                        <Icon size={21} />
                      </div>

                      <strong>{stat.value}</strong>
                      <small>{stat.detail}</small>
                    </div>
                  );
                })}
              </section>

              <section className="report-charts">
                <div className="report-chart-card report-wide">
                  <h2>Opportunity Pipeline</h2>
                  <p>Opportunity value grouped by sales stage</p>

                  <div className="report-chart-area">
                    {pipeline.length ? (
                      <Bar
                        data={pipelineChart}
                        options={{
                          ...chartOptions,
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                callback: value =>
                                  `₹${Number(value).toLocaleString("en-IN")}`
                              }
                            }
                          }
                        }}
                      />
                    ) : (
                      <p className="report-empty">No pipeline data available.</p>
                    )}
                  </div>
                </div>

                <div className="report-chart-card">
                  <h2>Lead Distribution</h2>
                  <p>Leads grouped by status</p>

                  <div className="report-chart-area">
                    {leads.length ? (
                      <Doughnut
                        data={leadChart}
                        options={chartOptions}
                      />
                    ) : (
                      <p className="report-empty">No lead data available.</p>
                    )}
                  </div>
                </div>

                <div className="report-chart-card">
                  <h2>Follow-Up Status</h2>
                  <p>Follow-ups grouped by status</p>

                  <div className="report-chart-area">
                    {followups.length ? (
                      <Doughnut
                        data={followupChart}
                        options={chartOptions}
                      />
                    ) : (
                      <p className="report-empty">No follow-up data available.</p>
                    )}
                  </div>
                </div>

                <div className="report-chart-card">
                  <h2>Customer Status</h2>
                  <p>Active and inactive customers</p>

                  <div className="report-chart-area">
                    {customers.length ? (
                      <Doughnut
                        data={customerChart}
                        options={chartOptions}
                      />
                    ) : (
                      <p className="report-empty">No customer data available.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="report-table-card">
                <div className="report-table-heading">
                  <div>
                    <h2>Recent Audit Activity</h2>
                    <p>Latest recorded CRM actions</p>
                  </div>

                  <button
                    className="report-export-btn"
                    onClick={downloadAuditCSV}
                    disabled={!audit.length}
                  >
                    Export CSV
                  </button>
                </div>

                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Action</th>
                        <th>Module</th>
                        <th>Record ID</th>
                        <th>Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {audit.length ? audit.map(item => (
                        <tr key={item.audit_log_id}>
                          <td>{item.user_name || "Unknown"}</td>
                          <td>{item.action}</td>
                          <td>{item.entity_name}</td>
                          <td>
                            {item.record_id
                              ? `${item.record_id.slice(0, 8)}...`
                              : "—"}
                          </td>
                          <td>
                            {new Date(item.created_at).toLocaleString()}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" className="report-empty">
                            No audit activity found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default Reports;