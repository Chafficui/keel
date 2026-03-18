import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import type { AdminUser, Pagination } from "@/hooks/useAdmin.js";

interface UsersTableProps {
  users: AdminUser[];
  pagination: Pagination | null;
  isLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
}

type SortField = "name" | "email" | "createdAt" | "emailVerified";
type SortDir = "asc" | "desc";

export default function UsersTable({
  users,
  pagination,
  isLoading,
  search,
  onSearchChange,
  onPageChange,
}: UsersTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField],
  );

  const sorted = [...users].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "email":
        cmp = a.email.localeCompare(b.email);
        break;
      case "createdAt":
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "emailVerified":
        cmp = Number(a.emailVerified) - Number(b.emailVerified);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="ml-1 inline h-3 w-3 text-keel-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return (
      <svg className="ml-1 inline h-3 w-3 text-keel-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={sortDir === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
        />
      </svg>
    );
  };

  return (
    <div className="rounded-xl border border-keel-gray-800 bg-keel-gray-900">
      {/* Search */}
      <div className="border-b border-keel-gray-800 p-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-keel-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-keel-gray-800 bg-keel-gray-950 py-2 pl-10 pr-4 text-sm text-white placeholder-keel-gray-400 focus:border-keel-blue focus:outline-none focus:ring-1 focus:ring-keel-blue"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-keel-gray-800 text-left text-xs font-medium uppercase tracking-wider text-keel-gray-400">
              <th
                className="cursor-pointer px-4 py-3 hover:text-keel-gray-200"
                onClick={() => handleSort("name")}
              >
                Name <SortIcon field="name" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 hover:text-keel-gray-200"
                onClick={() => handleSort("email")}
              >
                Email <SortIcon field="email" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 hover:text-keel-gray-200"
                onClick={() => handleSort("emailVerified")}
              >
                Verified <SortIcon field="emailVerified" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 hover:text-keel-gray-200"
                onClick={() => handleSort("createdAt")}
              >
                Created <SortIcon field="createdAt" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-keel-gray-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-keel-gray-800 border-t-keel-blue" />
                    <span className="text-sm text-keel-gray-400">Loading users...</span>
                  </div>
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-keel-gray-400">
                  No users found.
                </td>
              </tr>
            ) : (
              sorted.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  className="cursor-pointer transition-colors hover:bg-keel-gray-800/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-keel-blue/20 text-xs font-semibold text-keel-blue">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-white">
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-keel-gray-400">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    {user.emailVerified ? (
                      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-keel-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-keel-gray-800 px-4 py-3">
          <p className="text-sm text-keel-gray-400">
            Showing{" "}
            <span className="font-medium text-white">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-white">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-white">{pagination.total}</span>{" "}
            users
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg border border-keel-gray-800 px-3 py-1.5 text-sm text-keel-gray-400 transition-colors hover:border-keel-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-lg border border-keel-gray-800 px-3 py-1.5 text-sm text-keel-gray-400 transition-colors hover:border-keel-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
