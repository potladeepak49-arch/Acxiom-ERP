
import { useEffect, useState } from "react";
import api from "../services/api";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Users,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import "../styles/Customers.css";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

const emptyForm = {
  customer_name: "",
  email: "",
  phone: "",
  company_name: "",
  address: "",
  city: "",
  state: "",
  status: "Active"
};

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/customers", {
        params: {
          page,
          limit: 10,
          search: appliedSearch,
          status: statusFilter || undefined
        }
      });

      setCustomers(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, appliedSearch, statusFilter]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setForm({
      customer_name: customer.customer_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      company_name: customer.company_name || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      status: customer.status || "Active"
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
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

      if (editingCustomer) {
        await api.put(
          `/customers/${editingCustomer.customer_id}`,
          form
        );
        setSuccess("Customer updated successfully.");
      } else {
        await api.post("/customers", form);
        setSuccess("Customer created successfully.");
      }

      closeModal();
      await loadCustomers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save customer."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (customer) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${customer.customer_name}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.patch(
        `/customers/${customer.customer_id}/deactivate`
      );

      setSuccess("Customer deactivated successfully.");
      await loadCustomers();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to deactivate customer."
      );
    }
  };

  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
    }
  };

return (
    <div className="crm-layout">
        <Sidebar />

        <main className="crm-main">
            <Header />

            <div className="customers-page">
      <div className="customers-heading">
        <div>
          <div className="customers-breadcrumb">
            Dashboard <span>/</span> Customers
          </div>
          <h1>Customers</h1>
          <p>Manage and maintain your customer relationships.</p>
        </div>

        <button className="customer-add-btn" onClick={openAddModal}>
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      {success && (
        <div className="customer-alert success-alert">
          {success}
          <button onClick={() => setSuccess("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="customer-alert error-alert">
          {error}
          <button onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="customer-summary">
        <div className="customer-summary-icon">
          <Users size={24} />
        </div>
        <div>
          <span>Total Customers</span>
          <strong>{pagination.total}</strong>
        </div>
      </div>

      <div className="customers-content">
        <div className="customers-toolbar">
          <form className="customer-search" onSubmit={handleSearch}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name, email, phone or company..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          <div className="customer-toolbar-actions">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter customers by status"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <button
              className="customer-refresh-btn"
              onClick={loadCustomers}
              title="Refresh customers"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>

        <div className="customers-table-wrapper">
          <table className="customers-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="customer-empty">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="customer-empty">
                    No customers found. Add your first customer.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.customer_id}>
                    <td>
                      <div className="customer-name-cell">
                        <strong>{customer.customer_name}</strong>
                        <span>{customer.customer_code}</span>
                      </div>
                    </td>

                    <td>{customer.company_name || "—"}</td>

                    <td>
                      <div className="customer-contact-cell">
                        <span>{customer.email}</span>
                        <span>{customer.phone}</span>
                      </div>
                    </td>

                    <td>
                      {[customer.city, customer.state]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>

                    <td>{customer.owner_name || "Unassigned"}</td>

                    <td>
                      <span
                        className={`customer-status ${
                          customer.status === "Active"
                            ? "status-active"
                            : "status-inactive"
                        }`}
                      >
                        {customer.status}
                      </span>
                    </td>

                    <td>
                      <div className="customer-row-actions">
                        <button
                          title="Edit customer"
                          onClick={() => openEditModal(customer)}
                        >
                          <Pencil size={16} />
                        </button>

                        {customer.status === "Active" && (
                          <button
                            className="deactivate-action"
                            title="Deactivate customer"
                            onClick={() => handleDeactivate(customer)}
                          >
                            <Trash2 size={16} />
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

        <div className="customers-pagination">
          <span>
            Showing {customers.length ? (page - 1) * 10 + 1 : 0}
            {"–"}
            {(page - 1) * 10 + customers.length} of {pagination.total}
            {" "}customers
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
          className="customer-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="customer-modal">
            <div className="customer-modal-header">
              <div>
                <h2>
                  {editingCustomer ? "Edit Customer" : "Add New Customer"}
                </h2>
                <p>
                  {editingCustomer
                    ? "Update the customer information."
                    : "Enter the details to create a customer."}
                </p>
              </div>

              <button onClick={closeModal} type="button">
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="customer-form-grid">
                <label>
                  Customer Name *
                  <input
                    name="customer_name"
                    value={form.customer_name}
                    onChange={handleChange}
                    required
                    minLength="2"
                    maxLength="150"
                    placeholder="Enter customer name"
                  />
                </label>

                <label>
                  Email *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    maxLength="150"
                    placeholder="customer@example.com"
                  />
                </label>

                <label>
                  Phone *
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    minLength="7"
                    maxLength="15"
                    placeholder="Enter phone number"
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
                  City
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    maxLength="100"
                    placeholder="City"
                  />
                </label>

                <label>
                  State
                  <input
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    maxLength="100"
                    placeholder="State"
                  />
                </label>

                <label className="customer-full-width">
                  Address
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    maxLength="500"
                    rows="3"
                    placeholder="Enter customer address"
                  />
                </label>

                <label>
                  Status
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="customer-modal-footer">
                <button
                  type="button"
                  className="customer-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="customer-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingCustomer
                      ? "Save Changes"
                      : "Create Customer"}
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

export default Customers;
