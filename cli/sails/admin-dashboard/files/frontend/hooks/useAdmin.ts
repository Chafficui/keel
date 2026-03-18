import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPatch, apiDelete } from "@/lib/api.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UsersResponse {
  users: AdminUser[];
  pagination: Pagination;
}

export interface UserDetailResponse {
  user: AdminUser;
  activeSessions: number;
}

export interface DashboardStats {
  totalUsers: number;
  newUsersWeek: number;
  newUsersMonth: number;
  activeSessions: number;
  signupsByDay: Array<{ date: string; count: number }>;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function fetchUsers(
  page = 1,
  search = "",
  limit = 20,
): Promise<UsersResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set("search", search);
  return apiGet<UsersResponse>(`/api/admin/users?${params.toString()}`);
}

export async function fetchUser(id: string): Promise<UserDetailResponse> {
  return apiGet<UserDetailResponse>(`/api/admin/users/${id}`);
}

export async function updateUser(
  id: string,
  data: { name?: string; emailVerified?: boolean },
): Promise<{ user: AdminUser }> {
  return apiPatch<{ user: AdminUser }>(`/api/admin/users/${id}`, data);
}

export async function deleteUser(
  id: string,
): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`/api/admin/users/${id}`);
}

export async function fetchStats(): Promise<DashboardStats> {
  return apiGet<DashboardStats>("/api/admin/stats");
}

// ---------------------------------------------------------------------------
// Hook: useAdminStats
// ---------------------------------------------------------------------------

export function useAdminStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load stats"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, isLoading, error, refetch: load };
}

// ---------------------------------------------------------------------------
// Hook: useAdminUsers
// ---------------------------------------------------------------------------

export function useAdminUsers(initialPage = 1, initialSearch = "") {
  const [usersData, setUsersData] = useState<UsersResponse | null>(null);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUsers(page, search);
      setUsersData(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load users"));
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    users: usersData?.users ?? [],
    pagination: usersData?.pagination ?? null,
    isLoading,
    error,
    page,
    search,
    setPage,
    setSearch,
    refetch: load,
  };
}
