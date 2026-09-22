import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Play,
  Copy,
  Edit,
  Trash2,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { prompts as mockPrompts } from "@/data/prompt-library";
import type { Prompt } from "@/data/prompt-library";

const modelIcons: Record<string, string> = {
  gpt: "https://api.dicebear.com/7.x/initials/svg?seed=CG&backgroundColor=10a37f",
  claude: "https://api.dicebear.com/7.x/initials/svg?seed=CL&backgroundColor=d97757",
  gemini: "https://api.dicebear.com/7.x/initials/svg?seed=GM&backgroundColor=4285f4",
  perp: "https://api.dicebear.com/7.x/initials/svg?seed=PX&backgroundColor=202124",
  copilot: "https://api.dicebear.com/7.x/initials/svg?seed=AK&backgroundColor=00a4ef",
};

const intentColors: Record<string, string> = {
  Awareness: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Comparison: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Evaluation: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Decision: "bg-green-500/10 text-green-500 border-green-500/20",
};

interface PromptTableProps {
  prompts?: Prompt[];
  onRunPrompt?: (prompt: Prompt) => void;
  runningPromptId?: string | null;
}

export default function PromptTable({
  prompts = mockPrompts,
  onRunPrompt,
  runningPromptId,
}: PromptTableProps) {
  return (
    <div className="rounded-md border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px] sticky left-0 bg-card z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Prompt</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Use-Case</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Models</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Mentions %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prompts.map((prompt) => (
              <TableRow key={prompt.id}>
                <TableCell className="font-medium sticky left-0 bg-card z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-2 group">
                    <span className="truncate max-w-[240px] block">{prompt.text}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100">
                            <Info className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          {prompt.text}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal bg-secondary/50">
                    {prompt.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {prompt.useCase}
                </TableCell>
                <TableCell>
                  <Badge className={`font-normal border ${intentColors[prompt.intent]}`} variant="outline">
                    {prompt.intent}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{prompt.region}</TableCell>
                <TableCell>
                  <div className="flex -space-x-2">
                    {prompt.models.map((model) => (
                      <div
                        key={model}
                        className="h-6 w-6 rounded-full border-2 border-background bg-muted overflow-hidden"
                      >
                        <img src={modelIcons[model]} alt={model} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">
                  {prompt.lastRun}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${prompt.brandMention}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums">{prompt.brandMention}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Switch checked={prompt.status === "Active"} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuItem
                        className="gap-2"
                        disabled={!onRunPrompt || runningPromptId === prompt.id}
                        onClick={() => onRunPrompt?.(prompt)}
                      >
                        <Play className="h-4 w-4" />
                        {runningPromptId === prompt.id ? "Running…" : "Run Scan"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2">
                        <Edit className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2">
                        <Copy className="h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="p-4 border-t flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {prompts.length} of {prompts.length === mockPrompts.length ? 142 : prompts.length} prompts
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  );
}