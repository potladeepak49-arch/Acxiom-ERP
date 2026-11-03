
import {
    Navigate,
    Route,
    Routes
} from "react-router-dom";

import { useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Leads from "./pages/Leads";
import Followups from "./pages/Followups";
import AuditLogs from "./pages/AuditLogs";
import Opportunities from "./pages/Opportunities";
import Activities from "./pages/Activities";
import Users from "./pages/Users";
import Reports from "./pages/Reports";

function LoadingScreen() {
    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100">
            <div className="text-center">
                <div
                    className="spinner-border text-primary"
                    role="status"
                />
                <p className="mt-3 text-secondary">
                    Loading AcxiomCRM...
                </p>
            </div>
        </div>
    );
}

function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (
        allowedRoles &&
        !allowedRoles.includes(user.role)
    ) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

function App() {
    const { user, loading, login } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={
                    user
                        ? <Navigate to="/dashboard" replace />
                        : <Login onLogin={login} />
                }
            />

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customers"
                element={
                    <ProtectedRoute>
                        <Customers />
                    </ProtectedRoute>
                }
            />


            <Route
                path="*"
                element={
                    <Navigate
                        to={user ? "/dashboard" : "/login"}
                        replace
                    />
                }
            />
            <Route
  path="/reports"
  element={
    <ProtectedRoute allowedRoles={["Admin", "Manager"]}>
      <Reports />
    </ProtectedRoute>
  }
/>

            <Route
  path="/leads"
  element={
    <ProtectedRoute>
      <Leads />
    </ProtectedRoute>
  }
/>
<Route
  path="/follow-ups"
  element={
    <ProtectedRoute>
      <Followups />
    </ProtectedRoute>
  }
/>
<Route
  path="/audit-logs"
  element={
    <ProtectedRoute>
      <AuditLogs />
    </ProtectedRoute>
  }
/>
<Route
    path="/opportunities"
    element={
        <ProtectedRoute>
            <Opportunities />
        </ProtectedRoute>
    }
/>
<Route
  path="/activities"
  element={
    <ProtectedRoute>
      <Activities />
    </ProtectedRoute>
  }
/>
<Route
  path="/users"
  element={
    <ProtectedRoute allowedRoles={["Admin"]}>
      <Users />
    </ProtectedRoute>
  }
/>
        </Routes>
    );
}

export default App;
