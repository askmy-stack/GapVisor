import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

import {
  positionDistribution as distData,
  topSources,
  positionSliceColors,
} from "@/data/model-monitoring";

export function InsightsCards() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Position Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--muted))" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
                />
                <Tooltip 
                   cursor={{ fill: 'transparent' }}
                   contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: "12px"
                  }} 
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                  {distData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={positionSliceColors[entry.id]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Frequency of brand appearing in specific positions across all models
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Citation Sources This Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topSources.map((source) => (
              <div key={source.domain} className="flex items-center justify-between group">
                <div className="flex flex-col">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors cursor-pointer">{source.domain}</span>
                  <span className="text-xs text-muted-foreground">{source.count.toLocaleString()} citations</span>
                </div>
                <div className={`text-xs font-bold ${source.growth.startsWith('+') ? 'text-emerald-500' : 'text-destructive'}`}>
                  {source.growth}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total unique sources: 428</span>
              <span className="text-primary font-medium cursor-pointer hover:underline">View all sources</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}