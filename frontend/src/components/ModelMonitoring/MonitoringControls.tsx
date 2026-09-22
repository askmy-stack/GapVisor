import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { filterOptions } from "@/data/model-monitoring";

export function MonitoringControls() {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card p-4 rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase px-1">Date Range</span>
          <Select defaultValue="7d">
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.dateRanges.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase px-1">Category</span>
          <Select defaultValue="all">
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.categories.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase px-1">Region</span>
          <Select defaultValue="global">
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Global" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.regions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-secondary/50 p-2 px-3 rounded-md border border-transparent hover:border-border transition-colors">
        <Switch id="compare-mode" />
        <Label htmlFor="compare-mode" className="text-sm font-medium cursor-pointer">Compare models</Label>
      </div>
    </div>
  );
}