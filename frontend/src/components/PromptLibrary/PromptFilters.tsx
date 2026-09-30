import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Prompt } from "@/data/prompt-library";
import {
  ALL,
  defaultPromptFilters,
  filterOptionsFor,
  isFiltered,
  promptModelLabels,
  type PromptFilterState,
} from "@/components/PromptLibrary/prompt-filters";

export type PromptView = "list" | "grid";

interface PromptFiltersProps {
  prompts: Prompt[];
  value: PromptFilterState;
  onChange: (next: PromptFilterState) => void;
  view: PromptView;
  onViewChange: (view: PromptView) => void;
}

export default function PromptFilters({ prompts, value, onChange, view, onViewChange }: PromptFiltersProps) {
  const options = filterOptionsFor(prompts);
  const set = (key: keyof PromptFilterState) => (v: string) => onChange({ ...value, [key]: v });

  const selects: {
    key: keyof PromptFilterState;
    label: string;
    allLabel: string;
    items: string[];
    format?: (v: string) => string;
    width: string;
  }[] = [
    { key: "category", label: "Category", allLabel: "All categories", items: options.categories, width: "w-[160px]" },
    { key: "useCase", label: "Use case", allLabel: "All use cases", items: options.useCases, width: "w-[180px]" },
    { key: "intent", label: "Intent", allLabel: "All intents", items: options.intents, width: "w-[150px]" },
    { key: "region", label: "Region", allLabel: "All regions", items: options.regions, width: "w-[150px]" },
    {
      key: "model",
      label: "Model",
      allLabel: "All models",
      items: options.models,
      format: (v) => promptModelLabels[v] ?? v,
      width: "w-[150px]",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={value.search}
            onChange={(e) => set("search")(e.target.value)}
            placeholder="Search prompts by content or keywords"
            aria-label="Search prompts"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 border rounded-md p-1 bg-background" role="group" aria-label="Layout">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", view === "list" && "bg-muted")}
            aria-label="List view"
            aria-pressed={view === "list"}
            onClick={() => onViewChange("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", view === "grid" && "bg-muted")}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            onClick={() => onViewChange("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {selects.map((s) => (
          <Select key={s.key} value={value[s.key]} onValueChange={set(s.key)}>
            <SelectTrigger className={cn(s.width, "h-9")} aria-label={s.label}>
              <SelectValue placeholder={s.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{s.allLabel}</SelectItem>
              {s.items.map((o) => (
                <SelectItem key={o} value={o}>{s.format ? s.format(o) : o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-2 text-muted-foreground"
          onClick={() => onChange(defaultPromptFilters)}
          disabled={!isFiltered(value)}
        >
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      </div>
    </div>
  );
}
