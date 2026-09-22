import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw, Calendar, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function MonitoringSchedule() {
  return (
    <Card className="bg-primary/[0.02] border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary mb-1">
          <ShieldCheck className="w-5 h-5" />
          <CardTitle className="text-base font-semibold">Monitoring Schedule & Coverage</CardTitle>
        </div>
        <CardDescription>
          Summary of current automated scan status and monitored surface area.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Frequency
              </span>
              <span className="font-semibold">Every 4 Hours</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Next Scan
              </span>
              <span className="font-semibold">In 1h 42m</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Prompt Coverage</span>
              <span className="font-medium">842 / 1,000</span>
            </div>
            <Progress value={84.2} className="h-2" />
          </div>

          <div className="flex flex-col justify-center items-end">
            <div className="text-right">
              <p className="text-2xl font-bold">12,504</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Runs (30d)</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-4 flex justify-between border-t border-primary/10">
        <p className="text-xs text-muted-foreground italic">
          Last system update: 12 minutes ago. All sensors reporting normal.
        </p>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" /> Configure Monitoring
        </Button>
      </CardFooter>
    </Card>
  );
}