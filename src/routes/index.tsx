import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, NotebookPen, CalendarClock, Search, MessagesSquare, Zap, ShieldCheck } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { EmailView, NotesView, PlannerView, ResearchView, ChatView } from "@/components/views";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Workplace Productivity Assistant" },
      { name: "description", content: "Generate emails, summarize meetings, plan your day, research topics and chat with an AI workplace assistant." },
      { property: "og:title", content: "AI Workplace Productivity Assistant" },
      { property: "og:description", content: "One AI hub for emails, meeting notes, scheduling, research and chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

const nav = [
  { id: "email", label: "Email Generator", short: "Email", icon: Mail, C: EmailView },
  { id: "notes", label: "Meeting Notes", short: "Notes", icon: NotebookPen, C: NotesView },
  { id: "planner", label: "Task Planner", short: "Planner", icon: CalendarClock, C: PlannerView },
  { id: "research", label: "Research Assistant", short: "Research", icon: Search, C: ResearchView },
  { id: "chat", label: "AI Chatbot", short: "Chat", icon: MessagesSquare, C: ChatView },
] as const;

function App() {
  const [view, setView] = useState<(typeof nav)[number]["id"]>("email");
  const active = nav.find((n) => n.id === view)!;
  const Logo = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Zap className="h-4 w-4" /></div>
      <div className="leading-tight"><div className="text-sm font-semibold">Workplace AI</div><div className="text-[11px] text-muted-foreground">Productivity Assistant</div></div>
    </div>
  );
  return (
    <div className="flex min-h-dvh w-full">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="border-b border-sidebar-border px-5 py-4">{Logo}</div>
        <nav className="flex-1 space-y-1 p-3">
          <div className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tools</div>
          {nav.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition ${view === n.id ? "bg-sidebar-accent font-medium text-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60"}`}>
              <n.icon className="h-4 w-4" />{n.label}
            </button>
          ))}
        </nav>
        <div className="m-3 rounded-lg border bg-card p-3 text-xs text-muted-foreground"><ShieldCheck className="mb-1 h-4 w-4 text-primary" />All outputs are editable — review before sending.</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-10 flex items-center border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">{Logo}</header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-8">
          <active.C key={active.id} />
        </main>
        <footer className="border-t px-4 py-3 pb-20 text-center text-xs text-muted-foreground md:pb-3">
          <span className="font-medium">Responsible AI Disclaimer:</span> AI-generated content should be reviewed for accuracy and bias before professional use.
        </footer>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-card md:hidden">
        {nav.map((n) => (
          <button key={n.id} onClick={() => setView(n.id)} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${view === n.id ? "text-primary" : "text-muted-foreground"}`}>
            <n.icon className="h-5 w-5" />{n.short}
          </button>
        ))}
      </nav>
      <Toaster />
    </div>
  );
}
