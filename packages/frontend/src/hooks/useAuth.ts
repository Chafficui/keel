import { useCallback } from "react";
import { useNavigate } from "react-router";
import { authClient, useSession } from "@/lib/auth-client";
import { isNative } from "@/lib/capacitor";
import { Preferences } from "@capacitor/preferences";

export function useAuth() {
  const { data: sessionData, isPending: isLoading } = useSession();
  const navigate = useNavigate();

  const user = sessionData?.user ?? null;
  const session = sessionData?.session ?? null;
  const isAuthenticated = !!user;

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        throw new Error(result.error.message ?? "Login failed");
      }

      if (isNative && result.data?.token) {
        await Preferences.set({
          key: "auth_token",
          value: result.data.token,
        });
      }

      return result.data;
    },
    // authClient, isNative, Preferences are module-level constants — safe to omit from deps
    [],
  );

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      const result = await authClient.signUp.email({ email, password, name });

      if (result.error) {
        throw new Error(result.error.message ?? "Signup failed");
      }

      if (isNative && result.data?.token) {
        await Preferences.set({
          key: "auth_token",
          value: result.data.token,
        });
      }

      return result.data;
    },
    // authClient, isNative, Preferences are module-level constants — safe to omit from deps
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch {
      // Always proceed with local cleanup even if signOut fails
    }

    if (isNative) {
      await Preferences.remove({ key: "auth_token" });
    }

    navigate("/login");
  }, [navigate]);

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
  };
}
