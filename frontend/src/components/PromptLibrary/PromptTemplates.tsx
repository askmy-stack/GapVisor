import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowUpRight } from "lucide-react";

import { templates } from "@/data/prompt-library";

export default function PromptTemplates() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 py-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <CardTitle className="text-base font-semibold">Prompt Templates</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div
              key={template.title}
              className="group p-4 rounded-lg border bg-background hover:border-primary/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {template.tag}
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h4 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors">
                {template.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                {template.description}
              </p>
              <Button variant="outline" size="sm" className="w-full h-8 text-xs font-medium">
                Use template
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}