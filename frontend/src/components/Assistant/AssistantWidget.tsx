import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  assistantQuickPrompts,
  defaultQuickPrompts,
  findAnswer,
} from "@/data/assistant/knowledge-base";

interface Message {
  id: string;
  role: "assistant" | "user";
  text: string;
}

export interface AssistantWidgetHandle {
  open: () => void;
}

const WELCOME =
  "Hi, I'm the GapVisor assistant. I can walk you through the product, from setting up a workspace to reading your first inclusion rate. Ask me anything, or pick a suggestion below.";

let idSeq = 0;
const nextId = () => `msg-${++idSeq}`;

/**
 * Guided onboarding helper. Answers come from a fixed local knowledge base,
 * not a live model, so it stays accurate and works with no network call.
 */
export const AssistantWidget = forwardRef<AssistantWidgetHandle>((_props, ref) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: nextId(), role: "assistant", text: WELCOME },
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({ open: () => setOpen(true) }));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, open]);

  function ask(question: string) {
    if (!question.trim()) return;
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: question }]);
    setDraft("");
    setTyping(true);
    const answer = findAnswer(question);
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", text: answer }]);
      setTyping(false);
    }, 450);
  }

  const quickPrompts = assistantQuickPrompts[location.pathname] ?? defaultQuickPrompts;

  return (
    <>
      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon"
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </Button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden max-h-[70vh]">
          <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border bg-foreground text-background shrink-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm leading-tight truncate">GapVisor assistant</p>
              <p className="text-[11px] text-background/60 truncate">Guided answers, not a live model</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <p
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {m.text}
                </p>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 bg-secondary flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3 space-y-2 shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => ask(prompt)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                ask(draft);
              }}
            >
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask a question"
                className="h-9"
              />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!draft.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
});

AssistantWidget.displayName = "AssistantWidget";
