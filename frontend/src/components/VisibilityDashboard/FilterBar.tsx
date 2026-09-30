import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Filter, Download, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ALL_CATEGORIES,
  DASHBOARD_CATEGORIES,
  DASHBOARD_MODELS,
  RANGE_OPTIONS,
  type DashboardFilterState,
  type RangeDays,
} from "@/components/VisibilityDashboard/dashboard-filters";

interface FilterBarProps {
  value: DashboardFilterState;
  onChange: (next: DashboardFilterState) => void;
  onExport: () => void;
}

export function FilterBar({ value, onChange, onExport }: FilterBarProps) {
  const toggleModel = (model: string) => {
    const models = value.models.includes(model)
      ? value.models.filter((m) => m !== model)
      : [...value.models, model];
    onChange({ ...value, models });
  };

  const modelLabel =
    value.models.length === DASHBOARD_MODELS.length
      ? "All models"
      : value.models.length === 1
        ? value.models[0]
        : `Models (${value.models.length})`;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>Last {value.range} days</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Time range</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={String(value.range)}
              onValueChange={(v) => onChange({ ...value, range: Number(v) as RangeDays })}
            >
              {RANGE_OPTIONS.map((days) => (
                <DropdownMenuRadioItem key={days} value={String(days)}>
                  Last {days} days
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Filter className="h-4 w-4" />
              <span>{modelLabel}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter models</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DASHBOARD_MODELS.map((model) => (
              <DropdownMenuCheckboxItem
                key={model}
                checked={value.models.includes(model)}
                // Keep at least one model selected.
                disabled={value.models.length === 1 && value.models.includes(model)}
                onCheckedChange={() => toggleModel(model)}
                onSelect={(e) => e.preventDefault()}
              >
                {model}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <span>{value.category === ALL_CATEGORIES ? "All categories" : value.category}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Categories</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={value.category} onValueChange={(category) => onChange({ ...value, category })}>
              <DropdownMenuRadioItem value={ALL_CATEGORIES}>All categories</DropdownMenuRadioItem>
              {DASHBOARD_CATEGORIES.map((cat) => (
                <DropdownMenuRadioItem key={cat} value={cat}>
                  {cat}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Button size="sm" variant="secondary" className="h-9 gap-2" onClick={onExport} aria-label="Export report as CSV">
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export report</span>
      </Button>
    </div>
  );
}
