import { Input } from "@/components/ui/input";
import { filterOptions } from "@/data/prompt-library";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, LayoutGrid, List } from "lucide-react";

export default function PromptFilters() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts by content or keywords..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 border rounded-md p-1 bg-background">
          <Button variant="ghost" size="icon" className="h-8 w-8 bg-muted">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select defaultValue="all-categories">
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.categories.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue="all-use-cases">
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Use-Case" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.useCases.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue="all-intents">
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Intent" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.intents.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue="all-regions">
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.regions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue="all-models">
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.models.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" className="h-9 gap-2 text-muted-foreground">
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      </div>
    </div>
  );
}