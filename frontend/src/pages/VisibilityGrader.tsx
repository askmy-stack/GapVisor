import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type GraderResult = {
  brand_name: string;
  visibility_score: number;
  outcome: string;
  brand_position: number | null;
  sample_note: string;
  dimensions: Record<string, number>;
};

/** Public free grader — 003 GTM lead magnet (works against mock API). */
export default function VisibilityGrader() {
  const [brand, setBrand] = useState("");
  const [competitors, setCompetitors] = useState("Kong, Postman");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GraderResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/public/grader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brand,
          competitors: competitors
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error("Grader unavailable — start the API");
      setResult(await res.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Grader failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            GapVisor · Free diagnostic
          </p>
          <h1 className="text-3xl font-bold tracking-tight">AI Visibility Grader</h1>
          <p className="text-muted-foreground text-sm">
            One-shot score for how models talk about your brand. Not a
            statistically reliable sample — sign in for continuous monitoring.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Brand name</Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Northstar"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comps">Competitors (comma-separated)</Label>
            <Input
              id="comps"
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Scoring…" : "Get visibility score"}
          </Button>
        </form>
        {result && (
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-4xl font-bold">{result.visibility_score}</p>
            <p className="text-sm text-muted-foreground">
              Outcome: {result.outcome}
              {result.brand_position != null
                ? ` · position ${result.brand_position}`
                : ""}
            </p>
            <p className="text-xs text-muted-foreground">{result.sample_note}</p>
          </div>
        )}
        <p className="text-center text-sm">
          <Link to="/signin" className="text-primary hover:underline">
            Sign in for continuous monitoring
          </Link>
        </p>
      </div>
    </div>
  );
}
