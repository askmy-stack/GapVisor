import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Users, Star, ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { downloadBlob, slugify } from "@/lib/download";

import {
  missingDocumentation as gaps,
  customerEvidence as opportunities,
  reviewPlatforms as platforms,
  recommendations,
} from "@/data/content-recommendations";

interface MissingDocumentationProps {
  onRequest: (title: string) => void;
  onViewAll: () => void;
}

export function MissingDocumentation({ onRequest, onViewAll }: MissingDocumentationProps) {
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onRequest(gap.title)}
              aria-label={`Request content for: ${gap.title}`}
              title="Request content for this gap"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="link" className="text-xs p-0 h-auto w-full justify-center" onClick={onViewAll}>
          View documentation actions
        </Button>
      </CardContent>
    </Card>
  );
}

function downloadBrief(title: string, tags: string[]) {
  const related = recommendations.filter(
    (r) => r.contentType === "Customer Evidence" || r.tags.some((t) => tags.includes(t)),
  );
  const lines = [
    `# Content brief: ${title}`,
    "",
    `Focus areas: ${tags.join(", ")}`,
    "",
    "## Goal",
    "Give AI models verifiable, citable evidence of real customer results in these areas.",
    "",
    "## Include",
    "- Customer profile: industry, size, and the problem they had",
    "- Measurable results with dates and the source of each number",
    "- A quote a buyer could repeat, attributed by name and role",
    "- Links to the supporting docs so models can cite them",
    "",
    "## Related prioritized actions",
    ...(related.length
      ? related.map((r) => `- ${r.title} (${r.priority}, ${r.impact})`)
      : ["- None yet"]),
    "",
  ];
  downloadBlob(`brief-${slugify(title)}.md`, lines.join("\n"), "text/markdown;charset=utf-8");
  toast.success("Brief downloaded", { description: `${title}: built from the sample data on this page.` });
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
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{opp.title}</p>
              <Button variant="outline" size="sm" className="h-7 text-[10px] shrink-0" onClick={() => downloadBrief(opp.title, opp.tags)}>
                Generate brief
              </Button>
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
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState(platforms[0]?.name ?? "G2");
  const [emails, setEmails] = useState("");
  const [message, setMessage] = useState(
    "Thanks for building with us. Would you share a short review of your experience?",
  );
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const list = emails
      .split(/[\s,;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    const invalid = list.filter((x) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
    if (list.length === 0) {
      setError("Add at least one customer email.");
      return;
    }
    if (invalid.length) {
      setError(`Check these addresses: ${invalid.join(", ")}`);
      return;
    }
    setOpen(false);
    setEmails("");
    setError(null);
    toast.success(`Demo mode: ${platform} review request for ${list.length} customer${list.length === 1 ? "" : "s"} saved locally.`, {
      description: "Emails send once the API is connected.",
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          Review Platform Gaps
        </CardTitle>
        <Button size="sm" className="h-8 px-2 text-xs" onClick={() => setOpen(true)}>Request reviews</Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Request reviews</DialogTitle>
              <DialogDescription>Ask customers to review you on a platform where you trail competitors.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="review-platform">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger id="review-platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="review-emails">Customer emails</Label>
                <Input
                  id="review-emails"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="ana@acme.com, lee@globex.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="review-message">Message</Label>
                <Textarea id="review-message" value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}