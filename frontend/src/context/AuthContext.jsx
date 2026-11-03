import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore the existing login session after a page refresh
    useEffect(() => {
        let active = true;

        async function checkSession() {
            try {
                const response = await api.get("/auth/me");

                if (active) {
                    setUser(response.data.user);
                }
            } catch (error) {
                if (active) {
                    setUser(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        checkSession();

        return () => {
            active = false;
        };
    }, []);

    // Update the authenticated user after login
    const login = (userData) => {
        setUser(userData);
    };

    // Log out and clear the current user
    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } finally {
            setUser(null);
        }
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: Boolean(user)
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook for accessing authentication
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside an AuthProvider."
        );
    }

    return context;
}