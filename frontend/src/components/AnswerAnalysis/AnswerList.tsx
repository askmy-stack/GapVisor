import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { AnswerRecord } from "@/data/answer-analysis";
export type { AnswerRecord };

interface AnswerListProps {
  records: AnswerRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function AnswerList({ records, selectedId, onSelect }: AnswerListProps) {
  const getOutcomeIcon = (outcome: AnswerRecord["outcome"]) => {
    switch (outcome) {
      case "recommended":
        return <CheckCircle2 className="h-4 w-4 text-accent" />;
      case "not-recommended":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "negative":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {records.map((record) => (
          <button
            key={record.id}
            onClick={() => onSelect(record.id)}
            className={cn(
              "flex flex-col gap-2 p-4 text-left border-b transition-colors hover:bg-muted/50",
              selectedId === record.id ? "bg-accent/5 border-l-2 border-l-accent" : "border-l-2 border-l-transparent"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                {record.model}
              </Badge>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {record.timestamp}
              </div>
            </div>
            
            <p className="text-sm font-medium line-clamp-2 text-foreground/90">
              {record.promptSnippet}
            </p>

            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                {getOutcomeIcon(record.outcome)}
                <span className="text-xs font-medium capitalize text-muted-foreground">
                  {record.outcome.replace("-", " ")}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                Pos: {record.brandPosition}
              </span>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}