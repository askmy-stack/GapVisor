import React, { useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import DashboardTopbar from "@/components/layout/DashboardTopbar";
import {
  Layers,
  ListFilter,
  Plus,
  Search,
  SortAsc
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { StatCard } from "@/components/ContentRecommendations/StatCard";
import { RecommendationCard } from "@/components/ContentRecommendations/RecommendationCard";
import { ContentGapMap } from "@/components/ContentRecommendations/ContentGapMap";
import {
  MissingDocumentation,
  CustomerEvidenceOpportunities,
  ReviewPlatformGaps
} from "@/components/ContentRecommendations/ActionableLists";

import {
  recommendations as RECOMMENDATIONS,
  stats as STATS,
  contentTypes as CONTENT_TYPES,
  statIcons,
} from "@/data/content-recommendations";

export default function ContentRecommendations() {
  const [activeTab, setActiveTab] = useState("All");

  const filteredRecommendations = RECOMMENDATIONS.filter(rec =>
    activeTab === "All" || rec.contentType === activeTab
  );

  return (
    <DashboardShell>
      <DashboardTopbar
        title="Content Recommendations"
        description="Prioritized content actions to improve AI recommendation share"
        actions={
          <Button size="sm" className="hidden sm:inline-flex gap-2">
            <Plus className="h-4 w-4" /> Request Content
          </Button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <StatCard
              key={i}
              title={stat.title}
              value={stat.value}
              description={stat.description}
              icon={statIcons[stat.id]}
              trend={stat.trend}
            />
          ))}
        </div>

        {/* Filter/Tab Bar */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <Tabs defaultValue="All" onValueChange={setActiveTab} className="w-full md:w-auto">
              <div className="overflow-x-auto no-scrollbar">
                <TabsList className="bg-secondary/50 p-1 h-auto flex-nowrap w-max">
                  {CONTENT_TYPES.map((type) => (
                    <TabsTrigger
                      key={type}
                      value={type}
                      className="px-4 py-1.5 text-xs font-medium data-[state=active]:bg-background"
                    >
                      {type}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search actions..." className="pl-9 h-9" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <ListFilter className="h-3 w-3 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="newest">
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <SortAsc className="h-3 w-3 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="impact">Highest Impact</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Recommendation List */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                Prioritized Actions
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {filteredRecommendations.length}
                </span>
              </h3>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Mark all as read
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredRecommendations.length > 0 ? (
                filteredRecommendations.map((rec, i) => (
                  <RecommendationCard key={i} {...rec} />
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/5">
                  <Layers className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No recommendations found for this filter.</p>
                  <Button variant="link" onClick={() => setActiveTab("All")}>Clear filters</Button>
                </div>
              )}
            </div>
          </div>

          {/* Secondary Column */}
          <div className="space-y-8">
            <ContentGapMap />
            <div className="space-y-6">
              <MissingDocumentation />
              <CustomerEvidenceOpportunities />
              <ReviewPlatformGaps />
            </div>
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}