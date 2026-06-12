import React, { createContext, useContext, useEffect, useState } from "react";

type Employee = {
  id: string;
  name: string;
  email: string;
  role: "employee" | "manager" | "hr" | "super_admin";
  status: string;
  department: string | null;
  designation: string | null;
  shift_id: string | null;
  shift?: string;
  created_at?: string;
};

type AuthContextType = {
  employee: Employee | null;
  role: Employee["role"] | null;
  isAdminLevel: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  employee: null,
  role: null,
  isAdminLevel: false,
  isSuperAdmin: false,
  isLoading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Custom Codebase Auth: Read faux session from localStorage
    const storedSession = localStorage.getItem("lams_session");
    if (storedSession) {
      try {
        const parsedEmployee = JSON.parse(storedSession);
        setEmployee(parsedEmployee);
      } catch (e) {
        console.error("Invalid session data");
        localStorage.removeItem("lams_session");
      }
    }
    setIsLoading(false);
  }, []);

  const logout = async () => {
    localStorage.removeItem("lams_session");
    setEmployee(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        employee,
        role: employee?.role ?? null,
        isAdminLevel: employee?.role === "hr" || employee?.role === "super_admin",
        isSuperAdmin: employee?.role === "super_admin",
        isLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
