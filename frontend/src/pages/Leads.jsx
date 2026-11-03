
import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import {
    Search,
    Plus,
    Pencil,
    RefreshCw,
    Users,
    X,
    ChevronLeft,
    ChevronRight,
    IndianRupee
} from "lucide-react";
import "../styles/Leads.css";

const emptyForm = {
    lead_name: "",
    email: "",
    phone: "",
    company_name: "",
    source: "",
    status: "New",
    priority: "Medium",
    expected_value: 0
};

function Leads() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");

    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    const [showModal, setShowModal] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const loadLeads = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/leads", {
                params: {
                    page,
                    limit: 10,
                    search: appliedSearch,
                    status: statusFilter || undefined,
                    priority: priorityFilter || undefined
                }
            });

            setLeads(response.data.data || []);
            setPagination(response.data.pagination);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load leads."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeads();
    }, [page, appliedSearch, statusFilter, priorityFilter]);

    const handleSearch = (event) => {
        event.preventDefault();
        setPage(1);
        setAppliedSearch(search.trim());
    };

    const openAddModal = () => {
        setEditingLead(null);
        setForm(emptyForm);
        setError("");
        setShowModal(true);
    };

    const openEditModal = (lead) => {
        setEditingLead(lead);

        setForm({
            lead_name: lead.lead_name || "",
            email: lead.email || "",
            phone: lead.phone || "",
            company_name: lead.company_name || "",
            source: lead.source || "",
            status: lead.status || "New",
            priority: lead.priority || "Medium",
            expected_value: lead.expected_value || 0
        });

        setError("");
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingLead(null);
        setForm(emptyForm);
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const payload = {
                ...form,
                expected_value: Number(form.expected_value),
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
                company_name: form.company_name.trim() || null,
                source: form.source.trim() || null
            };

            if (editingLead) {
                await api.put(
                    `/leads/${editingLead.lead_id}`,
                    payload
                );

                setSuccess("Lead updated successfully.");
            } else {
                await api.post("/leads", payload);

                setSuccess("Lead created successfully.");
            }

            closeModal();
            await loadLeads();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to save lead."
            );
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = async (lead, newStatus) => {
        try {
            setError("");
            setSuccess("");

            await api.put(`/leads/${lead.lead_id}`, {
                status: newStatus
            });

            setSuccess("Lead status updated successfully.");
            await loadLeads();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to update lead status."
            );
        }
    };

    const changePage = (newPage) => {
        if (
            newPage >= 1 &&
            newPage <= pagination.totalPages
        ) {
            setPage(newPage);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(Number(value || 0));
    };

    return (
        <div className="crm-layout">
            <Sidebar />

            <main className="crm-main">
                <Header />

                <div className="leads-page">
                    <div className="leads-heading">
                        <div>
                            <div className="leads-breadcrumb">
                                Dashboard <span>/</span> Leads
                            </div>

                            <h1>Lead Management</h1>

                            <p>
                                Track, manage and convert your sales leads.
                            </p>
                        </div>

                        <button
                            className="lead-add-btn"
                            onClick={openAddModal}
                        >
                            <Plus size={18} />
                            Add Lead
                        </button>
                    </div>

                    {success && (
                        <div className="lead-alert lead-success">
                            {success}
                            <button onClick={() => setSuccess("")}>
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="lead-alert lead-error">
                            {error}
                            <button onClick={() => setError("")}>
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    <div className="lead-summary-grid">
                        <div className="lead-summary-card">
                            <div className="lead-summary-icon purple">
                                <Users size={23} />
                            </div>
                            <div>
                                <span>Total Leads</span>
                                <strong>{pagination.total}</strong>
                            </div>
                        </div>

                        <div className="lead-summary-card">
                            <div className="lead-summary-icon green">
                                <IndianRupee size={23} />
                            </div>
                            <div>
                                <span>Expected Value</span>
                                <strong>
                                    {formatCurrency(
                                        leads.reduce(
                                            (sum, lead) =>
                                                sum + Number(lead.expected_value || 0),
                                            0
                                        )
                                    )}
                                </strong>
                                <small>Current page total</small>
                            </div>
                        </div>
                    </div>

                    <div className="leads-content">
                        <div className="leads-toolbar">
                            <form
                                className="lead-search"
                                onSubmit={handleSearch}
                            >
                                <Search size={18} />

                                <input
                                    type="text"
                                    placeholder="Search leads by name, email or company..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                />

                                <button type="submit">
                                    Search
                                </button>
                            </form>

                            <div className="lead-filters">
                                <select
                                    value={statusFilter}
                                    onChange={(event) => {
                                        setStatusFilter(event.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="New">New</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="Qualified">Qualified</option>
                                    <option value="Unqualified">Unqualified</option>
                                    <option value="Converted">Converted</option>
                                    <option value="Lost">Lost</option>
                                </select>

                                <select
                                    value={priorityFilter}
                                    onChange={(event) => {
                                        setPriorityFilter(event.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="">All Priorities</option>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>

                                <button
                                    className="lead-refresh-btn"
                                    onClick={loadLeads}
                                    title="Refresh leads"
                                >
                                    <RefreshCw size={17} />
                                </button>
                            </div>
                        </div>

                        <div className="leads-table-wrapper">
                            <table className="leads-table">
                                <thead>
                                    <tr>
                                        <th>Lead</th>
                                        <th>Company</th>
                                        <th>Contact</th>
                                        <th>Source</th>
                                        <th>Expected Value</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" className="lead-empty">
                                                Loading leads...
                                            </td>
                                        </tr>
                                    ) : leads.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="lead-empty">
                                                No leads found. Add your first lead.
                                            </td>
                                        </tr>
                                    ) : (
                                        leads.map((lead) => (
                                            <tr key={lead.lead_id}>
                                                <td>
                                                    <div className="lead-name-cell">
                                                        <strong>{lead.lead_name}</strong>
                                                        <span>{lead.lead_code}</span>
                                                    </div>
                                                </td>

                                                <td>{lead.company_name || "—"}</td>

                                                <td>
                                                    <div className="lead-contact-cell">
                                                        <span>{lead.email || "—"}</span>
                                                        <span>{lead.phone || "—"}</span>
                                                    </div>
                                                </td>

                                                <td>{lead.source || "—"}</td>

                                                <td className="lead-value">
                                                    {formatCurrency(lead.expected_value)}
                                                </td>

                                                <td>
                                                    <span className={`lead-priority priority-${lead.priority.toLowerCase()}`}>
                                                        {lead.priority}
                                                    </span>
                                                </td>

                                                <td>
                                                    <select
                                                        className={`lead-status-select status-${lead.status.toLowerCase()}`}
                                                        value={lead.status}
                                                        disabled={lead.status === "Converted"}
                                                        onChange={(event) =>
                                                            updateStatus(
                                                                lead,
                                                                event.target.value
                                                            )
                                                        }
                                                    >
                                                        <option value="New">New</option>
                                                        <option value="Contacted">Contacted</option>
                                                        <option value="Qualified">Qualified</option>
                                                        <option value="Unqualified">Unqualified</option>
                                                        <option value="Converted">Converted</option>
                                                        <option value="Lost">Lost</option>
                                                    </select>
                                                </td>

                                                <td>
                                                    <div className="lead-row-actions">
                                                        <button
                                                            title="Edit lead"
                                                            disabled={lead.status === "Converted"}
                                                            onClick={() =>
                                                                openEditModal(lead)
                                                            }
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="leads-pagination">
                            <span>
                                Showing {leads.length ? (page - 1) * 10 + 1 : 0}
                                {"–"}
                                {(page - 1) * 10 + leads.length}
                                {" of "}
                                {pagination.total} leads
                            </span>

                            <div>
                                <button
                                    onClick={() => changePage(page - 1)}
                                    disabled={page <= 1}
                                >
                                    <ChevronLeft size={17} />
                                </button>

                                <span>
                                    Page {page} of {Math.max(pagination.totalPages, 1)}
                                </span>

                                <button
                                    onClick={() => changePage(page + 1)}
                                    disabled={page >= pagination.totalPages}
                                >
                                    <ChevronRight size={17} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {showModal && (
                        <div
                            className="lead-modal-backdrop"
                            onMouseDown={(event) => {
                                if (event.target === event.currentTarget) {
                                    closeModal();
                                }
                            }}
                        >
                            <div className="lead-modal">
                                <div className="lead-modal-header">
                                    <div>
                                        <h2>
                                            {editingLead ? "Edit Lead" : "Add New Lead"}
                                        </h2>
                                        <p>
                                            Enter the lead information below.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={closeModal}
                                    >
                                        <X size={21} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className="lead-form-grid">
                                        <label>
                                            Lead Name *
                                            <input
                                                name="lead_name"
                                                value={form.lead_name}
                                                onChange={handleChange}
                                                required
                                                minLength="2"
                                                maxLength="150"
                                                placeholder="Enter lead name"
                                            />
                                        </label>

                                        <label>
                                            Email
                                            <input
                                                type="email"
                                                name="email"
                                                value={form.email}
                                                onChange={handleChange}
                                                maxLength="150"
                                                placeholder="lead@example.com"
                                            />
                                        </label>

                                        <label>
                                            Phone
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={form.phone}
                                                onChange={handleChange}
                                                maxLength="15"
                                                placeholder="Phone number"
                                            />
                                        </label>

                                        <label>
                                            Company
                                            <input
                                                name="company_name"
                                                value={form.company_name}
                                                onChange={handleChange}
                                                maxLength="150"
                                                placeholder="Company name"
                                            />
                                        </label>

                                        <label>
                                            Lead Source
                                            <select
                                                name="source"
                                                value={form.source}
                                                onChange={handleChange}
                                            >
                                                <option value="">Select source</option>
                                                <option value="Website">Website</option>
                                                <option value="Referral">Referral</option>
                                                <option value="Social Media">Social Media</option>
                                                <option value="Email Campaign">Email Campaign</option>
                                                <option value="Cold Call">Cold Call</option>
                                                <option value="Advertisement">Advertisement</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </label>

                                        <label>
                                            Expected Value (₹)
                                            <input
                                                type="number"
                                                name="expected_value"
                                                value={form.expected_value}
                                                onChange={handleChange}
                                                min="0"
                                                step="0.01"
                                            />
                                        </label>

                                        <label>
                                            Priority
                                            <select
                                                name="priority"
                                                value={form.priority}
                                                onChange={handleChange}
                                            >
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                            </select>
                                        </label>

                                        <label>
                                            Status
                                            <select
                                                name="status"
                                                value={form.status}
                                                onChange={handleChange}
                                            >
                                                <option value="New">New</option>
                                                <option value="Contacted">Contacted</option>
                                                <option value="Qualified">Qualified</option>
                                                <option value="Unqualified">Unqualified</option>
                                                <option value="Lost">Lost</option>
                                            </select>
                                        </label>
                                    </div>

                                    <div className="lead-modal-footer">
                                        <button
                                            type="button"
                                            className="lead-cancel-btn"
                                            onClick={closeModal}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            className="lead-save-btn"
                                            disabled={saving}
                                        >
                                            {saving
                                                ? "Saving..."
                                                : editingLead
                                                    ? "Save Changes"
                                                    : "Create Lead"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Leads;
