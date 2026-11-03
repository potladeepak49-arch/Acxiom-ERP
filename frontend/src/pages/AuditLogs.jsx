
import { useEffect, useState } from "react";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, ShieldCheck, Clock, User
} from "lucide-react";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "../styles/AuditLogs.css";

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [module, setModule] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1, limit: 10, total: 0, totalPages: 0
  });
  const [expanded, setExpanded] = useState(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/audit-logs", {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          action: action || undefined,
          entity_name: module || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined
        }
      });

      setLogs(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, action, module, fromDate, toDate]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return "No previous value";
    return JSON.stringify(value, null, 2);
  };

  const getActionClass = (value) => {
    const normalized = value?.toUpperCase();
    if (normalized === "CREATE") return "audit-create";
    if (normalized === "UPDATE") return "audit-update";
    if (normalized === "DELETE") return "audit-delete";
    if (normalized.includes("LOGIN")) return "audit-login";
    return "audit-default";
  };

  return (
    <div className="crm-layout">
      <Sidebar />
      <main className="crm-main">
        <Header />

        <div className="audit-page">
          <div className="audit-heading">
            <div>
              <span className="audit-eyebrow">SECURITY & ACTIVITY</span>
              <h1>Audit Logs</h1>
              <p>Track user actions and changes across AcxiomCRM.</p>
            </div>
            <button className="audit-refresh" onClick={loadLogs}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          <div className="audit-summary">
            <div className="audit-summary-icon">
              <ShieldCheck size={23} />
            </div>
            <div>
              <span>Total audit records</span>
              <strong>{pagination.total || 0}</strong>
            </div>
          </div>

          <form className="audit-filters" onSubmit={handleSearch}>
            <div className="audit-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, action, module or record ID..."
              />
            </div>

            <select value={action} onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}>
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN_SUCCESS">Login Success</option>
              <option value="LOGIN_FAILED">Login Failed</option>
              <option value="LOGOUT">Logout</option>
            </select>

            <select value={module} onChange={(e) => {
              setModule(e.target.value);
              setPage(1);
            }}>
              <option value="">All Modules</option>
              <option value="Customer">Customer</option>
              <option value="Lead">Lead</option>
              <option value="FollowUp">Follow-Up</option>
              <option value="Opportunity">Opportunity</option>
              <option value="User">User</option>
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              aria-label="From date"
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              aria-label="To date"
            />
          </form>

          {error && <div className="audit-error">{error}</div>}

          <div className="audit-table-card">
            <div className="audit-table-title">
              <div>
                <h2>Activity History</h2>
                <span>{pagination.total || 0} records found</span>
              </div>
            </div>

            {loading ? (
              <div className="audit-empty">Loading audit records...</div>
            ) : logs.length === 0 ? (
              <div className="audit-empty">No audit records found.</div>
            ) : (
              <div className="audit-table-scroll">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>USER</th>
                      <th>ACTION</th>
                      <th>MODULE</th>
                      <th>RECORD ID</th>
                      <th>DATE & TIME</th>
                      <th>DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <>
                        <tr key={log.audit_log_id}>
                          <td>
                            <div className="audit-user">
                              <span className="audit-user-icon">
                                <User size={16} />
                              </span>
                              <div>
                                <strong>{log.user_name || "System"}</strong>
                                <small>{log.user_email || "—"}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`audit-action ${getActionClass(log.action)}`}>
                              {log.action}
                            </span>
                          </td>
                          <td>{log.entity_name}</td>
                          <td className="audit-record-id">
                            {log.record_id || "—"}
                          </td>
                          <td>
                            <div className="audit-date">
                              <Clock size={14} />
                              {formatDate(log.created_at)}
                            </div>
                          </td>
                          <td>
                            <button
                              className="audit-details-btn"
                              onClick={() => setExpanded(
                                expanded === log.audit_log_id ? null : log.audit_log_id
                              )}
                            >
                              Details
                              {expanded === log.audit_log_id
                                ? <ChevronUp size={15} />
                                : <ChevronDown size={15} />}
                            </button>
                          </td>
                        </tr>

                        {expanded === log.audit_log_id && (
                          <tr key={`${log.audit_log_id}-details`}>
                            <td colSpan="6">
                              <div className="audit-change-details">
                                <div>
                                  <h4>Previous Values</h4>
                                  <pre>{formatValue(log.old_value)}</pre>
                                </div>
                                <div>
                                  <h4>New Values</h4>
                                  <pre>{formatValue(log.new_value)}</pre>
                                </div>
                                <div className="audit-ip">
                                  IP Address: {log.ip_address || "Not recorded"}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="audit-pagination">
              <span>
                Page {pagination.page || 1} of {pagination.totalPages || 1}
              </span>
              <div>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={17} /> Previous
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AuditLogs;
