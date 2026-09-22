import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Filter, Download, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

import { aiModels, categories } from "@/data/shared";

const MODELS = aiModels.filter((m) => m.id !== "buyer-agents").map((m) => m.name);
const CATEGORIES = categories.map((c) => c.label);

export function FilterBar() {
  const [selectedModels, setSelectedModels] = useState<string[]>(MODELS);

  const toggleModel = (model: string) => {
    setSelectedModels((current) =>
      current.includes(model)
        ? current.filter((m) => m !== model)
        : [...current, model]
    );
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>Last 30 Days</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Time Range</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={false}>Last 7 Days</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={true}>Last 30 Days</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false}>Last 90 Days</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Filter className="h-4 w-4" />
              <span>Models ({selectedModels.length})</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filter Models</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {MODELS.map((model) => (
              <DropdownMenuCheckboxItem
                key={model}
                checked={selectedModels.includes(model)}
                onCheckedChange={() => toggleModel(model)}
              >
                {model}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <span>All Categories</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Categories</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CATEGORIES.map((cat) => (
              <DropdownMenuCheckboxItem key={cat} checked={cat === "API Gateway"}>
                {cat}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Button size="sm" variant="secondary" className="h-9 gap-2">
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export Report</span>
      </Button>
    </div>
  );
}