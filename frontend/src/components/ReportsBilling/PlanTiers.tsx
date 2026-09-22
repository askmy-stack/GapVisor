import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { planTiers as plans } from "@/data/reports-billing";
export function PlanTiers() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Plan Tiers</h2>
        <p className="text-muted-foreground">Compare our available plans and find the right fit for your organization.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.name} className={cn("flex flex-col relative", plan.current && "border-primary shadow-md")}>
            {plan.current && (
              <div className="absolute top-0 right-0 transform translate-x-[-10%] translate-y-[-50%] bg-primary text-primary-foreground text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                Current
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              <div className="text-3xl font-bold">
                {plan.price}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </div>
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                variant={plan.current ? "secondary" : "default"} 
                className="w-full"
                disabled={plan.current}
              >
                {plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}