import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Sparkles } from "lucide-react";

import { recommendedNext as suggestions } from "@/data/experiments-impact";
export default function RecommendedNext() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Recommended Next Experiments</CardTitle>
        <Sparkles className="h-4 w-4 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((s) => (
            <div key={s.title} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">{s.title}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] py-0 h-4 border-accent/30 text-accent">
                    {s.impact} Impact
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-medium">{s.estimate}</span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                <Rocket className="h-3 w-3" /> Launch
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}