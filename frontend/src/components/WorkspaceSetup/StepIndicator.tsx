import React from 'react';
import { Progress } from '@/components/ui/progress';

export const StepIndicator: React.FC = () => {
  return (
    <div className="w-full bg-background border-b pt-20 pb-4 px-6 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold">Workspace Setup</h1>
            <p className="text-sm text-muted-foreground">Configure your environment to start tracking visibility.</p>
          </div>
          <span className="text-sm font-medium text-primary">Step 1 of 1</span>
        </div>
        <Progress value={100} className="h-1.5" />
      </div>
    </div>
  );
};