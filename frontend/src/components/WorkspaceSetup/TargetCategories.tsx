import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

import { suggestedCategories as SUGGESTED_CATEGORIES, defaults } from "@/data/workspace-setup";
interface TargetCategoriesProps {
  value?: string[];
  onChange?: (value: string[]) => void;
}

export const TargetCategories: React.FC<TargetCategoriesProps> = ({ value, onChange }) => {
  const [localCategories, setLocalCategories] = useState<string[]>(defaults.categories);
  const [inputValue, setInputValue] = useState("");
  const categories = value ?? localCategories;

  const updateCategories = (next: string[]) => {
    if (onChange) onChange(next);
    else setLocalCategories(next);
  };

  const addCategory = (cat: string) => {
    if (cat && !categories.includes(cat)) {
      updateCategories([...categories, cat]);
    }
    setInputValue("");
  };

  const removeCategory = (cat: string) => {
    updateCategories(categories.filter(c => c !== cat));
  };

  return (
    <div className="space-y-6 pt-6 border-t">
      <div>
        <h3 className="text-lg font-semibold mb-1">Target Categories</h3>
        <p className="text-sm text-muted-foreground mb-4">Select or add the categories and use-cases you want to track.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map(category => (
          <Badge key={category} variant="secondary" className="px-3 py-1 gap-1 text-sm font-medium">
            {category}
            <button onClick={() => removeCategory(category)} className="hover:text-destructive transition-colors">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Input 
          placeholder="Add custom category..." 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategory(inputValue)}
        />
        <Button variant="outline" size="icon" onClick={() => addCategory(inputValue)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suggested for you</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_CATEGORIES.filter(c => !categories.includes(c)).map(cat => (
            <button
              key={cat}
              onClick={() => addCategory(cat)}
              className="text-xs bg-muted/50 hover:bg-muted text-muted-foreground px-2 py-1 rounded-md transition-colors border border-transparent hover:border-border"
            >
              + {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};