// ---------------------------------------------------------------------------
// Generic API envelope
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Health — GET /api/health
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: "ok" | "error";
  db: "connected" | "disconnected";
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Profile — GET /api/profile
// ---------------------------------------------------------------------------

export interface GetProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

// ---------------------------------------------------------------------------
// Profile — PATCH /api/profile
// ---------------------------------------------------------------------------

export interface UpdateProfileRequest {
  name?: string;
  image?: string | null;
}

export interface UpdateProfileResponse {
  user: GetProfileResponse["user"];
}

// ---------------------------------------------------------------------------
// Profile — 400 validation error shape
// ---------------------------------------------------------------------------

export interface ValidationErrorResponse {
  error: {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
}

// ---------------------------------------------------------------------------
// Auth (BetterAuth handles these, but document the shapes)
// ---------------------------------------------------------------------------

export interface AuthErrorResponse {
  error: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------

export interface NotFoundResponse {
  error: "Not found";
}
