import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";

import { aiModels } from "@/data/shared";
import { prompts as staticPrompts, type PromptIntent } from "@/data/prompt-library";

/** Model ids as stored on prompt rows, mapped to the shared model catalog. */
const promptModelIds: Record<string, string> = {
  chatgpt: "gpt",
  claude: "claude",
  gemini: "gemini",
  perplexity: "perp",
  "ai-api-key": "ai-api-key",
};

// Buyer AI Agents are monitored but not individually selectable when creating a prompt.
const trackableModels = aiModels
  .filter((m) => m.id !== "buyer-agents")
  .map((m) => ({ id: promptModelIds[m.id] ?? m.id, label: m.longName }));

const uniq = (values: string[]) => [...new Set(values)].sort();
const categoryOptions = uniq(staticPrompts.map((p) => p.category));
const useCaseOptions = uniq(staticPrompts.map((p) => p.useCase));
const intentOptions: PromptIntent[] = ["Awareness", "Comparison", "Evaluation", "Decision"];
const frequencyOptions = ["Daily", "Weekly", "Biweekly", "Manual"];

export interface PromptDraft {
  text: string;
  category: string;
  useCase: string;
  intent: PromptIntent;
  frequency: string;
  models: string[];
}

const emptyDraft: PromptDraft = {
  text: "",
  category: categoryOptions[0] ?? "",
  useCase: useCaseOptions[0] ?? "",
  intent: "Comparison",
  frequency: "Daily",
  models: trackableModels.map((m) => m.id),
};

interface CreatePromptDialogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Values to prefill, used for templates and editing. */
  initial?: Partial<PromptDraft>;
  mode?: "create" | "edit";
  onSave?: (draft: PromptDraft) => void | Promise<void>;
}

export default function CreatePromptDialog({
  children,
  open: openProp,
  onOpenChange,
  initial,
  mode = "create",
  onSave,
}: CreatePromptDialogProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  const [draft, setDraft] = useState<PromptDraft>({ ...emptyDraft, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time the dialog opens so templates and edits prefill cleanly.
  useEffect(() => {
    if (open) {
      setDraft({ ...emptyDraft, ...initial });
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const update = <K extends keyof PromptDraft>(key: K, value: PromptDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleModel = (id: string, checked: boolean) =>
    setDraft((d) => ({
      ...d,
      models: checked ? [...new Set([...d.models, id])] : d.models.filter((m) => m !== id),
    }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.text.trim()) {
      setError("Enter the prompt text.");
      return;
    }
    if (draft.models.length === 0) {
      setError("Pick at least one model to track.");
      return;
    }
    setSaving(true);
    try {
      await onSave?.({ ...draft, text: draft.text.trim() });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the prompt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {(children !== undefined || openProp === undefined) && (
        <DialogTrigger asChild>
          {children || (
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Create prompt
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? "Edit prompt" : "Create new prompt"}</DialogTitle>
            <DialogDescription>
              Add a prompt to track across AI models and analyze results over time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prompt-text">Prompt text</Label>
              <Textarea
                id="prompt-text"
                value={draft.text}
                onChange={(e) => update("text", e.target.value)}
                placeholder="e.g. Compare Stripe and Adyen for international payment processing"
                className="min-h-[100px]"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prompt-category">Category</Label>
                <Select value={draft.category} onValueChange={(v) => update("category", v)}>
                  <SelectTrigger id="prompt-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prompt-use-case">Use case</Label>
                <Select value={draft.useCase} onValueChange={(v) => update("useCase", v)}>
                  <SelectTrigger id="prompt-use-case">
                    <SelectValue placeholder="Select use case" />
                  </SelectTrigger>
                  <SelectContent>
                    {useCaseOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prompt-intent">Intent</Label>
                <Select value={draft.intent} onValueChange={(v) => update("intent", v as PromptIntent)}>
                  <SelectTrigger id="prompt-intent">
                    <SelectValue placeholder="Select intent" />
                  </SelectTrigger>
                  <SelectContent>
                    {intentOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prompt-frequency">Scheduling frequency</Label>
                <Select value={draft.frequency} onValueChange={(v) => update("frequency", v)}>
                  <SelectTrigger id="prompt-frequency">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3">
              <Label>Models to track</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/30">
                {trackableModels.map((model) => (
                  <div key={model.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`prompt-model-${model.id}`}
                      checked={draft.models.includes(model.id)}
                      onCheckedChange={(c) => toggleModel(model.id, c === true)}
                    />
                    <Label
                      htmlFor={`prompt-model-${model.id}`}
                      className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {model.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Save prompt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
