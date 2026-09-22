import { TrendingUp, Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { showcaseMetrics } from "@/data/sign-in";
export function ShowcasePanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between bg-sidebar-background p-12 text-sidebar-foreground relative overflow-hidden h-full">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-accent/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sidebar-accent border border-sidebar-border text-xs font-medium text-sidebar-primary">
            <Bot className="w-3.5 h-3.5" />
            AI Recommendation Intelligence
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight max-w-md">
            See exactly how ChatGPT, Claude, Gemini, and Perplexity recommend your software
          </h2>
          <p className="text-sidebar-foreground/70 text-lg max-w-sm">
            The first platform built for the era of AI-driven B2B software discovery.
          </p>
        </div>

        <div className="grid gap-4 mt-12">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-sidebar-accent/50 border border-sidebar-border backdrop-blur-sm max-w-md">
            <div className="p-2 rounded-lg bg-sidebar-primary/20 text-sidebar-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sidebar-foreground">80% of buyers</p>
              <p className="text-sm text-sidebar-foreground/60">
                Use AI chatbots for software shortlists before contacting sales — G2 2024 Report
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <Card className="bg-sidebar-accent border-sidebar-border overflow-hidden shadow-2xl translate-x-12">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-sidebar-foreground/60 uppercase">Visibility Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-sidebar-foreground">72.4</span>
                  <span className="text-sm font-medium text-accent">+12.5%</span>
                </div>
              </div>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-sidebar-accent bg-muted flex items-center justify-center overflow-hidden">
                    <img className="w-full h-full object-cover" src="https://storage.googleapis.com/uxpilot-auth.appspot.com/default-placeholder.png" />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-3">
              {showcaseMetrics.map((metric) => (
                <div key={metric.label} className="flex items-center justify-between p-2 rounded-lg bg-sidebar-background/40">
                  <span className="text-sm text-sidebar-foreground/70">{metric.label}</span>
                  <span className="text-sm font-semibold text-sidebar-foreground">{metric.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 h-24 w-full flex items-end gap-1.5">
              {[40, 25, 60, 45, 80, 55, 90, 70, 85, 100].map((h, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-sidebar-primary/40 rounded-t-sm animate-in slide-in-from-bottom duration-1000" 
                  style={{ height: `${h}%`, transitionDelay: `${i * 100}ms` }} 
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative z-10 flex items-center justify-between border-t border-sidebar-border pt-8 mt-12">
        <div className="flex items-center gap-6 opacity-40 grayscale contrast-200">
           {/* Mock logos */}
           <span className="text-xs font-bold tracking-tighter italic">CHARTMOGUL</span>
           <span className="text-xs font-bold tracking-tighter italic">INTERCOM</span>
           <span className="text-xs font-bold tracking-tighter italic">SEGMENT</span>
        </div>
      </div>
    </div>
  );
}