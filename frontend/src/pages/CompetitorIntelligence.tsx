import React, { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Filter, 
  ArrowRight, 
  CheckCircle2, 
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart as ReLineChart, 
  Line 
} from "recharts";

import DashboardShell from "@/components/layout/DashboardShell";
import DashboardTopbar from "@/components/layout/DashboardTopbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  kpis as kpiData,
  sovByCategory as sovByCategoryData,
  sovTrend as trendData,
  comparison as comparisonTable,
  strengths,
  rootCauses,
  rootCauseIcons,
} from "@/data/competitor-intelligence";
import { rivalCompetitors, competitorChartColors } from "@/data/shared";

// Competitor identity is shared data; each one's chart color is presentation.
const competitors = rivalCompetitors.map((c) => ({
  ...c,
  color: competitorChartColors[c.id],
}));
// --- Sub-components ---

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
        <p className="text-sm font-semibold mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}:</span>
              </div>
              <span className="font-medium">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function CompetitorIntelligence() {
  const [selectedCompetitors, setSelectedCompetitors] = useState(competitors.map(c => c.id));
  const [matchupComp, setMatchupComp] = useState("kong");

  const toggleCompetitor = (id: string) => {
    setSelectedCompetitors(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectedMatchup = competitors.find(c => c.id === matchupComp) || competitors[0];

  return (
    <DashboardShell>
      <DashboardTopbar 
        title="Competitor Intelligence" 
        description="Understand how and why competitors win AI recommendations"
      />
      
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* Competitor Selector Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {competitors.map((comp) => (
              <button
                key={comp.id}
                onClick={() => toggleCompetitor(comp.id)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                  selectedCompetitors.includes(comp.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-background/20 text-[10px] font-bold">
                  {comp.logo}
                </span>
                {comp.name}
              </button>
            ))}
            <Button variant="outline" size="sm" className="rounded-full border-dashed h-8 px-3">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add competitor
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden lg:inline">Filter by Category:</span>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px] h-9">
                <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="api-gateway">API Gateway</SelectItem>
                <SelectItem value="service-mesh">Service Mesh</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <div className={cn(
                    "flex items-center text-xs font-medium px-1.5 py-0.5 rounded-md",
                    kpi.trend === "up" ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                  )}>
                    {kpi.trend === "up" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {kpi.delta}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">{kpi.value}</h3>
                  {kpi.sub && <span className="text-xs text-muted-foreground italic">({kpi.sub})</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SOV by Category Chart */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Share of Voice by Category</CardTitle>
              <CardDescription>Brand vs Competitors market presence across product segments</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sovByCategoryData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="category" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-medium text-muted-foreground">{value === 'brand' ? 'Northstar' : value.charAt(0).toUpperCase() + value.slice(1)}</span>}
                  />
                  <Bar dataKey="brand" name="brand" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="kong" name="kong" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="postman" name="postman" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recommendation Frequency Line Chart */}
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-semibold">Recommendation Frequency Over Time</CardTitle>
                <CardDescription>Citation trends for top brands in AI model responses</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                 <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">Daily</Badge>
                 <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">Weekly</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }} 
                    iconType="plainline"
                    formatter={(value) => <span className="text-xs font-medium text-muted-foreground">{value === 'brand' ? 'Northstar' : value.charAt(0).toUpperCase() + value.slice(1)}</span>}
                  />
                  <Line type="monotone" dataKey="brand" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="kong" stroke="hsl(var(--chart-1))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="postman" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="apigee" stroke="hsl(var(--chart-3))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </ReLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Competitor Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Competitor Comparison Matrix</CardTitle>
            <CardDescription>Deep dive into performance metrics across all tracked competitors</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[200px]">Competitor</TableHead>
                    <TableHead className="text-right">Share of Voice %</TableHead>
                    <TableHead className="text-right">Avg. Position</TableHead>
                    <TableHead className="text-right">Positive Sentiment %</TableHead>
                    <TableHead className="text-right">Citation Count</TableHead>
                    <TableHead className="text-right">Categories Led</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonTable.map((row, i) => (
                    <TableRow 
                      key={i} 
                      className={cn(
                        row.isBrand && "bg-primary/5 border-l-4 border-l-primary"
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0",
                            row.isBrand ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            {row.name.charAt(0)}
                          </div>
                          {row.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.sov}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.pos}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="flex items-center justify-end gap-2">
                          <span className={cn(
                            "text-xs font-semibold px-1.5 py-0.5 rounded",
                            parseInt(row.sentiment) > 80 ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                          )}>
                            {row.sentiment}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.citations}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Badge variant={parseInt(row.lead) > 5 ? "default" : "secondary"}>{row.lead}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recurring Competitor Strengths */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Recurring Competitor Strengths</CardTitle>
              <CardDescription>Why AI models recommend your competitors over you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {strengths.map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 text-white" 
                    style={{ backgroundColor: competitorChartColors[item.id] }}
                  >
                    {item.logo}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{item.comp}</span>
                      <Badge variant="secondary" className="text-[10px] px-2 py-0">
                        {item.stat}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Root Causes Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Why Competitors Appear More Often</CardTitle>
              <CardDescription>Key visibility drivers identified</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {rootCauses.map((cause, i) => {
                  const CauseIcon = rootCauseIcons[cause.id];
                  return (
                  <li key={i} className="group">
                    <div className="flex gap-3">
                      <div className="mt-0.5 rounded-full bg-accent/10 p-1.5 text-accent shrink-0">
                        <CauseIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">{cause.text}</p>
                        <button className="flex items-center text-[10px] font-semibold text-muted-foreground hover:text-primary uppercase tracking-wider gap-1">
                          View related content gap <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
              <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-primary">Strategic Insight</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Increasing technical blog output focused on "Kubernetes Native" could close the gap with Kong by ~15% in 3 months.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Head-to-Head Matchups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Head-to-Head Matchups</CardTitle>
              <CardDescription>Direct comparison between Northstar and a selected competitor</CardDescription>
            </div>
            <Select value={matchupComp} onValueChange={setMatchupComp}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Competitor" />
              </SelectTrigger>
              <SelectContent>
                {competitors.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Brand Col */}
              <div className="flex flex-col items-center space-y-6 p-6 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <TrendingUp className="h-24 w-24 text-primary" />
                </div>
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/20">
                  N
                </div>
                <div className="text-center">
                  <h4 className="text-xl font-bold">Northstar</h4>
                  <p className="text-sm text-muted-foreground mt-1">Your Platform</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                  <div className="text-center p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">SOV</p>
                    <p className="text-lg font-bold">32.4%</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Sentiment</p>
                    <p className="text-lg font-bold">88%</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Avg Pos</p>
                    <p className="text-lg font-bold">1.4</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Citations</p>
                    <p className="text-lg font-bold">1.2k</p>
                  </div>
                </div>
              </div>

              {/* Competitor Col */}
              <div className="flex flex-col items-center space-y-6 p-6 rounded-2xl bg-muted/50 border border-border relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <TrendingDown className="h-24 w-24" />
                </div>
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                  style={{ backgroundColor: selectedMatchup.color }}
                >
                  {selectedMatchup.logo}
                </div>
                <div className="text-center">
                  <h4 className="text-xl font-bold">{selectedMatchup.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">Direct Competitor</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                  <div className="text-center p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">SOV</p>
                    <p className="text-lg font-bold">28.1%</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Sentiment</p>
                    <p className="text-lg font-bold">82%</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Avg Pos</p>
                    <p className="text-lg font-bold">1.8</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-background border border-border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Citations</p>
                    <p className="text-lg font-bold">980</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center">
              <Button className="gap-2 px-8">
                Generate Full Battlecard <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

      </main>
    </DashboardShell>
  );
}