import {
  Dialog,
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

// Buyer AI Agents are monitored but not individually selectable when creating a prompt.
const trackableModels = aiModels
  .filter((m) => m.id !== "buyer-agents")
  .map((m) => m.longName);

export default function CreatePromptDialog({ children }: { children?: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Prompt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Prompt</DialogTitle>
          <DialogDescription>
            Add a new prompt to track across different AI models and analyze results over time.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="prompt-text">Prompt Text</Label>
            <Textarea
              id="prompt-text"
              placeholder="e.g. Compare Stripe and Adyen for international payment processing..."
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fintech">Fintech</SelectItem>
                  <SelectItem value="dev-tools">Dev Tools</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Use-Case</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select use-case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="procurement">Procurement</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="strategic">Strategic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Intent</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select intent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="awareness">Awareness</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="evaluation">Evaluation</SelectItem>
                  <SelectItem value="decision">Decision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Scheduling Frequency</Label>
              <Select defaultValue="daily">
                <SelectTrigger>
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3">
            <Label>Models to Track</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border rounded-lg p-4 bg-muted/30">
              {trackableModels.map((model) => (
                <div key={model} className="flex items-center space-x-2">
                  <Checkbox id={model.toLowerCase().replace(/\s+/g, '-')} defaultChecked />
                  <Label
                    htmlFor={model.toLowerCase().replace(/\s+/g, '-')}
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {model}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button type="submit">Save Prompt</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}