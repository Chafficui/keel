import { createAuthClient } from "better-auth/react";

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
  baseURL: (import.meta.env["VITE_API_URL"] as string) || "",
});

export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const useSession: typeof authClient.useSession = authClient.useSession;
