import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
  RequestContentDialog,
  type ContentRequest,
} from "@/components/ContentRecommendations/RequestContentDialog";

import {
  recommendations as RECOMMENDATIONS,
  stats as STATS,
  contentTypes as CONTENT_TYPES,
  statIcons,
  type ContentRecommendation,
  type Priority,
  type Status,
} from "@/data/content-recommendations";

type Rec = ContentRecommendation & { id: string; unread: boolean };

const DEMO_NOTE = "Demo mode: saved for this session only.";
const priorityRank: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const impactValue = (impact: string) => parseFloat(impact.replace(/[^0-9.-]/g, "")) || 0;

export default function ContentRecommendations() {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState("newest");
  const [recs, setRecs] = useState<Rec[]>(() =>
    RECOMMENDATIONS.map((r, i) => ({ ...r, id: `rec-${i}`, unread: r.status === "Not Started" })),
  );
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestInitial, setRequestInitial] = useState<Partial<ContentRequest> | undefined>();
  const listRef = useRef<HTMLDivElement>(null);

  const filteredRecommendations = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = recs.filter(
      (rec) =>
        (activeTab === "All" || rec.contentType === activeTab) &&
        (priority === "all" || rec.priority.toLowerCase() === priority) &&
        (!q ||
          rec.title.toLowerCase().includes(q) ||
          rec.rationale.toLowerCase().includes(q) ||
          rec.tags.some((t) => t.toLowerCase().includes(q))),
    );
    if (sort === "impact") return [...rows].sort((a, b) => impactValue(b.impact) - impactValue(a.impact));
    if (sort === "priority") return [...rows].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
    return rows;
  }, [recs, activeTab, priority, search, sort]);

  const unreadCount = recs.filter((r) => r.unread).length;
  const hasFilters = activeTab !== "All" || priority !== "all" || search.trim() !== "";

  const updateRec = (id: string, patch: Partial<Rec>) =>
    setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, unread: false } : r)));

  function clearFilters() {
    setActiveTab("All");
    setPriority("all");
    setSearch("");
  }

  function openRequest(initial?: Partial<ContentRequest>) {
    setRequestInitial(initial);
    setRequestOpen(true);
  }

  function addRequest(req: ContentRequest) {
    const rec: Rec = {
      id: `rec-${Date.now()}`,
      priority: req.priority,
      title: req.title,
      contentType: req.contentType,
      rationale: req.notes || "Requested by your team.",
      impact: "Impact not estimated yet",
      tags: [],
      status: "Not Started",
      unread: true,
    };
    setRecs((prev) => [rec, ...prev]);
    clearFilters();
    toast.success("Content request added", { description: DEMO_NOTE });
  }

  function viewDocumentation() {
    setActiveTab("Documentation");
    setPriority("all");
    setSearch("");
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <DashboardShell>
      <DashboardTopbar
        title="Content Recommendations"
        description="Prioritized content actions to improve AI recommendation share"
        actions={
          <Button size="sm" className="hidden sm:inline-flex gap-2" onClick={() => openRequest()}>
            <Plus className="h-4 w-4" /> Request content
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
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
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search actions"
                  aria-label="Search actions"
                  className="pl-9 h-9"
                />
              </div>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-[130px] h-9 text-xs" aria-label="Priority">
                  <ListFilter className="h-3 w-3 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[140px] h-9 text-xs" aria-label="Sort">
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
          <div ref={listRef} className="xl:col-span-2 space-y-4 scroll-mt-24">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                Prioritized Actions
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {filteredRecommendations.length}
                </span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                disabled={unreadCount === 0}
                onClick={() => setRecs((prev) => prev.map((r) => ({ ...r, unread: false })))}
              >
                {unreadCount > 0 ? `Mark all as read (${unreadCount})` : "All read"}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredRecommendations.length > 0 ? (
                filteredRecommendations.map(({ id, unread, ...rec }) => (
                  <RecommendationCard
                    key={id}
                    {...rec}
                    unread={unread}
                    onStatusChange={(status: Status) => {
                      updateRec(id, { status });
                      toast(`Status set to ${status.toLowerCase()}`, { description: DEMO_NOTE });
                    }}
                    onAssign={(name) => {
                      updateRec(id, { assignee: name ? { name } : undefined });
                      toast(name ? `Assigned to ${name}` : "Unassigned", { description: DEMO_NOTE });
                    }}
                  />
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/5">
                  <Layers className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No recommendations found for this filter.</p>
                  {hasFilters && <Button variant="link" onClick={clearFilters}>Clear filters</Button>}
                </div>
              )}
            </div>
          </div>

          {/* Secondary Column */}
          <div className="space-y-8">
            <ContentGapMap />
            <div className="space-y-6">
              <MissingDocumentation
                onRequest={(title) => openRequest({ title, contentType: "Documentation", priority: "High" })}
                onViewAll={viewDocumentation}
              />
              <CustomerEvidenceOpportunities />
              <ReviewPlatformGaps />
            </div>
          </div>
        </div>
      </main>
      <RequestContentDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        initial={requestInitial}
        onSubmit={addRequest}
      />
    </DashboardShell>
  );
}