import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { frequencies as FREQUENCIES } from "@/data/workspace-setup";
interface MonitoringFrequencyProps {
  value?: string;
  onChange?: (value: string) => void;
}

export const MonitoringFrequency: React.FC<MonitoringFrequencyProps> = ({ value, onChange }) => {
  const [localSelected, setLocalSelected] = useState('weekly');
  const selected = value ?? localSelected;

  const updateSelected = (next: string) => {
    if (onChange) onChange(next);
    else setLocalSelected(next);
  };

  return (
    <div className="space-y-6 pt-6 border-t">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-semibold">Monitoring Frequency</h3>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-4">How often should we scan LLMs for your selected categories?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FREQUENCIES.map(freq => {
          const isSelected = selected === freq.id;
          return (
            <button
              key={freq.id}
              onClick={() => updateSelected(freq.id)}
              className={cn(
                "relative flex flex-col p-5 rounded-xl border-2 transition-all text-left h-full",
                isSelected 
                  ? "border-primary bg-primary/5 ring-1 ring-primary" 
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              {freq.recommended && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground border-none">
                  Recommended
                </Badge>
              )}
              
              <div className="flex justify-between items-start mb-3">
                <span className="font-bold text-lg">{freq.title}</span>
                {isSelected && <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>}
              </div>

              <div className="space-y-2 mt-auto">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Plan Tier</span>
                  <span className="text-foreground">{freq.plan}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="text-foreground">{freq.volume}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t mt-2">
                  {freq.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};