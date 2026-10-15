export type UserRole = "user" | "admin";
export type UserStatus = "pending" | "active" | "suspended";

export type UserQuota = {
  id: string;
  user_id: string;
  package_name: string;
  monthly_token_limit: number;
  tokens_used: number;
  period_start: string;
};

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar: string;
  language: string;
  role: UserRole;
  status: UserStatus;
  quota?: UserQuota | null;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  token: string;
  expires_at: string;
  user: User;
};
