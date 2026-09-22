import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FileText, Users, Star, ArrowRight } from "lucide-react";

import {
  missingDocumentation as gaps,
  customerEvidence as opportunities,
  reviewPlatforms as platforms,
} from "@/data/content-recommendations";
export function MissingDocumentation() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Top Missing Documentation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {gaps.map((gap, i) => (
          <div key={i} className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-muted/5">
            <div className="space-y-1">
              <p className="text-sm font-medium">{gap.title}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] px-1 h-4">
                  {gap.severity}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{gap.impact}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="link" className="text-xs p-0 h-auto w-full justify-center">View all 12 gaps</Button>
      </CardContent>
    </Card>
  );
}

export function CustomerEvidenceOpportunities() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Customer Evidence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {opportunities.map((opp, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{opp.title}</p>
              <Button variant="outline" size="sm" className="h-7 text-[10px]">Generate Brief</Button>
            </div>
            <div className="flex gap-1">
              {opp.tags.map(tag => (
                <span key={tag} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full border border-accent/20">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ReviewPlatformGaps() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          Review Platform Gaps
        </CardTitle>
        <Button size="sm" className="h-8 px-2 text-xs">Request Reviews</Button>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {platforms.map((p) => (
          <div key={p.name} className="space-y-2">
            <div className="flex justify-between items-end">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{p.name}</p>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold tabular-nums">{p.count}</span>
                  <span className="text-xs text-muted-foreground">/ {p.competitor} reviews</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-accent">★ {p.rating}</span>
              </div>
            </div>
            <Progress value={(p.count / p.competitor) * 100} className="h-1.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}