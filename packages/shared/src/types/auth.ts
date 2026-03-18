import type { User } from "./user.js";

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface PasswordResetRequestInput {
  email: string;
}

export interface PasswordResetInput {
  token: string;
  newPassword: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
}
