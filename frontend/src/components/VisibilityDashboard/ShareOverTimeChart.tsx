import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

import { shareOverTime as data } from "@/data/visibility-dashboard";
import { aiModels } from "@/data/shared";

const MODELS = aiModels.filter((m) => m.id !== "buyer-agents").map((m) => m.name);

export function ShareOverTimeChart() {
  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>AI Recommendation Share Over Time</CardTitle>
          <CardDescription>Visibility percentage across top monitored LLMs</CardDescription>
        </div>
        <div className="flex flex-wrap gap-1">
          {MODELS.map((model) => (
            <Badge key={model} variant="outline" className="cursor-pointer hover:bg-accent">
              {model}
            </Badge>
          ))}
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
                stroke="hsl(var(--primary))" 
                strokeWidth={3} 
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line type="monotone" dataKey="Kong" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Postman" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Apigee" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Tyk" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}