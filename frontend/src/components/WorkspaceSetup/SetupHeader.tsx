import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/Logo';
import { useAuth } from '@/auth/AuthProvider';

export const SetupHeader: React.FC = () => {
  const navigate = useNavigate();
  const { user, liveApi } = useAuth();

  // Setup answers live only on this page, so leaving does not save them.
  // Signed in (or demo mode) goes to the dashboard; otherwise back to sign in.
  const exit = () => navigate(user || !liveApi ? '/dashboard' : '/signin');

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b bg-background z-50 flex items-center justify-between px-6">
      <Logo size="sm" />
      <Button
        variant="ghost"
        className="text-muted-foreground hover:text-foreground"
        onClick={exit}
        title="Your answers on this page are not saved"
      >
        Exit setup
      </Button>
    </header>
  );
};
