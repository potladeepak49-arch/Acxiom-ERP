
import { useEffect, useState } from "react";
import {
  Plus, Search, RefreshCw, Pencil, X, TrendingUp
} from "lucide-react";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "../styles/Opportunities.css";

const initialForm = {
  opportunity_name: "",
  customer_id: "",
  lead_id: "",
  amount: "",
  stage: "Qualification",
  probability: "20",
  expected_close_date: "",
  status: "Open",
  assigned_to: "",
  notes: ""
};

function Opportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1, limit: 10, total: 0, totalPages: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/opportunities", {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          stage: stageFilter || undefined,
          status: statusFilter || undefined
        }
      });

      setOpportunities(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load opportunities.");
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedRecords = async () => {
    const results = await Promise.allSettled([
      api.get("/customers", { params: { limit: 100 } }),
      api.get("/leads", { params: { limit: 100 } })
    ]);

    if (results[0].status === "fulfilled") {
      setCustomers(results[0].value.data.data || []);
    }

    if (results[1].status === "fulfilled") {
      setLeads(results[1].value.data.data || []);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [page, stageFilter, statusFilter]);

  useEffect(() => {
    loadRelatedRecords();
  }, []);

  const updateField = (e) => {
    const { name, value } = e.target;

    setForm((previous) => {
      const updated = { ...previous, [name]: value };

      if (name === "stage") {
        if (value === "Won") {
          updated.status = "Won";
          updated.probability = "100";
        } else if (value === "Lost") {
          updated.status = "Lost";
          updated.probability = "0";
        } else {
          updated.status = "Open";
        }
      }

      return updated;
    });
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.opportunity_id);
    setForm({
      opportunity_name: item.opportunity_name || "",
      customer_id: item.customer_id || "",
      lead_id: item.lead_id || "",
      amount: String(item.amount || ""),
      stage: item.stage || "Qualification",
      probability: String(item.probability ?? 0),
      expected_close_date: item.expected_close_date
        ? String(item.expected_close_date).slice(0, 10)
        : "",
      status: item.status || "Open",
      assigned_to: item.assigned_to || "",
      notes: item.notes || ""
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (!form.customer_id && !form.lead_id) {
      setError("Select a customer or a lead.");
      setSaving(false);
      return;
    }

    const payload = {
      opportunity_name: form.opportunity_name.trim(),
      customer_id: form.customer_id || null,
      lead_id: form.lead_id || null,
      amount: Number(form.amount),
      stage: form.stage,
      probability: Number(form.probability),
      expected_close_date: form.expected_close_date,
      status: form.status,
      assigned_to: form.assigned_to || null,
      notes: form.notes.trim() || null
    };

    try {
      if (editingId) {
        // Keep the original relationship unchanged during editing.
        delete payload.customer_id;
        delete payload.lead_id;
        delete payload.assigned_to;

        await api.put(`/opportunities/${editingId}`, payload);
        setSuccess("Opportunity updated successfully.");
      } else {
        await api.post("/opportunities", payload);
        setSuccess("Opportunity created successfully.");
      }

      setShowModal(false);
      setForm(initialForm);
      setEditingId(null);
      await loadOpportunities();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.errors?.map((item) => item.message).join(", ") ||
        "Unable to save opportunity."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadOpportunities();
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(value || 0));

  const openCount = opportunities.filter(
    (item) => item.status === "Open"
  ).length;

  const wonCount = opportunities.filter(
    (item) => item.status === "Won"
  ).length;

  const weightedPipeline = opportunities
    .filter((item) => item.status === "Open")
    .reduce((total, item) => total + Number(item.weighted_amount || 0), 0);

  return (
    <div className="crm-layout">
      <Sidebar />

      <main className="crm-main">
        <Header />

        <div className="opportunity-page">
          <div className="opportunity-heading">
            <div>
              <span className="opportunity-eyebrow">SALES MANAGEMENT</span>
              <h1>Opportunities</h1>
              <p>Manage deals, monitor pipeline and track revenue potential.</p>
            </div>

            <button className="opportunity-primary-btn" onClick={openCreateModal}>
              <Plus size={17} /> New Opportunity
            </button>
          </div>

          <div className="opportunity-stats">
            <div className="opportunity-stat-card">
              <span>Total Opportunities</span>
              <strong>{pagination.total}</strong>
            </div>
            <div className="opportunity-stat-card">
              <span>Open Opportunities</span>
              <strong>{openCount}</strong>
            </div>
            <div className="opportunity-stat-card">
              <span>Won Opportunities</span>
              <strong>{wonCount}</strong>
            </div>
            <div className="opportunity-stat-card">
              <span>Weighted Pipeline</span>
              <strong>{formatCurrency(weightedPipeline)}</strong>
            </div>
          </div>

          {success && <div className="opportunity-success">{success}</div>}
          {error && !showModal && <div className="opportunity-error">{error}</div>}

          <form className="opportunity-toolbar" onSubmit={handleSearch}>
            <div className="opportunity-search">
              <Search size={17} />
              <input
                placeholder="Search opportunities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Stages</option>
              <option value="Qualification">Qualification</option>
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>

            <button type="button" className="opportunity-refresh" onClick={loadOpportunities}>
              <RefreshCw size={16} />
            </button>
          </form>

          <div className="opportunity-table-card">
            <div className="opportunity-table-heading">
              <h2>Sales Pipeline</h2>
              <span>{pagination.total} opportunities</span>
            </div>

            {loading ? (
              <div className="opportunity-empty">Loading opportunities...</div>
            ) : opportunities.length === 0 ? (
              <div className="opportunity-empty">
                <TrendingUp size={35} />
                <h3>No opportunities yet</h3>
                <p>Create your first opportunity to start building your sales pipeline.</p>
                <button onClick={openCreateModal}>Create Opportunity</button>
              </div>
            ) : (
              <div className="opportunity-table-scroll">
                <table className="opportunity-table">
                  <thead>
                    <tr>
                      <th>OPPORTUNITY</th>
                      <th>RELATED TO</th>
                      <th>AMOUNT</th>
                      <th>STAGE</th>
                      <th>PROBABILITY</th>
                      <th>WEIGHTED VALUE</th>
                      <th>CLOSE DATE</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opportunities.map((item) => (
                      <tr key={item.opportunity_id}>
                        <td><strong>{item.opportunity_name}</strong></td>
                        <td>{item.customer_name || item.lead_name || "—"}</td>
                        <td>{formatCurrency(item.amount)}</td>
                        <td>{item.stage}</td>
                        <td>{Number(item.probability)}%</td>
                        <td>{formatCurrency(item.weighted_amount)}</td>
                        <td>{new Date(item.expected_close_date).toLocaleDateString("en-IN")}</td>
                        <td>
                          <span className={`opportunity-status status-${item.status.toLowerCase()}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="opportunity-edit-btn"
                            onClick={() => openEditModal(item)}
                            title="Edit opportunity"
                          >
                            <Pencil size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="opportunity-pagination">
              <span>Page {pagination.page || 1} of {pagination.totalPages || 1}</span>
              <div>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
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
      </main>

      {showModal && (
        <div className="opportunity-modal-backdrop">
          <div className="opportunity-modal">
            <div className="opportunity-modal-header">
              <div>
                <span>SALES PIPELINE</span>
                <h2>{editingId ? "Edit Opportunity" : "Create Opportunity"}</h2>
              </div>
              <button type="button" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            {error && <div className="opportunity-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <label>
                Opportunity Name *
                <input
                  name="opportunity_name"
                  value={form.opportunity_name}
                  onChange={updateField}
                  required
                  minLength={2}
                  maxLength={150}
                />
              </label>

              {!editingId && (
                <div className="opportunity-form-grid">
                  <label>
                    Link Customer
                    <select name="customer_id" value={form.customer_id} onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        customer_id: e.target.value,
                        lead_id: ""
                      }));
                    }}>
                      <option value="">Select customer</option>
                      {customers.map((customer) => (
                        <option key={customer.customer_id} value={customer.customer_id}>
                          {customer.customer_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Or Link Lead
                    <select name="lead_id" value={form.lead_id} onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        lead_id: e.target.value,
                        customer_id: ""
                      }));
                    }}>
                      <option value="">Select lead</option>
                      {leads.map((lead) => (
                        <option key={lead.lead_id} value={lead.lead_id}>
                          {lead.lead_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <div className="opportunity-form-grid">
                <label>
                  Amount (INR) *
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={updateField}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </label>

                <label>
                  Expected Close Date *
                  <input
                    type="date"
                    name="expected_close_date"
                    value={form.expected_close_date}
                    onChange={updateField}
                    min={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </label>
              </div>

              <div className="opportunity-form-grid">
                <label>
                  Stage *
                  <select name="stage" value={form.stage} onChange={updateField}>
                    <option value="Qualification">Qualification</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </label>

                <label>
                  Probability (%) *
                  <input
                    type="number"
                    name="probability"
                    value={form.probability}
                    onChange={updateField}
                    min="0"
                    max="100"
                    step="0.01"
                    required
                  />
                </label>
              </div>

              <label>
                Notes
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={updateField}
                  rows="3"
                  maxLength="2000"
                />
              </label>

              <div className="opportunity-modal-actions">
                <button
                  type="button"
                  className="opportunity-cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Opportunities;
