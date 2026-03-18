import type { ReactNode } from "react";

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    label: string;
  };
}

export default function StatsCard({ icon, label, value, trend }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-keel-gray-800 bg-keel-gray-900 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-keel-blue/10 text-keel-blue">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-keel-gray-400">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={`text-sm font-medium ${
              trend.value >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}
          </span>
          <span className="text-xs text-keel-gray-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
