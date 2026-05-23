import { create } from "zustand";
import { AuthUser, getUser, getUserRole, isAuthenticated } from "@/lib/auth";

interface AuthState {
  user: AuthUser | null;
  role: "admin" | "customer" | null;
  isAuth: boolean;
  refresh: () => void;
  setUser: (user: AuthUser | null, role: "admin" | "customer" | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: typeof window !== "undefined" ? getUser() : null,
  role: typeof window !== "undefined" ? getUserRole() : null,
  isAuth: typeof window !== "undefined" ? isAuthenticated() : false,
  refresh: () => {
    set({
      user: getUser(),
      role: getUserRole(),
      isAuth: isAuthenticated(),
    });
  },
  setUser: (user, role) => {
    set({
      user,
      role,
      isAuth: !!user,
    });
  },
}));
