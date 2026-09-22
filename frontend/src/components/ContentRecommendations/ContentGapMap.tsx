import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, CircleDashed } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { gapMap } from "@/data/content-recommendations";
import type { GapStatus } from "@/data/content-recommendations";

const { categories, contentTypes, coverage: mockData } = gapMap;
type Status = GapStatus;

const getStatusIcon = (status: Status) => {
  switch (status) {
    case "covered":
      return <CheckCircle2 className="h-5 w-5 text-accent" />;
    case "partial":
      return <AlertCircle className="h-5 w-5 text-chart-3" />;
    case "missing":
      return <CircleDashed className="h-5 w-5 text-muted-foreground/30" />;
  }
};

const getStatusLabel = (status: Status) => {
  switch (status) {
    case "covered": return "Fully Covered";
    case "partial": return "Partial Content";
    case "missing": return "Missing Content";
  }
};

export function ContentGapMap() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Content Gap Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs font-semibold text-muted-foreground border-b bg-muted/20">Category</th>
                {contentTypes.map((type) => (
                  <th key={type} className="p-2 text-center text-xs font-semibold text-muted-foreground border-b bg-muted/20 min-w-[100px]">
                    {type}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat} className="border-b last:border-0">
                  <td className="p-2 text-sm font-medium whitespace-nowrap">{cat}</td>
                  {contentTypes.map((type) => {
                    const status = mockData[cat]?.[type] || "missing";
                    return (
                      <td key={type} className="p-2 text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="mx-auto block">
                              {getStatusIcon(status)}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{getStatusLabel(status)}: {cat} - {type}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 justify-center sm:justify-start">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {getStatusIcon("covered")} <span>Fully Covered</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {getStatusIcon("partial")} <span>Partial / Outdated</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {getStatusIcon("missing")} <span>Missing</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}