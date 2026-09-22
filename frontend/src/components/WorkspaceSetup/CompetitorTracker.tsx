import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Globe } from 'lucide-react';

import { defaults } from "@/data/workspace-setup";
interface CompetitorTrackerProps {
  value?: string[];
  onChange?: (value: string[]) => void;
}

export const CompetitorTracker: React.FC<CompetitorTrackerProps> = ({ value, onChange }) => {
  const [localCompetitors, setLocalCompetitors] = useState<string[]>(defaults.competitors);
  const [inputValue, setInputValue] = useState("");
  const competitors = value ?? localCompetitors;

  const updateCompetitors = (next: string[]) => {
    if (onChange) onChange(next);
    else setLocalCompetitors(next);
  };

  const addCompetitor = () => {
    if (inputValue && !competitors.includes(inputValue)) {
      updateCompetitors([...competitors, inputValue]);
    }
    setInputValue("");
  };

  const removeCompetitor = (name: string) => {
    updateCompetitors(competitors.filter(c => c !== name));
  };

  return (
    <div className="space-y-6 pt-6 border-t">
      <div>
        <h3 className="text-lg font-semibold mb-1">Competitors to Track</h3>
        <p className="text-sm text-muted-foreground mb-4">Add your main competitors to benchmark your visibility against theirs.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {competitors.map(comp => (
          <div key={comp} className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
              <Globe className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium">{comp}</span>
            <button onClick={() => removeCompetitor(comp)} className="text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input 
          placeholder="Competitor name or domain (e.g. competitor.com)" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCompetitor()}
        />
        <Button onClick={addCompetitor} variant="secondary">
          Add Competitor
        </Button>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 flex items-start gap-3">
        <div className="mt-0.5">
          <Badge variant="outline" className="bg-background">Pro Tip</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Tracking at least 3 competitors provides better market share insights in your dashboard.
        </p>
      </div>
    </div>
  );
};