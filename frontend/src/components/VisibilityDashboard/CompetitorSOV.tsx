import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { competitorSov as competitors } from "@/data/visibility-dashboard";

export function CompetitorSOV() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Competitor Share of Voice</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {competitors.map((comp) => (
          <div key={comp.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 rounded-lg border">
                  <AvatarFallback className="text-[10px] font-bold">
                    {comp.name.substring(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <span className={`text-sm font-medium ${comp.name === 'Northstar' ? 'text-primary' : ''}`}>
                  {comp.name}
                </span>
              </div>
              <span className="text-sm font-semibold">{comp.share}%</span>
            </div>
            <Progress value={comp.share} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}