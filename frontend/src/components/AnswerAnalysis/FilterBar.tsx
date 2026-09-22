import { Search, Filter, Monitor } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { filterOptions } from "@/data/answer-analysis";
export function FilterBar() {
  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 border-b bg-card/50">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search prompts..." className="pl-9 h-9" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Select defaultValue="all-models">
          <SelectTrigger className="w-[140px] h-9">
            <Monitor className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.models.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue="all-categories">
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.categories.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select defaultValue="all-outcomes">
          <SelectTrigger className="w-[160px] h-9">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.outcomes.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}