import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserRole } from "@workspace/api-client-react";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  schoolId: number;
}

interface AuthState {
  user: AuthUser | null;
  login: (role: UserRole) => void;
  logout: () => void;
}

const ROLE_NAMES: Record<UserRole, string> = {
  super_admin: "Arjun Sharma",
  school_admin: "Priya Mehta",
  principal: "Dr. Rajesh Kumar",
  teacher: "Sunita Patel",
  accountant: "Ramesh Gupta",
  parent: "Parent User",
  student: "Student User",
};

const ROLE_EMAILS: Record<UserRole, string> = {
  super_admin: "superadmin@schoolos.in",
  school_admin: "admin@dps.in",
  principal: "principal@dps.in",
  teacher: "teacher@dps.in",
  accountant: "accountant@dps.in",
  parent: "parent@dps.in",
  student: "student@dps.in",
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (role: UserRole) =>
        set({
          user: {
            id: role === "super_admin" ? 1 : role === "school_admin" ? 2 : role === "principal" ? 3 : 4,
            name: ROLE_NAMES[role],
            email: ROLE_EMAILS[role],
            role,
            schoolId: 1,
          },
        }),
      logout: () => set({ user: null }),
    }),
    {
      name: "school-os-auth",
    }
  )
);
