import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "employee" | "volunteer";

export type AuthUser = {
  id: string;
  role: UserRole;
  display_name: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  loginWithPin: (pin: string) => Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }>;
  logout: () => void;
  can: (action: Permission) => boolean;
};

// Permission keys gating sensitive actions
export type Permission =
  | "items.create"
  | "items.edit"
  | "items.delete"
  | "pallets.create"
  | "pallets.delete"
  | "pallets.assign"
  | "containers.create"
  | "containers.delete"
  | "containers.ship"
  | "reports.generate";

const VOLUNTEER_PERMS: Record<Permission, boolean> = {
  "items.create": true,
  "items.edit": true,
  "items.delete": false,
  "pallets.create": true,
  "pallets.delete": false,
  "pallets.assign": true,
  "containers.create": false,
  "containers.delete": false,
  "containers.ship": false,
  "reports.generate": false,
};

const EMPLOYEE_PERMS: Record<Permission, boolean> = {
  "items.create": true,
  "items.edit": true,
  "items.delete": true,
  "pallets.create": true,
  "pallets.delete": true,
  "pallets.assign": true,
  "containers.create": true,
  "containers.delete": true,
  "containers.ship": true,
  "reports.generate": true,
};

const STORAGE_KEY = "medware.auth.user";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const loginWithPin: AuthContextValue["loginWithPin"] = async (pin) => {
    const trimmed = pin.trim();
    if (!/^[0-9]{4,6}$/.test(trimmed)) {
      return { ok: false, error: "PIN must be 4–6 digits" };
    }
    const { data, error } = await supabase
      .from("app_users")
      .select("id, role, display_name, is_active")
      .eq("pin_code", trimmed)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data || !data.is_active) return { ok: false, error: "Invalid PIN" };

    const next: AuthUser = {
      id: data.id,
      role: data.role as UserRole,
      display_name: data.display_name,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setUser(next);
    return { ok: true, user: next };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const can: AuthContextValue["can"] = (action) => {
    if (!user) return false;
    const map = user.role === "employee" ? EMPLOYEE_PERMS : VOLUNTEER_PERMS;
    return !!map[action];
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithPin, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
