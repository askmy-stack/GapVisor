import type React from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  ShieldAlert,
  FileText,
  Lightbulb,
  Download,
  CheckSquare,
  ClipboardList
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { AnswerRecord } from "@/data/answer-analysis";

import { brandNames } from "@/data/shared";
interface AnswerDetailProps {
  record: AnswerRecord;
}

export function AnswerDetail({ record }: AnswerDetailProps) {
  const highlightText = (text: string) => {
    let highlighted = text;
    brandNames.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlighted = highlighted.replace(regex, '<span class="font-bold text-primary">$1</span>');
    });
    return highlighted;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Prompt Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4" /> Buyer Prompt
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{record.category}</Badge>
                <Badge variant="outline">{record.intent}</Badge>
                <Badge variant="outline">{record.region}</Badge>
                <Badge variant="secondary">{record.model}</Badge>
                <Badge variant="secondary" className="text-xs text-muted-foreground">{record.runDate}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm italic text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-md border border-border/50">
              "{record.prompt}"
            </p>
          </CardContent>
        </Card>

        {/* AI Answer Card */}
        <Card className="border-accent/20">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-accent" /> AI Answer
            </CardTitle>
            <Badge className={
              record.sentiment === "Positive" ? "bg-accent/10 text-accent hover:bg-accent/20 border-accent/20" :
              record.sentiment === "Negative" ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20" :
              "bg-muted text-muted-foreground"
            }>
              {record.sentiment} Sentiment
            </Badge>
          </CardHeader>
          <CardContent>
            <div
              className="text-sm leading-relaxed text-foreground/90 bg-primary/5 p-4 rounded-2xl rounded-tl-none border border-primary/10"
              dangerouslySetInnerHTML={{ __html: highlightText(record.aiAnswer) }}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Why This Outcome */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> Why This Outcome
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {record.reasoning.map((item, i) => (
                  <li key={i} className="flex gap-3 text-xs leading-snug">
                    {item.status === "positive" ? (
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                    ) : item.status === "negative" ? (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                    )}
                    <span>{item.factor}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Detected Inaccuracies */}
          <Card className="border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-4 w-4" /> Detected Inaccuracies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {record.inaccuracies.map((item, i) => (
                <div key={i} className="p-3 bg-destructive/5 rounded-md border border-destructive/10 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium">{item.claim}</p>
                    <Badge variant="outline" className={
                      item.severity === "High" ? "border-destructive text-destructive" :
                      item.severity === "Medium" ? "border-yellow-500 text-yellow-500" :
                      "border-muted-foreground text-muted-foreground"
                    }>
                      {item.severity}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] w-full">
                    Flag for correction
                  </Button>
                </div>
              ))}
              {record.inaccuracies.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No inaccuracies detected in this response.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cited Sources */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Cited Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {record.sources.map((source, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-2 hover:bg-muted/50 rounded-md transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center font-bold text-muted-foreground shrink-0 border border-border">
                      {source.domain[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{source.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{source.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px]">{source.authority}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export Answer
          </Button>
          <Button variant="outline" className="gap-2">
            <CheckSquare className="h-4 w-4" /> Mark Reviewed
          </Button>
          <Button className="gap-2">
            <PlusIcon className="h-4 w-4" /> Create Content Task
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}