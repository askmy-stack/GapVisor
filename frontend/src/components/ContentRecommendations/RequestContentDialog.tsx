import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { contentTypes, type Priority } from "@/data/content-recommendations";

export interface ContentRequest {
  title: string;
  contentType: string;
  priority: Priority;
  notes: string;
}

const types = contentTypes.filter((t) => t !== "All");
const priorities: Priority[] = ["Critical", "High", "Medium", "Low"];

interface RequestContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<ContentRequest>;
  onSubmit: (request: ContentRequest) => void;
}

export function RequestContentDialog({ open, onOpenChange, initial, onSubmit }: RequestContentDialogProps) {
  const blank: ContentRequest = { title: "", contentType: types[0] ?? "Documentation", priority: "Medium", notes: "" };
  const [draft, setDraft] = useState<ContentRequest>({ ...blank, ...initial });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft({ ...blank, ...initial });
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) {
      setError("Give the request a title.");
      return;
    }
    onSubmit({ ...draft, title: draft.title.trim(), notes: draft.notes.trim() });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Request content</DialogTitle>
            <DialogDescription>Add a content action to the prioritized list.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="request-title">Title</Label>
              <Input
                id="request-title"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Publish a migration guide from Kong"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="request-type">Content type</Label>
                <Select value={draft.contentType} onValueChange={(v) => setDraft((d) => ({ ...d, contentType: v }))}>
                  <SelectTrigger id="request-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="request-priority">Priority</Label>
                <Select
                  value={draft.priority}
                  onValueChange={(v) => setDraft((d) => ({ ...d, priority: v as Priority }))}
                >
                  <SelectTrigger id="request-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="request-notes">Why it matters</Label>
              <Textarea
                id="request-notes"
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="What gap does this close for AI answers?"
              />
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Add request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
