import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

import { regions as REGIONS, defaults } from "@/data/workspace-setup";
interface RegionalFocusProps {
  value?: string[];
  onChange?: (value: string[]) => void;
}

export const RegionalFocus: React.FC<RegionalFocusProps> = ({ value, onChange }) => {
  const [localSelected, setLocalSelected] = useState<string[]>(defaults.regions);
  const selected = value ?? localSelected;

  const updateSelected = (next: string[]) => {
    if (onChange) onChange(next);
    else setLocalSelected(next);
  };

  const toggleRegion = (id: string) => {
    updateSelected(selected.includes(id) ? selected.filter(r => r !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-6 pt-6 border-t">
      <div>
        <h3 className="text-lg font-semibold mb-1">Countries/Regions</h3>
        <p className="text-sm text-muted-foreground mb-4">Select the regions where you want to monitor model responses.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {REGIONS.map(region => {
          const isSelected = selected.includes(region.id);
          return (
            <button
              key={region.id}
              onClick={() => toggleRegion(region.id)}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-all text-left",
                isSelected 
                  ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" 
                  : "border-border bg-card hover:bg-muted/50"
              )}
            >
              {region.name}
              {isSelected && <Check className="h-4 w-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};