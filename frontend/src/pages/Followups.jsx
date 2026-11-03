import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import "../styles/Followups.css";

const initialForm = {
  related_type: "customer",
  related_id: "",
  followup_date: "",
  followup_type: "Call",
  subject: "",
  remarks: "",
  status: "Planned",
  assigned_to: "",
};

function Followups() {
  const [followups, setFollowups] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [opportunities, setOpportunities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewFilter, setViewFilter] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const loadFollowups = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/followups", {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          status: statusFilter || undefined,
          view: viewFilter || undefined,
        },
      });

      setFollowups(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load follow-ups."
      );
    } finally {
      setLoading(false);
    }
  };

const loadRelatedRecords = async () => {
  try {
    const results = await Promise.allSettled([
      api.get("/customers", { params: { limit: 100 } }),
      api.get("/leads", { params: { limit: 100 } }),
      api.get("/opportunities", { params: { limit: 100 } }),
    ]);

    if (results[0].status === "fulfilled") {
      setCustomers(results[0].value.data.data || []);
    }

    if (results[1].status === "fulfilled") {
      setLeads(results[1].value.data.data || []);
    }

    if (results[2].status === "fulfilled") {
      setOpportunities(results[2].value.data.data || []);
    }
  } catch (error) {
    console.error("Error loading related records:", error);
  }
};

  useEffect(() => {
    loadFollowups();
  }, [page, statusFilter, viewFilter]);

  useEffect(() => {
    loadRelatedRecords();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      ...initialForm,
      followup_date: "",
    });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.followup_id);

    let relatedType = "customer";
    let relatedId = "";

    if (item.lead_id) {
      relatedType = "lead";
      relatedId = item.lead_id;
    } else if (item.opportunity_id) {
      relatedType = "opportunity";
      relatedId = item.opportunity_id;
    } else {
      relatedId = item.customer_id || "";
    }

    setForm({
      related_type: relatedType,
      related_id: relatedId,
      followup_date: item.followup_date
        ? new Date(item.followup_date).toISOString().slice(0, 16)
        : "",
      followup_type: item.followup_type,
      subject: item.subject,
      remarks: item.remarks || "",
      status: item.status,
      assigned_to: item.assigned_to || "",
    });

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "related_type" ? { related_id: "" } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        followup_date: new Date(form.followup_date).toISOString(),
        followup_type: form.followup_type,
        subject: form.subject.trim(),
        remarks: form.remarks.trim() || null,
        status: form.status,
      };

      if (!editingId) {
        payload.customer_id =
          form.related_type === "customer" ? form.related_id : null;
        payload.lead_id =
          form.related_type === "lead" ? form.related_id : null;
        payload.opportunity_id =
          form.related_type === "opportunity" ? form.related_id : null;

        payload.assigned_to = form.assigned_to || null;

        await api.post("/followups", payload);
        setSuccess("Follow-up scheduled successfully.");
      } else {
        await api.put(`/followups/${editingId}`, payload);
        setSuccess("Follow-up updated successfully.");
      }

      closeModal();
      await loadFollowups();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.message ||
          "Unable to save follow-up."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      setError("");
      setSuccess("");

      await api.put(`/followups/${id}`, { status });

      setSuccess(`Follow-up marked as ${status}.`);
      await loadFollowups();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update follow-up."
      );
    }
  };

  const getRelatedName = (item) => {
    if (item.customer_id) {
      const customer = customers.find(
        (c) => c.customer_id === item.customer_id
      );
      return customer?.customer_name || "Customer";
    }

    if (item.lead_id) {
      const lead = leads.find((l) => l.lead_id === item.lead_id);
      return lead?.lead_name || "Lead";
    }

    if (item.opportunity_id) {
      const opportunity = opportunities.find(
        (o) => o.opportunity_id === item.opportunity_id
      );
      return opportunity?.opportunity_name || "Opportunity";
    }

    return "—";
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isOverdue = (item) =>
    item.status === "Planned" &&
    new Date(item.followup_date) < new Date();

  const getRelatedOptions = () => {
    if (form.related_type === "lead") {
      return leads.map((item) => ({
        id: item.lead_id,
        name: item.lead_name,
      }));
    }

    if (form.related_type === "opportunity") {
      return opportunities.map((item) => ({
        id: item.opportunity_id,
        name: item.opportunity_name,
      }));
    }

    return customers.map((item) => ({
      id: item.customer_id,
      name: item.customer_name,
    }));
  };

  const getStatusClass = (status) =>
    status.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="crm-layout">
      <Sidebar />

      <main className="crm-main">
        <Header />

        <div className="followups-page">
          <div className="followups-heading">
            <div>
              <h1>Follow-Up Management</h1>
              <p>Schedule, track and manage your sales follow-ups.</p>
            </div>

            <button className="followup-primary-btn" onClick={openAddModal}>
              <Plus size={18} />
              Schedule Follow-Up
            </button>
          </div>

          {error && (
            <div className="followup-alert error">
              <AlertCircle size={17} />
              {error}
              <button onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {success && (
            <div className="followup-alert success">
              <CheckCircle size={17} />
              {success}
              <button onClick={() => setSuccess("")}>
                <X size={16} />
              </button>
            </div>
          )}

          <div className="followup-stats">
            <div className="followup-stat-card">
              <div className="followup-stat-icon blue">
                <CalendarDays />
              </div>
              <div>
                <span>Total Follow-Ups</span>
                <h2>{pagination.total}</h2>
              </div>
            </div>

            <div className="followup-stat-card">
              <div className="followup-stat-icon orange">
                <Clock />
              </div>
              <div>
                <span>Planned</span>
                <h2>
                  {followups.filter((f) => f.status === "Planned").length}
                </h2>
              </div>
            </div>

            <div className="followup-stat-card">
              <div className="followup-stat-icon green">
                <CheckCircle />
              </div>
              <div>
                <span>Completed</span>
                <h2>
                  {followups.filter((f) => f.status === "Completed").length}
                </h2>
              </div>
            </div>

            <div className="followup-stat-card">
              <div className="followup-stat-icon red">
                <AlertCircle />
              </div>
              <div>
                <span>Overdue</span>
                <h2>
                  {followups.filter((f) => isOverdue(f)).length}
                </h2>
              </div>
            </div>
          </div>

          <div className="followups-toolbar">
            <div className="followup-search">
              <Search size={18} />
              <input
                placeholder="Search subject or remarks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    loadFollowups();
                  }
                }}
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
              <option value="Missed">Missed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={viewFilter}
              onChange={(e) => {
                setPage(1);
                setViewFilter(e.target.value);
              }}
            >
              <option value="">All Follow-Ups</option>
              <option value="upcoming">Upcoming</option>
              <option value="overdue">Overdue</option>
            </select>

            <button
              className="followup-refresh-btn"
              onClick={loadFollowups}
              title="Refresh"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          <div className="followups-table-card">
            <div className="followups-table-wrapper">
              <table className="followups-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Related Record</th>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="followup-empty">
                        Loading follow-ups...
                      </td>
                    </tr>
                  ) : followups.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="followup-empty">
                        No follow-ups found. Schedule your first follow-up.
                      </td>
                    </tr>
                  ) : (
                    followups.map((item) => (
                      <tr key={item.followup_id}>
                        <td>
                          <strong>{item.subject}</strong>
                          {isOverdue(item) && (
                            <span className="overdue-label">Overdue</span>
                          )}
                        </td>

                        <td>{getRelatedName(item)}</td>

                        <td>{formatDate(item.followup_date)}</td>

                        <td>{item.followup_type}</td>

                        <td>{item.assigned_to_name || "Unassigned"}</td>

                        <td>
                          <span
                            className={`followup-status ${getStatusClass(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td>
                          <div className="followup-actions">
                            <button
                              onClick={() => openEditModal(item)}
                              title="Edit follow-up"
                            >
                              <Pencil size={16} />
                            </button>

                            {item.status === "Planned" && (
                              <button
                                className="complete-action"
                                onClick={() =>
                                  updateStatus(
                                    item.followup_id,
                                    "Completed"
                                  )
                                }
                                title="Mark completed"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="followups-pagination">
              <span>
                Showing {followups.length} of {pagination.total} follow-ups
              </span>

              <div>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={17} />
                </button>

                <span>
                  {page} / {Math.max(pagination.totalPages, 1)}
                </span>

                <button
                  disabled={
                    page >= pagination.totalPages ||
                    pagination.totalPages === 0
                  }
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {showModal && (
          <div className="followup-modal-overlay">
            <div className="followup-modal">
              <div className="followup-modal-header">
                <div>
                  <h2>
                    {editingId ? "Edit Follow-Up" : "Schedule Follow-Up"}
                  </h2>
                  <p>Enter the follow-up details below.</p>
                </div>

                <button onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {!editingId && (
                  <>
                    <div className="followup-form-group">
                      <label>Related Record Type *</label>
                      <select
                        name="related_type"
                        value={form.related_type}
                        onChange={handleChange}
                        required
                      >
                        <option value="customer">Customer</option>
                        <option value="lead">Lead</option>
                        <option value="opportunity">Opportunity</option>
                      </select>
                    </div>

                    <div className="followup-form-group">
                      <label>Select Record *</label>
                      <select
                        name="related_id"
                        value={form.related_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select a record</option>
                        {getRelatedOptions().map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="followup-form-group">
                  <label>Subject *</label>
                  <input
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="e.g. Discuss pricing proposal"
                    minLength="2"
                    maxLength="150"
                    required
                  />
                </div>

                <div className="followup-form-row">
                  <div className="followup-form-group">
                    <label>Follow-Up Type *</label>
                    <select
                      name="followup_type"
                      value={form.followup_type}
                      onChange={handleChange}
                      required
                    >
                      <option value="Call">Call</option>
                      <option value="Email">Email</option>
                      <option value="Meeting">Meeting</option>
                      <option value="Task">Task</option>
                    </select>
                  </div>

                  <div className="followup-form-group">
                    <label>Status *</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      required
                    >
                      <option value="Planned">Planned</option>
                      <option value="Completed">Completed</option>
                      <option value="Missed">Missed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="followup-form-group">
                  <label>Follow-Up Date & Time *</label>
                  <input
                    type="datetime-local"
                    name="followup_date"
                    value={form.followup_date}
                    onChange={handleChange}
                    min={!editingId ? new Date().toISOString().slice(0, 16) : undefined}
                    required
                  />
                </div>

                <div className="followup-form-group">
                  <label>Remarks</label>
                  <textarea
                    name="remarks"
                    value={form.remarks}
                    onChange={handleChange}
                    placeholder="Add notes about this follow-up..."
                    maxLength="2000"
                    rows="3"
                  />
                </div>

                <div className="followup-modal-actions">
                  <button
                    type="button"
                    className="followup-cancel-btn"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="followup-primary-btn"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Save Changes"
                      : "Schedule Follow-Up"}
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

export default Followups;