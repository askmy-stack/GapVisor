import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

import {
  modelStatus as data,
  modelSparkline as mockSparkline,
} from "@/data/model-monitoring";

export function ModelStatusCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {data.map((model) => (
        <Card key={model.name} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">
                  {model.badge}
                </div>
                <span className="font-medium text-sm">{model.name}</span>
              </div>
              <Badge variant={model.status === "Healthy" ? "secondary" : "destructive"} className="h-5 px-1.5 text-[10px] uppercase font-bold bg-opacity-10 text-opacity-100">
                {model.status === "Healthy" ? (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                ) : (
                  <AlertCircle className="w-3 h-3 mr-1" />
                )}
                {model.status}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Brand Inclusion</p>
              <div className="flex items-end justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{model.inclusion}</span>
                  {model.trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                  {model.trend === "down" && <TrendingDown className="w-4 h-4 text-destructive" />}
                  {model.trend === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="w-16 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockSparkline}>
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={model.status === "Healthy" ? "hsl(var(--primary))" : "hsl(var(--destructive))"} 
                        strokeWidth={2} 
                        dot={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Last scan: {model.lastScan}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}