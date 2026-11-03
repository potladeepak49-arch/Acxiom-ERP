
import { useEffect, useState } from "react";
import { Plus, Search, Pencil, UserCheck, UserX } from "lucide-react";
import api from "../services/api";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import "../styles/Users.css";

const initialForm = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  role_id: "",
  is_active: true
};

function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);

      const response = await api.get("/users", {
        params: {
          page,
          limit: 10,
          search,
          status: statusFilter,
          role_id: roleFilter
        }
      });

      setUsers(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await api.get("/users/roles");
      setRoles(response.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load roles."
      );
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter, roleFilter]);

  useEffect(() => {
    loadRoles();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditingId(user.user_id);

    setForm({
      full_name: user.full_name,
      email: user.email,
      password: "",
      phone: user.phone || "",
      role_id: user.role_id,
      is_active: user.is_active
    });

    setError("");
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const payload = {
      ...form,
      phone: form.phone || null
    };

    if (editingId && !payload.password) {
      delete payload.password;
    }

    try {
      setSaving(true);

      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
      } else {
        await api.post("/users", payload);
      }

      setShowForm(false);
      setForm(initialForm);
      setEditingId(null);

      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to save user."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (user) => {
    const action = user.is_active ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      await api.put(`/users/${user.user_id}`, {
        is_active: !user.is_active
      });

      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to change user status."
      );
    }
  };

  const activeCount = users.filter(user => user.is_active).length;
  const inactiveCount = users.filter(user => !user.is_active).length;

  return (
    <div className="crm-layout">
      <Sidebar />

      <main className="crm-main">
        <Header />

        <div className="users-page">
          <div className="users-heading">
            <div>
              <h1>User Management</h1>
              <p>Manage employees, roles and account access.</p>
            </div>

            <button
              className="user-primary-btn"
              onClick={openCreateForm}
            >
              <Plus size={18} />
              Add User
            </button>
          </div>

          <div className="user-stats">
            <div className="user-stat-card">
              <span>Total Users</span>
              <strong>{pagination.total}</strong>
            </div>

            <div className="user-stat-card">
              <span>Active on This Page</span>
              <strong>{activeCount}</strong>
            </div>

            <div className="user-stat-card">
              <span>Inactive on This Page</span>
              <strong>{inactiveCount}</strong>
            </div>

            <div className="user-stat-card">
              <span>Available Roles</span>
              <strong>{roles.length}</strong>
            </div>
          </div>

          <form className="user-filters" onSubmit={handleSearch}>
            <div className="user-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or phone..."
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => {
                setPage(1);
                setRoleFilter(e.target.value);
              }}
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button type="submit" className="user-filter-btn">
              Search
            </button>
          </form>

          {error && !showForm && (
            <div className="user-error">{error}</div>
          )}

          <div className="users-table-card">
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Account Status</th>
                    <th>Security</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="user-empty">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="user-empty">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.user_id}>
                        <td>
                          <strong>{user.full_name}</strong>
                          <small>
                            Created {new Date(user.created_at).toLocaleDateString()}
                          </small>
                        </td>

                        <td>
                          {user.email}
                          <small>{user.phone || "No phone number"}</small>
                        </td>

                        <td>
                          <span className="user-role">
                            {user.role_name}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`user-status ${
                              user.is_active ? "active" : "inactive"
                            }`}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td>
                          {user.lockout_until &&
                          new Date(user.lockout_until) > new Date()
                            ? "Locked"
                            : `${user.failed_login_attempts} failed attempts`}
                        </td>

                        <td>
                          <div className="user-actions">
                            <button
                              title="Edit user"
                              onClick={() => openEditForm(user)}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              title={user.is_active ? "Deactivate" : "Activate"}
                              onClick={() => toggleStatus(user)}
                            >
                              {user.is_active
                                ? <UserX size={17} />
                                : <UserCheck size={17} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="user-pagination">
              <span>
                Showing {users.length} of {pagination.total} users
              </span>

              <div>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>

                <span>
                  Page {page} of {Math.max(pagination.totalPages, 1)}
                </span>

                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <div
            className="user-modal-overlay"
            onClick={() => setShowForm(false)}
          >
            <div
              className="user-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="user-modal-heading">
                <h2>{editingId ? "Edit User" : "Create User"}</h2>
                <button onClick={() => setShowForm(false)}>×</button>
              </div>

              {error && (
                <div className="user-error">{error}</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="user-form-grid">
                  <label>
                    Full Name *
                    <input
                      name="full_name"
                      value={form.full_name}
                      onChange={handleChange}
                      minLength="2"
                      maxLength="100"
                      required
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
                    />
                  </label>

                  <label>
                    Password {editingId ? "(Leave blank to retain)" : "*"}
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      minLength="8"
                      required={!editingId}
                    />
                  </label>

                  <label>
                    Phone
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      maxLength="15"
                    />
                  </label>

                  <label>
                    Role *
                    <select
                      name="role_id"
                      value={form.role_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Role</option>
                      {roles.map(role => (
                        <option key={role.role_id} value={role.role_id}>
                          {role.role_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="user-checkbox-label">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleChange}
                    />
                    Account Active
                  </label>
                </div>

                <div className="user-form-actions">
                  <button
                    type="button"
                    className="user-cancel-btn"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="user-primary-btn"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Update User"
                        : "Create User"}
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

export default Users;
