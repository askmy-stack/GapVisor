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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { experiments } from "@/data/experiments-impact";

export interface ExperimentDraft {
  name: string;
  type: string;
  startDate: string;
}

const types = [...new Set(experiments.map((e) => e.type))];
const today = () => new Date().toISOString().slice(0, 10);

interface NewExperimentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<ExperimentDraft>;
  onSubmit: (draft: ExperimentDraft) => void;
}

export function NewExperimentDialog({ open, onOpenChange, initial, onSubmit }: NewExperimentDialogProps) {
  const [draft, setDraft] = useState<ExperimentDraft>({ name: "", type: types[0] ?? "Content", startDate: today() });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft({ name: "", type: types[0] ?? "Content", startDate: today(), ...initial });
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError("Name the experiment.");
      return;
    }
    onSubmit({ ...draft, name: draft.name.trim() });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New experiment</DialogTitle>
            <DialogDescription>
              Record a content change so GapVisor can compare recommendation share before and after it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="experiment-name">Name</Label>
              <Input
                id="experiment-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Published Tyk comparison page"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="experiment-type">Type</Label>
                <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}>
                  <SelectTrigger id="experiment-type">
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
                <Label htmlFor="experiment-start">Start date</Label>
                <Input
                  id="experiment-start"
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save experiment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
