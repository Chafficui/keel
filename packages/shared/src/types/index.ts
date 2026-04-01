export type { User, UserProfile, UpdateProfileInput } from "./user.js";

export type {
  SignupInput,
  LoginInput,
  PasswordResetRequestInput,
  PasswordResetInput,
  AuthResponse,
  SessionInfo,
} from "./auth.js";

export {
  CONSENT_TYPES,
  type ConsentType,
  type ConsentRecord,
  type ConsentInput,
} from "./consent.js";

export type {
  ApiResponse,
  PaginatedResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  HealthResponse,
  GetProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  ValidationErrorResponse,
  AuthErrorResponse,
  NotFoundResponse,
} from "./api.js";
