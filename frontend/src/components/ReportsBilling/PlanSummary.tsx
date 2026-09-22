import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Zap } from "lucide-react";

export function PlanSummary() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>You are currently on the Growth plan.</CardDescription>
        </div>
        <Zap className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div>
            <div className="text-2xl font-bold">Growth — $6,000/mo</div>
            <p className="text-xs text-muted-foreground mt-1">
              Billed monthly. Next invoice on December 1, 2024.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Manage Payment Method
            </Button>
            <Button size="sm">Upgrade Plan</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}