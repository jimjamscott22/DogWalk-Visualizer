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
import { toDisplayDistance, distanceUnitLabel, type UnitSystem } from "../lib/units";

interface WalkChartProps {
  data: DaySeriesPoint[];
  unitSystem?: UnitSystem;
}

export function mapDistanceForDisplay(
  data: DaySeriesPoint[],
  unitSystem: UnitSystem,
): (DaySeriesPoint & { distance_display: number })[] {
  return data.map((point) => ({
    ...point,
    distance_display: toDisplayDistance(point.distance_km, unitSystem),
  }));
}

export function WalkChart({ data, unitSystem = "us" }: WalkChartProps) {
  const hasActivity = data.some((d) => d.distance_km > 0 || d.walks > 0);
  const unitLabel = distanceUnitLabel(unitSystem);
  const displayData = mapDistanceForDisplay(data, unitSystem);

  if (!hasActivity) {
    return (
      <p className="flex h-40 items-center justify-center text-sm text-[var(--color-bark)]/60 sm:h-48">
        Log walks to see distance over the last two weeks.
      </p>
    );
  }

  return (
    <div className="h-44 w-full min-w-0 sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-trail)"
            strokeOpacity={0.45}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-soil)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-trail)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--color-soil)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            unit={` ${unitLabel}`}
          />
          <Tooltip
            cursor={{ fill: "var(--color-moss)", fillOpacity: 0.12 }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-trail)",
              background: "var(--color-panel)",
              color: "var(--color-bark)",
            }}
            formatter={(value) => [
              `${Number(value).toFixed(2)} ${unitLabel}`,
              "Distance",
            ]}
            labelFormatter={(_, payload) => {
              const point = payload?.[0]?.payload as
                | DaySeriesPoint
                | undefined;
              return point?.date ?? "";
            }}
          />
          <Bar
            dataKey="distance_display"
            fill="var(--color-moss)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
