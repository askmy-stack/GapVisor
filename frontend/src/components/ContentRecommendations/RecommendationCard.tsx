import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

import type { Priority, Status } from "@/data/content-recommendations";

export type { Priority, Status };

interface RecommendationCardProps {
  priority: Priority;
  title: string;
  contentType: string;
  rationale: string;
  impact: string;
  tags: string[];
  status: Status;
  assignee?: {
    name: string;
    avatar?: string;
  };
}

const priorityColors: Record<Priority, string> = {
  Critical: "bg-destructive/10 text-destructive border-destructive/20",
  High: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Medium: "bg-primary/10 text-primary border-primary/20",
  Low: "bg-muted text-muted-foreground border-muted-foreground/20",
};

export function RecommendationCard({
  priority,
  title,
  contentType,
  rationale,
  impact,
  tags,
  status,
  assignee,
}: RecommendationCardProps) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="p-4 pb-2 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("font-semibold", priorityColors[priority])}>
                {priority}
              </Badge>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                {contentType}
              </Badge>
            </div>
            <h4 className="font-semibold text-lg leading-tight pt-1">{title}</h4>
          </div>
          <Select defaultValue={status}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Not Started">Not Started</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="In Review">In Review</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="flex gap-2 items-start text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <p>{rationale}</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center text-sm">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Impact</span>
            <span className="text-accent font-bold">{impact}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Affected Categories</span>
            <div className="flex gap-1 mt-0.5">
              {tags.map((tag) => (
                <span key={tag} className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-2 flex items-center justify-between border-t bg-muted/10">
        <div className="flex items-center gap-2">
          {assignee ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={assignee.avatar} />
                <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{assignee.name}</span>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground">
              <UserPlus className="h-3 w-3" /> Assign
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs">View Detail</Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" /> Mark Complete
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}