import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import {
  inclusion as inclusionData,
  sentiment as sentimentData,
} from "@/data/visibility-dashboard";

export function DetailCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand Inclusion Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inclusionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <YAxis 
                  hide
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sentiment Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-center h-[250px]">
          <div className="h-12 w-full mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={sentimentData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="category" hide />
                <Tooltip 
                   contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
                <Bar dataKey="positive" stackId="a" fill="#10b981" radius={[4, 0, 0, 4]} />
                <Bar dataKey="neutral" stackId="a" fill="#94a3b8" />
                <Bar dataKey="negative" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-emerald-500">65%</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Positive</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-slate-400">25%</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Neutral</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-red-500">10%</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Negative</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}