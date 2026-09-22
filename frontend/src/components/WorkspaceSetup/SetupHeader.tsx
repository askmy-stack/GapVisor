import React from 'react';
import { Button } from '@/components/ui/button';

export const SetupHeader: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b bg-background z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xl">V</span>
        </div>
        <span className="text-xl font-bold tracking-tight">GapVisor</span>
      </div>
      <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
        Save & Exit
      </Button>
    </header>
  );
};