import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DaySeriesPoint } from "../lib/stats";

interface WalkChartProps {
  data: DaySeriesPoint[];
}

export function WalkChart({ data }: WalkChartProps) {
  const hasActivity = data.some((d) => d.distance_km > 0 || d.walks > 0);

  if (!hasActivity) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-[var(--color-bark)]/60">
        Log walks to see distance over the last two weeks.
      </p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,165,116,0.45)" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#3d2c1e", fontSize: 11 }}
            axisLine={{ stroke: "#c4a574" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#3d2c1e", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
            unit=" km"
          />
          <Tooltip
            cursor={{ fill: "rgba(107,143,107,0.12)" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid rgba(196,165,116,0.5)",
              background: "rgba(255,255,255,0.95)",
            }}
            formatter={(value) => [`${value} km`, "Distance"]}
            labelFormatter={(_, payload) => {
              const point = payload?.[0]?.payload as DaySeriesPoint | undefined;
              return point?.date ?? "";
            }}
          />
          <Bar dataKey="distance_km" fill="#4a6b4a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
