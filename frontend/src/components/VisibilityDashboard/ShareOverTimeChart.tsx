import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { badgeVariants } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
} from "recharts";

import { shareOverTime } from "@/data/visibility-dashboard";
import { SHARE_SERIES } from "@/components/VisibilityDashboard/dashboard-filters";
import { cn } from "@/lib/utils";

interface ShareOverTimeChartProps {
  rangeDays: number;
  visibleSeries: string[];
  onToggleSeries: (series: string) => void;
}

export function ShareOverTimeChart({ rangeDays, visibleSeries, onToggleSeries }: ShareOverTimeChartProps) {
  const data = shareOverTime.slice(-rangeDays);
  const hidden = (s: string) => !visibleSeries.includes(s);

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>AI Recommendation Share Over Time</CardTitle>
          <CardDescription>
            Visibility percentage across top monitored LLMs
            {rangeDays > shareOverTime.length && `. Sample data covers the last ${shareOverTime.length} days.`}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Show or hide brands">
          {SHARE_SERIES.map((series) => {
            const on = !hidden(series);
            return (
              <button
                key={series}
                type="button"
                onClick={() => onToggleSeries(series)}
                aria-pressed={on}
                disabled={on && visibleSeries.length === 1}
                className={cn(
                  badgeVariants({ variant: on ? "secondary" : "outline" }),
                  "cursor-pointer disabled:cursor-not-allowed",
                  !on && "text-muted-foreground line-through",
                )}
              >
                {series}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--foreground))"
                }}
                itemStyle={{ fontSize: "12px" }}
              />
              <Legend verticalAlign="top" align="right" height={36}/>
              <Line 
                type="monotone" 
                dataKey="Northstar" 
                hide={hidden("Northstar")}
                stroke="hsl(var(--primary))" 
                strokeWidth={3} 
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line type="monotone" dataKey="Kong" hide={hidden("Kong")} stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Postman" hide={hidden("Postman")} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Apigee" hide={hidden("Apigee")} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Tyk" hide={hidden("Tyk")} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}