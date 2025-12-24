import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("jgpnr_token");
    const storedUser = localStorage.getItem("jgpnr_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock response - replace with actual API call
    const mockUser: User = {
      id: "1",
      email,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    };

    const mockToken = "mock-jwt-token-" + Date.now();

    setUser(mockUser);
    setToken(mockToken);
    localStorage.setItem("jgpnr_token", mockToken);
    localStorage.setItem("jgpnr_user", JSON.stringify(mockUser));
  };

  const register = async (data: RegisterData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockUser: User = {
      id: "1",
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: "admin",
    };

    const mockToken = "mock-jwt-token-" + Date.now();

    setUser(mockUser);
    setToken(mockToken);
    localStorage.setItem("jgpnr_token", mockToken);
    localStorage.setItem("jgpnr_user", JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("jgpnr_token");
    localStorage.removeItem("jgpnr_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};