import { Card, CardContent } from "@/components/ui/card";
import { stats, statIcons } from "@/data/prompt-library";

export default function StatsStrip() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = statIcons[stat.id];
        return (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {stat.trend}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}