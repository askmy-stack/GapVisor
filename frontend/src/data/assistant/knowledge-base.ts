/**
 * Local, offline answer set for the onboarding assistant. No network calls,
 * so it works identically in demo mode and against a live backend, and it
 * never invents a definition beyond what the product actually measures.
 */
export interface AssistantTopic {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
}

export const assistantTopics: AssistantTopic[] = [
  {
    id: "inclusion-rate",
    question: "What is brand inclusion rate?",
    keywords: ["inclusion", "inclusion rate"],
    answer:
      "Brand inclusion rate is the share of monitored prompts where a model's answer mentions your brand at all, whether or not it recommends you first. It is tracked per model, so ChatGPT and Claude can show different rates for the same prompt set.",
  },
  {
    id: "recommendation-share",
    question: "What is AI recommendation share?",
    keywords: ["recommendation share", "recommend"],
    answer:
      "Recommendation share is the share of monitored prompts where a model recommends your brand specifically, not just mentions it. It is a stricter measure than inclusion rate.",
  },
  {
    id: "share-of-voice",
    question: "What is share of voice?",
    keywords: ["share of voice", "sov"],
    answer:
      "Share of voice compares how often each tracked competitor, including you, gets mentioned across the same prompt set. It always adds up across the field, so a competitor's gain is visible as your relative loss even if your own numbers didn't drop.",
  },
  {
    id: "add-competitor",
    question: "How do I add a competitor?",
    keywords: ["competitor", "add competitor", "track competitor"],
    answer:
      "Open Competitor Intelligence from the sidebar and use Add Competitor, or add competitors during workspace setup. Each one you add gets its own inclusion rate and share of voice tracked alongside yours.",
  },
  {
    id: "api-key",
    question: "What does connecting an AI API key do?",
    keywords: ["api key", "connect api", "byo", "customer key"],
    answer:
      "Connecting your own API key lets GapVisor measure a model directly through your account instead of a shared sample, which is useful for models or rate limits that are specific to your plan with that provider.",
  },
  {
    id: "prompt-library",
    question: "How do prompt sets work?",
    keywords: ["prompt", "prompt library", "prompt set"],
    answer:
      "Prompt Library holds the questions GapVisor asks each model on your behalf, on a schedule. Use templates to start quickly, then edit wording so it matches how your actual buyers ask.",
  },
  {
    id: "scans",
    question: "How often does GapVisor scan the models?",
    keywords: ["scan", "schedule", "frequency", "how often"],
    answer:
      "Scan frequency is set per workspace: weekly, daily, or real time depending on your plan. You can see the schedule and the most recent runs under Model Monitoring.",
  },
  {
    id: "recommendations",
    question: "Where do content recommendations come from?",
    keywords: ["recommendation", "content gap", "evidence"],
    answer:
      "Content Recommendations only appear when there is a real, evidence-backed gap: a low inclusion rate on a specific model, tied to the actual monitored answers behind it. Each one shows its evidence strength and starts untested until an experiment confirms it.",
  },
  {
    id: "experiments",
    question: "How do experiments work?",
    keywords: ["experiment", "impact", "test"],
    answer:
      "An experiment measures one metric before and after a change, over a fixed window. The result is always supported, not supported, or inconclusive. Nothing gets called a win from a coincidence in timing alone.",
  },
  {
    id: "team",
    question: "How do I invite my team?",
    keywords: ["invite", "team", "seat", "member"],
    answer:
      "Go to Reports & Billing, then the Team Access tab, to invite teammates and set their role. Seats available depend on your current plan.",
  },
  {
    id: "billing",
    question: "How do I change my plan?",
    keywords: ["plan", "billing", "upgrade", "downgrade", "price", "pricing"],
    answer:
      "Reports & Billing shows your current plan, usage against its limits, and the other tiers available. Upgrading takes effect on your next billing cycle.",
  },
  {
    id: "demo-mode",
    question: "Why does it say demo mode?",
    keywords: ["demo", "demo mode", "offline"],
    answer:
      "Demo mode means the backend API wasn't reachable, so you're seeing static sample data instead of a live workspace. Start the API and sign back in to see your real numbers.",
  },
  {
    id: "what-is-gapvisor",
    question: "What does GapVisor do?",
    keywords: ["what is gapvisor", "about", "gapvisor"],
    answer:
      "GapVisor tracks how AI models like ChatGPT, Claude, Gemini, and Perplexity talk about your brand versus your competitors, so you can see and act on gaps in AI recommended visibility.",
  },
];

export const assistantQuickPrompts: Record<string, string[]> = {
  "/dashboard": ["What is brand inclusion rate?", "What is share of voice?"],
  "/prompts": ["How do prompt sets work?", "How often does GapVisor scan the models?"],
  "/monitoring": ["How often does GapVisor scan the models?"],
  "/answers": ["What is brand inclusion rate?"],
  "/competitors": ["How do I add a competitor?", "What is share of voice?"],
  "/recommendations": ["Where do content recommendations come from?"],
  "/experiments": ["How do experiments work?"],
  "/billing": ["How do I change my plan?", "How do I invite my team?"],
  "/workspace-setup": ["How do I add a competitor?", "What does GapVisor do?"],
};

export const defaultQuickPrompts = ["What does GapVisor do?", "What is brand inclusion rate?"];

export function findAnswer(input: string): string {
  const text = input.toLowerCase();
  let best: AssistantTopic | null = null;
  let bestScore = 0;
  for (const topic of assistantTopics) {
    const score = topic.keywords.reduce((acc, kw) => (text.includes(kw) ? acc + kw.length : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  if (best) return best.answer;
  return "I don't have a guided answer for that yet. Try asking about inclusion rate, share of voice, competitors, prompts, experiments, or billing, or check the page you're on for more detail.";
}
