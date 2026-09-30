import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

import { performance } from "@/data/model-monitoring";

const MODEL_KEYS = ["chatgpt", "claude", "gemini", "perplexity", "ai-api-key"];

// Cross model average per day, used when model comparison is off.
const averaged = performance.map((row) => {
  const values = MODEL_KEYS.map((k) => Number(row[k as keyof typeof row])).filter((v) => !Number.isNaN(v));
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return { ...row, average: Math.round(avg * 10) / 10 };
});

export function PerformanceChart({ compare = true }: { compare?: boolean }) {
  const data = averaged;
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <CardTitle className="text-base font-semibold">
          {compare ? "Brand Inclusion Rate by Model Over Time" : "Average Brand Inclusion Rate Over Time"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--background))", 
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  fontSize: "12px"
                }} 
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ paddingBottom: "20px", fontSize: "12px" }}
              />
              {!compare && (
                <Line type="monotone" dataKey="average" name="All models (average)" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              )}
              <Line type="monotone" dataKey="chatgpt" hide={!compare} name="ChatGPT" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="claude" hide={!compare} name="Claude" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="gemini" hide={!compare} name="Gemini" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="perplexity" hide={!compare} name="Perplexity" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="ai-api-key" hide={!compare} name="AI API Key" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}