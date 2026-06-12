export type UserRole =
  | "super_admin"
  | "society_admin"
  | "school_admin"
  | "principal"
  | "coordinator"
  | "teacher"
  | "accountant"
  | "parent"
  | "student";

export type RoleScopeTier = "platform" | "society" | "school" | "branch";

export type AuthUser = {
  id: number;
  userCode: string | null;
  name: string;
  mobile: string;
  email: string | null;
  role: UserRole;
  roleScope: RoleScopeTier;
  societyId: number | null;
  schoolId: number | null;
  branchId: number | null;
  sessionId: number | null;
  financialSessionId: number | null;
  studentId: number | null;
  status?: string;
};

export type ActiveContext = {
  societyId?: number | null;
  schoolId?: number | null;
  branchId?: number | null;
  sessionId?: number | null;
  financialSessionId?: number | null;
  studentId?: number | null;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
  permissions: string[];
  redirectPath: string;
  activeContext: ActiveContext | null;
};

export type MeResponse = AuthUser & {
  permissions: string[];
};
