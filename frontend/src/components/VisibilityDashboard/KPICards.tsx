import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  change: number;
  trend: "up" | "down" | "neutral";
  sampleSize?: number;
  data: { value: number }[];
}

export function KPICard({ title, value, unit, change, trend, sampleSize, data }: KPICardProps) {
  const isPositive = trend === "up";
  const isNegative = trend === "down";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">
              {value}
              {unit}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {isPositive && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
              {isNegative && <ArrowDownRight className="h-4 w-4 text-red-500" />}
              {!isPositive && !isNegative && <Minus className="h-4 w-4 text-muted-foreground" />}
              <span className={`text-xs font-medium ${
                isPositive ? "text-emerald-500" : isNegative ? "text-red-500" : "text-muted-foreground"
              }`}>
                {change > 0 ? `+${change}%` : `${change}%`}
              </span>
            </div>
            {typeof sampleSize === "number" && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                n={sampleSize}
              </p>
            )}
          </div>
          <div className="h-[40px] w-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? "rgb(16, 185, 129)" : isNegative ? "rgb(239, 68, 68)" : "rgb(107, 114, 128)"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={isPositive ? "rgb(16, 185, 129)" : isNegative ? "rgb(239, 68, 68)" : "rgb(107, 114, 128)"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? "rgb(16, 185, 129)" : isNegative ? "rgb(239, 68, 68)" : "rgb(107, 114, 128)"}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#gradient-${title})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}