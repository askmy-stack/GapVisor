import DashboardShell from "@/components/layout/DashboardShell";
import DashboardTopbar from "@/components/layout/DashboardTopbar";
import { PlanSummary } from "@/components/ReportsBilling/PlanSummary";
import { UsageLimits } from "@/components/ReportsBilling/UsageLimits";
import { PlanTiers } from "@/components/ReportsBilling/PlanTiers";
import { TeamAccess } from "@/components/ReportsBilling/TeamAccess";
import { InvoicesHistory } from "@/components/ReportsBilling/InvoicesHistory";
import { ComplianceSettings } from "@/components/ReportsBilling/ComplianceSettings";
import { ExecutiveReports } from "@/components/ReportsBilling/ExecutiveReports";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRef, useState } from "react";

export default function ReportsBilling() {
  const [tab, setTab] = useState("overview");
  const tabsRef = useRef<HTMLDivElement>(null);

  function showPlans() {
    setTab("overview");
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <DashboardShell>
      <DashboardTopbar
        title="Reports & Billing"
        description="Manage your plan, usage, team access, and exportable reports"
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <PlanSummary onUpgrade={showPlans} />
          </div>
          <div className="xl:col-span-1">
            <UsageLimits />
          </div>
        </div>

        <Tabs ref={tabsRef} value={tab} onValueChange={setTab} className="w-full space-y-6 scroll-mt-24">
          <TabsList className="bg-background border-b rounded-none h-12 w-full justify-start p-0 gap-6 overflow-x-auto overflow-y-hidden">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-semibold"
            >
              Overview & Plans
            </TabsTrigger>
            <TabsTrigger 
              value="team" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-semibold"
            >
              Team Access
            </TabsTrigger>
            <TabsTrigger 
              value="billing" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-semibold"
            >
              Billing History
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 font-semibold"
            >
              Reports & Compliance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 mt-0 outline-none">
            <PlanTiers />
          </TabsContent>

          <TabsContent value="team" className="mt-0 outline-none">
            <TeamAccess />
          </TabsContent>

          <TabsContent value="billing" className="mt-0 outline-none">
            <InvoicesHistory />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6 mt-0 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExecutiveReports />
              <ComplianceSettings />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </DashboardShell>
  );
}