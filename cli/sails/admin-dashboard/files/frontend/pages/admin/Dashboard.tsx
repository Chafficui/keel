import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StatsCard from "@/components/admin/StatsCard.js";
import UsersTable from "@/components/admin/UsersTable.js";
import { useAdminStats, useAdminUsers } from "@/hooks/useAdmin.js";

export default function AdminDashboard() {
  const { stats, isLoading: statsLoading } = useAdminStats();
  const {
    users,
    pagination,
    isLoading: usersLoading,
    search,
    setSearch,
    setPage,
  } = useAdminUsers();

  // Fill in missing days for the chart (last 30 days)
  const chartData = useMemo(() => {
    if (!stats?.signupsByDay) return [];

    const map = new Map<string, number>();
    for (const entry of stats.signupsByDay) {
      map.set(entry.date, entry.count);
    }

    const days: Array<{ date: string; signups: number }> = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, signups: map.get(key) ?? 0 });
    }

    return days;
  }, [stats?.signupsByDay]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-keel-gray-400">
          User management and application metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          label="Total Users"
          value={statsLoading ? "..." : (stats?.totalUsers ?? 0)}
        />
        <StatsCard
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
          label="New This Week"
          value={statsLoading ? "..." : (stats?.newUsersWeek ?? 0)}
          trend={
            stats
              ? { value: stats.newUsersWeek, label: "last 7 days" }
              : undefined
          }
        />
        <StatsCard
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          label="New This Month"
          value={statsLoading ? "..." : (stats?.newUsersMonth ?? 0)}
          trend={
            stats
              ? { value: stats.newUsersMonth, label: "last 30 days" }
              : undefined
          }
        />
        <StatsCard
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9.172 15.828a4 4 0 010-5.656m5.656 0a4 4 0 010 5.656M12 12h.01" />
            </svg>
          }
          label="Active Sessions"
          value={statsLoading ? "..." : (stats?.activeSessions ?? 0)}
        />
      </div>

      {/* Signups Chart */}
      <div className="mb-8 rounded-xl border border-keel-gray-800 bg-keel-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          User Signups (Last 30 Days)
        </h2>
        {statsLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-keel-gray-800 border-t-keel-blue" />
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(val: string) => {
                    const d = new Date(val);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a2e",
                    border: "1px solid #2a2a3e",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "13px",
                  }}
                  labelFormatter={(label: string) => {
                    return new Date(label).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#3b82f6" }}
                  activeDot={{ r: 5, fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Users</h2>
        <UsersTable
          users={users}
          pagination={pagination}
          isLoading={usersLoading}
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
