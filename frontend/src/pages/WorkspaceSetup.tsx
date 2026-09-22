import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createWorkspace, getAccessToken, probeApi, type WorkspaceCreatePayload } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { SetupHeader } from '@/components/WorkspaceSetup/SetupHeader';
import { StepIndicator } from '@/components/WorkspaceSetup/StepIndicator';
import { WorkspaceBasics } from '@/components/WorkspaceSetup/WorkspaceBasics';
import { TargetCategories } from '@/components/WorkspaceSetup/TargetCategories';
import { CompetitorTracker } from '@/components/WorkspaceSetup/CompetitorTracker';
import { RegionalFocus } from '@/components/WorkspaceSetup/RegionalFocus';
import { MonitoringFrequency } from '@/components/WorkspaceSetup/MonitoringFrequency';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { defaults } from '@/data/workspace-setup';

function domainFromWebsite(website: string) {
  const value = website.trim();
  if (!value) return [];

  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return [url.hostname.replace(/^www\./, "")];
  } catch {
    return [value.replace(/^https?:\/\//, "").replace(/^www\./, "")];
  }
}

const WorkspaceSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user, setWorkspaceId } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [categories, setCategories] = useState<string[]>(defaults.categories);
  const [competitors, setCompetitors] = useState<string[]>(defaults.competitors);
  const [regions, setRegions] = useState<string[]>(defaults.regions);
  const [frequency, setFrequency] = useState("weekly");
  const [launching, setLaunching] = useState(false);

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const live = await probeApi();
      if (!live) {
        navigate('/dashboard');
        return;
      }

      if (!user || !getAccessToken()) {
        toast.message("Sign in to create a live workspace.");
        navigate('/signin', { state: { from: '/workspace-setup' } });
        return;
      }

      const payload: WorkspaceCreatePayload = {
        name: companyName.trim() || "New Workspace",
        brand_name: companyName.trim() || "New Brand",
        brand_domains: domainFromWebsite(website),
        monitoring_frequency: frequency,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        competitors: competitors.map((name) => name.trim()).filter(Boolean),
        categories: Array.from(
          new Set([
            ...categories.map((name) => name.trim()).filter(Boolean),
            industry.trim(),
          ].filter(Boolean)),
        ),
        regions,
      };

      const workspace = await createWorkspace(payload);
      setWorkspaceId(workspace.id);
      toast.success("Workspace created.");
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create workspace";
      toast.error(message);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SetupHeader />
      
      <main className="flex-1 pb-12">
        <StepIndicator />
        
        <div className="max-w-4xl mx-auto px-6 mt-8">
          <Card className="border-border shadow-sm overflow-hidden">
            <CardContent className="p-8 space-y-10">
              <WorkspaceBasics
                companyName={companyName}
                website={website}
                industry={industry}
                onCompanyNameChange={setCompanyName}
                onWebsiteChange={setWebsite}
                onIndustryChange={setIndustry}
              />
              <TargetCategories value={categories} onChange={setCategories} />
              <CompetitorTracker value={competitors} onChange={setCompetitors} />
              <RegionalFocus value={regions} onChange={setRegions} />
              <MonitoringFrequency value={frequency} onChange={setFrequency} />
              
              <div className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 bg-card py-6 -mx-8 px-8 border-t">
                <Button variant="ghost" disabled className="text-muted-foreground flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
                  <p className="text-xs text-muted-foreground text-center sm:text-right">
                    You can always change these settings later <br className="hidden sm:block" /> from your workspace settings.
                  </p>
                  <Button 
                    onClick={handleLaunch} 
                    size="lg" 
                    disabled={launching}
                    className="w-full sm:w-auto h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {launching ? "Creating Workspace…" : "Create Workspace & Launch Dashboard"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Need help setting up? <button className="text-primary hover:underline font-medium">Contact our onboarding team</button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WorkspaceSetup;