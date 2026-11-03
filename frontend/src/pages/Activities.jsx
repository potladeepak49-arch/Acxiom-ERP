import { useEffect, useState } from "react";
import { Plus, Search, Pencil, CheckCircle, XCircle } from "lucide-react";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "../styles/Activities.css";

const initialForm = {
  activity_type: "Call",
  subject: "",
  description: "",
  activity_date: "",
  customer_id: "",
  lead_id: "",
  status: "Planned"
};

function Activities() {
  const [activities, setActivities] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0
  });

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await api.get("/activities", {
        params: {
          page,
          limit: 10,
          search,
          status: statusFilter,
          activity_type: typeFilter
        }
      });

      setActivities(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load activities.");
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedRecords = async () => {
    const [customerResult, leadResult] = await Promise.allSettled([
      api.get("/customers", { params: { limit: 100 } }),
      api.get("/leads", { params: { limit: 100 } })
    ]);

    if (customerResult.status === "fulfilled") {
      setCustomers(customerResult.value.data.data || []);
    }

    if (leadResult.status === "fulfilled") {
      setLeads(leadResult.value.data.data || []);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    loadRelatedRecords();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadActivities();
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (activity) => {
    setEditingId(activity.activity_id);

    setForm({
      activity_type: activity.activity_type,
      subject: activity.subject,
      description: activity.description || "",
      activity_date: activity.activity_date
        ? new Date(activity.activity_date).toISOString().slice(0, 16)
        : "",
      customer_id: activity.customer_id || "",
      lead_id: activity.lead_id || "",
      status: activity.status
    });

    setError("");
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "customer_id") {
      setForm((prev) => ({
        ...prev,
        customer_id: value,
        lead_id: ""
      }));
      return;
    }

    if (name === "lead_id") {
      setForm((prev) => ({
        ...prev,
        lead_id: value,
        customer_id: ""
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.customer_id && !form.lead_id) {
      setError("Select a customer or a lead.");
      return;
    }

    const payload = {
      ...form,
      activity_date: new Date(form.activity_date).toISOString(),
      customer_id: form.customer_id || null,
      lead_id: form.lead_id || null
    };

    try {
      setSaving(true);

if (editingId) {
    await api.put(`/activities/${editingId}`, {
        activity_type: payload.activity_type,
        subject: payload.subject,
        description: payload.description,
        activity_date: payload.activity_date,
        status: payload.status
    });
} else {
    await api.post("/activities", payload);
}

      setShowForm(false);
      setForm(initialForm);
      setEditingId(null);
      await loadActivities();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to save activity."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (activity, status) => {
    try {
      await api.put(`/activities/${activity.activity_id}`, {
        status
      });
      await loadActivities();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update activity status."
      );
    }
  };

  return (
    <div className="crm-layout">
      <Sidebar />

      <main className="crm-main">
        <Header />

        <div className="activities-page">
          <div className="activities-heading">
            <div>
              <h1>Activity Management</h1>
              <p>Track calls, meetings, emails and tasks.</p>
            </div>

            <button
              className="activity-primary-btn"
              onClick={openCreateForm}
            >
              <Plus size={18} />
              Add Activity
            </button>
          </div>

          <div className="activity-stats">
            <div className="activity-stat-card">
              <span>Total Activities</span>
              <strong>{pagination.total}</strong>
            </div>

            <div className="activity-stat-card">
              <span>Planned</span>
              <strong>
                {activities.filter(a => a.status === "Planned").length}
              </strong>
            </div>

            <div className="activity-stat-card">
              <span>Completed</span>
              <strong>
                {activities.filter(a => a.status === "Completed").length}
              </strong>
            </div>

            <div className="activity-stat-card">
              <span>Cancelled</span>
              <strong>
                {activities.filter(a => a.status === "Cancelled").length}
              </strong>
            </div>
          </div>

          <form className="activity-filters" onSubmit={handleSearch}>
            <div className="activity-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search activities..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
            >
              <option value="">All Statuses</option>
              <option value="Planned">Planned</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setPage(1);
                setTypeFilter(e.target.value);
              }}
            >
              <option value="">All Types</option>
              <option value="Call">Call</option>
              <option value="Meeting">Meeting</option>
              <option value="Email">Email</option>
              <option value="Task">Task</option>
            </select>

            <button type="submit" className="activity-filter-btn">
              Search
            </button>
          </form>

          {error && !showForm && (
            <div className="activity-error">{error}</div>
          )}

          <div className="activities-table-card">
            <div className="activities-table-wrap">
              <table className="activities-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Related To</th>
                    <th>Date</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="activity-empty">
                        Loading activities...
                      </td>
                    </tr>
                  ) : activities.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="activity-empty">
                        No activities found.
                      </td>
                    </tr>
                  ) : (
                    activities.map((activity) => (
                      <tr key={activity.activity_id}>
                        <td>
                          <strong>{activity.subject}</strong>
                          <small>{activity.activity_type}</small>
                        </td>

                        <td>
                          {activity.customer_name ||
                            activity.lead_name ||
                            "—"}
                        </td>

                        <td>
                          {new Date(activity.activity_date).toLocaleString()}
                        </td>

                        <td>{activity.assigned_user_name || "Unassigned"}</td>

                        <td>
                          <span
                            className={`activity-status status-${activity.status.toLowerCase()}`}
                          >
                            {activity.status}
                          </span>
                        </td>

                        <td>
                          <div className="activity-actions">
                            <button
                              title="Edit"
                              onClick={() => openEditForm(activity)}
                            >
                              <Pencil size={16} />
                            </button>

                            {activity.status === "Planned" && (
                              <>
                                <button
                                  title="Complete"
                                  onClick={() =>
                                    updateStatus(activity, "Completed")
                                  }
                                >
                                  <CheckCircle size={17} />
                                </button>

                                <button
                                  title="Cancel"
                                  onClick={() =>
                                    updateStatus(activity, "Cancelled")
                                  }
                                >
                                  <XCircle size={17} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="activity-pagination">
              <span>
                Showing {activities.length} of {pagination.total} activities
              </span>

              <div>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>

                <span>
                  Page {page} of {Math.max(pagination.totalPages, 1)}
                </span>

                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <div
            className="activity-modal-overlay"
            onClick={() => setShowForm(false)}
          >
            <div
              className="activity-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="activity-modal-heading">
                <h2>{editingId ? "Edit Activity" : "Create Activity"}</h2>
                <button onClick={() => setShowForm(false)}>×</button>
              </div>

              {error && (
                <div className="activity-error">{error}</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="activity-form-grid">
                  <label>
                    Activity Type *
                    <select
                      name="activity_type"
                      value={form.activity_type}
                      onChange={handleChange}
                      required
                    >
                      <option value="Call">Call</option>
                      <option value="Meeting">Meeting</option>
                      <option value="Email">Email</option>
                      <option value="Task">Task</option>
                    </select>
                  </label>

                  <label>
                    Subject *
                    <input
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      minLength="2"
                      maxLength="150"
                      required
                    />
                  </label>

                  <label>
                    Related Customer
                    <select
                      name="customer_id"
                      value={form.customer_id}
                      onChange={handleChange}
                      disabled={Boolean(editingId)}
                    >
                      <option value="">Select Customer</option>
                      {customers.map((customer) => (
                        <option
                          key={customer.customer_id}
                          value={customer.customer_id}
                        >
                          {customer.customer_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Related Lead
                    <select
                      name="lead_id"
                      value={form.lead_id}
                      onChange={handleChange}
                      disabled={Boolean(editingId)}
                    >
                      <option value="">Select Lead</option>
                      {leads.map((lead) => (
                        <option
                          key={lead.lead_id}
                          value={lead.lead_id}
                        >
                          {lead.lead_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Activity Date *
                    <input
                      type="datetime-local"
                      name="activity_date"
                      value={form.activity_date}
                      onChange={handleChange}
                      required
                    />
                  </label>

                  <label>
                    Status
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option value="Planned">Planned</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </label>

                  <label className="activity-full-width">
                    Description
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows="4"
                      maxLength="2000"
                    />
                  </label>
                </div>

                <div className="activity-form-actions">
                  <button
                    type="button"
                    className="activity-cancel-btn"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="activity-primary-btn"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Update Activity"
                        : "Create Activity"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Activities;