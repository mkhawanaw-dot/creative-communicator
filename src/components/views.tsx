import { useState, useRef, useEffect, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Check, Loader2, Wand2, Send, RotateCcw, Plus, Trash2, Bot, User } from "lucide-react";
import { toast } from "sonner";
import { runAi } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";

type Mode = "email" | "notes" | "research" | "planner" | "chat";
type Msg = { role: "user" | "assistant"; content: string };

function useAi() {
  const fn = useServerFn(runAi);
  const [loading, setLoading] = useState(false);
  const run = async (mode: Mode, messages: Msg[]) => {
    setLoading(true);
    try {
      const r = await fn({ data: { mode, messages } });
      if (!r.ok) { toast.error(r.error); return null; }
      return r.text;
    } catch {
      toast.error("Something went wrong. Please try again.");
      return null;
    } finally { setLoading(false); }
  };
  return { run, loading };
}

export function Header({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</label>;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <Wand2 className="mb-3 h-6 w-6 text-muted-foreground" />
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button variant="outline" size="sm" disabled={!text} onClick={async () => {
      await navigator.clipboard.writeText(text); setOk(true); toast.success("Copied to clipboard"); setTimeout(() => setOk(false), 1500);
    }}>
      {ok ? <Check /> : <Copy />} {ok ? "Copied" : "Copy"}
    </Button>
  );
}

function GenBtn({ loading, disabled, onClick, label = "Generate" }: { loading: boolean; disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <Button onClick={onClick} disabled={loading || disabled}>
      {loading ? <Loader2 className="animate-spin" /> : <Wand2 />} {loading ? "Generating…" : label}
    </Button>
  );
}

function parse<T>(t: string | null): T | null { if (!t) return null; try { return JSON.parse(t) as T; } catch { return null; } }

/* ---------- Email ---------- */
export function EmailView() {
  const { run, loading } = useAi();
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Formal");
  const [out, setOut] = useState("");
  const go = async () => {
    const t = await run("email", [{ role: "user", content: `Tone: ${tone}\nTopic / details: ${topic}` }]);
    if (t) setOut(t);
  };
  return (
    <>
      <Header title="Smart Email Generator" desc="Draft polished emails in seconds with the right tone." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel space-y-4 p-5">
          <div><Label>Subject / Topic</Label>
            <textarea className="field min-h-40" placeholder="e.g. Follow up with the client about the delayed Q3 report and propose a new date" value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
          <div><Label>Tone</Label>
            <select className="field" value={tone} onChange={(e) => setTone(e.target.value)}>
              {["Formal", "Friendly", "Persuasive", "Urgent"].map((t) => <option key={t}>{t}</option>)}
            </select></div>
          <GenBtn loading={loading} disabled={!topic.trim()} onClick={go} label="Generate email" />
        </div>
        <div className="panel p-5">
          <div className="mb-3 flex items-center justify-between"><Label>Generated email (editable)</Label><CopyBtn text={out} /></div>
          {out ? <textarea className="field min-h-80" value={out} onChange={(e) => setOut(e.target.value)} />
            : <Empty text="Describe your email topic and choose a tone to generate a draft." />}
        </div>
      </div>
    </>
  );
}

/* ---------- Editable list ---------- */
function EditableList({ items, setItems, check }: { items: string[]; setItems: (v: string[]) => void; check?: boolean }) {
  const [done, setDone] = useState<boolean[]>([]);
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="group flex items-start gap-2">
          {check ? <input type="checkbox" className="mt-2.5 h-4 w-4 accent-[var(--color-primary)]" checked={!!done[i]} onChange={(e) => { const d = [...done]; d[i] = e.target.checked; setDone(d); }} />
            : <span className="mt-3.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
          <input className={`field border-transparent bg-transparent py-1.5 hover:border-input ${done[i] ? "text-muted-foreground line-through" : ""}`} value={it}
            onChange={(e) => { const n = [...items]; n[i] = e.target.value; setItems(n); }} />
          <button aria-label="Remove" className="mt-2 opacity-0 transition group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
        </li>
      ))}
      {items.length === 0 && <li className="text-sm text-muted-foreground">None identified.</li>}
      <li><button className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary" onClick={() => setItems([...items, ""])}><Plus className="h-3.5 w-3.5" />Add item</button></li>
    </ul>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div className="panel p-5"><h3 className="mb-3 text-sm font-semibold">{title}</h3>{children}</div>;
}

/* ---------- Notes ---------- */
type Notes = { decisions: string[]; actions: string[]; deadlines: string[] };
export function NotesView() {
  const { run, loading } = useAi();
  const [raw, setRaw] = useState("");
  const [n, setN] = useState<Notes | null>(null);
  const go = async () => { const r = parse<Notes>(await run("notes", [{ role: "user", content: raw }])); if (r) setN(r); };
  const asText = n ? `Key Decisions\n${n.decisions.map((x) => "- " + x).join("\n")}\n\nAction Items\n${n.actions.map((x) => "[ ] " + x).join("\n")}\n\nDeadlines\n${n.deadlines.map((x) => "- " + x).join("\n")}` : "";
  return (
    <>
      <Header title="Meeting Notes Summarizer" desc="Turn messy notes into decisions, action items and deadlines." />
      <div className="panel space-y-4 p-5">
        <Label>Raw meeting notes</Label>
        <textarea className="field min-h-48" placeholder="Paste your meeting notes or transcript here…" value={raw} onChange={(e) => setRaw(e.target.value)} />
        <div className="flex gap-2"><GenBtn loading={loading} disabled={!raw.trim()} onClick={go} label="Summarize" />{n && <CopyBtn text={asText} />}</div>
      </div>
      <div className="mt-6">
        {n ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Section title="📌 Key Decisions"><EditableList items={n.decisions} setItems={(v) => setN({ ...n, decisions: v })} /></Section>
            <Section title="✅ Action Items"><EditableList check items={n.actions} setItems={(v) => setN({ ...n, actions: v })} /></Section>
            <Section title="📅 Deadlines"><EditableList items={n.deadlines} setItems={(v) => setN({ ...n, deadlines: v })} /></Section>
          </div>
        ) : <Empty text="Enter your notes above to generate a summary." />}
      </div>
    </>
  );
}

/* ---------- Planner ---------- */
type Task = { name: string; duration: string; priority: string };
type Slot = { time: string; task: string; priority: string; note: string };
const prioStyle: Record<string, string> = {
  High: "bg-destructive/10 text-destructive", Medium: "bg-warning/15 text-warning", Low: "bg-success/15 text-success", Break: "bg-muted text-muted-foreground",
};
export function PlannerView() {
  const { run, loading } = useAi();
  const [tasks, setTasks] = useState<Task[]>([{ name: "", duration: "60 min", priority: "High" }]);
  const [plan, setPlan] = useState<Slot[] | null>(null);
  const valid = tasks.filter((t) => t.name.trim());
  const go = async () => {
    const r = parse<{ schedule: Slot[] }>(await run("planner", [{ role: "user", content: valid.map((t) => `- ${t.name} | ${t.duration} | ${t.priority} priority`).join("\n") }]));
    if (r) setPlan(r.schedule);
  };
  const upd = (i: number, k: keyof Task, v: string) => setTasks(tasks.map((t, j) => (j === i ? { ...t, [k]: v } : t)));
  const updSlot = (i: number, k: keyof Slot, v: string) => plan && setPlan(plan.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  return (
    <>
      <Header title="AI Task Planner & Scheduler" desc="List your tasks and get a prioritized daily schedule." />
      <div className="panel space-y-3 p-5">
        <div className="hidden grid-cols-[1fr_120px_120px_32px] gap-2 sm:grid"><Label>Task</Label><Label>Duration</Label><Label>Priority</Label><span /></div>
        {tasks.map((t, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_120px_120px_32px]">
            <input className="field col-span-2 sm:col-span-1" placeholder="e.g. Prepare board presentation" value={t.name} onChange={(e) => upd(i, "name", e.target.value)} />
            <input className="field" value={t.duration} onChange={(e) => upd(i, "duration", e.target.value)} />
            <select className="field" value={t.priority} onChange={(e) => upd(i, "priority", e.target.value)}>{["High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}</select>
            <button aria-label="Remove task" className="hidden text-muted-foreground hover:text-destructive sm:block" onClick={() => setTasks(tasks.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" onClick={() => setTasks([...tasks, { name: "", duration: "30 min", priority: "Medium" }])}><Plus />Add task</Button>
          <GenBtn loading={loading} disabled={!valid.length} onClick={go} label="Build schedule" />
        </div>
      </div>
      <div className="mt-6">
        {plan ? (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Task</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Note</th></tr>
              </thead>
              <tbody>
                {plan.map((s, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="w-36 px-2 py-1.5"><input className="field border-transparent bg-transparent font-mono text-xs hover:border-input" value={s.time} onChange={(e) => updSlot(i, "time", e.target.value)} /></td>
                    <td className="px-2 py-1.5"><input className="field border-transparent bg-transparent font-medium hover:border-input" value={s.task} onChange={(e) => updSlot(i, "task", e.target.value)} /></td>
                    <td className="px-4 py-1.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${prioStyle[s.priority] ?? prioStyle['Break']}`}>{s.priority}</span></td>
                    <td className="px-2 py-1.5"><input className="field border-transparent bg-transparent text-muted-foreground hover:border-input" value={s.note} onChange={(e) => updSlot(i, "note", e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty text="Add your tasks above, then build a schedule to see your prioritized day." />}
      </div>
    </>
  );
}

/* ---------- Research ---------- */
type Research = { tldr: string; insights: string[]; nextSteps: string[] };
export function ResearchView() {
  const { run, loading } = useAi();
  const [src, setSrc] = useState("");
  const [r, setR] = useState<Research | null>(null);
  const go = async () => { const x = parse<Research>(await run("research", [{ role: "user", content: src }])); if (x) setR(x); };
  return (
    <>
      <Header title="AI Research Assistant" desc="Summarize a topic or article into insights and next steps." />
      <div className="panel space-y-4 p-5">
        <Label>Topic or article text</Label>
        <textarea className="field min-h-40" placeholder="e.g. The impact of hybrid work on team productivity — or paste an article…" value={src} onChange={(e) => setSrc(e.target.value)} />
        <GenBtn loading={loading} disabled={!src.trim()} onClick={go} label="Analyze" />
      </div>
      <div className="mt-6">
        {r ? (
          <div className="space-y-4">
            <Section title="TL;DR"><textarea className="field min-h-24" value={r.tldr} onChange={(e) => setR({ ...r, tldr: e.target.value })} /></Section>
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="💡 Key Insights"><EditableList items={r.insights} setItems={(v) => setR({ ...r, insights: v })} /></Section>
              <Section title="➡️ Suggested Next Steps"><EditableList items={r.nextSteps} setItems={(v) => setR({ ...r, nextSteps: v })} /></Section>
            </div>
          </div>
        ) : <Empty text="Enter a topic or paste an article above to generate research insights." />}
      </div>
    </>
  );
}

/* ---------- Chat ---------- */
export function ChatView() {
  const { run, loading } = useAi();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);
  const send = async (text = input) => {
    if (!text.trim() || loading) return;
    const next = [...msgs, { role: "user" as const, content: text.trim() }];
    setMsgs(next); setInput("");
    const t = await run("chat", next.slice(-20));
    if (t) setMsgs([...next, { role: "assistant", content: t }]);
  };
  const suggestions = ["How do I run an effective 1:1?", "Tips to reduce meeting overload", "Write a status update template"];
  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col md:h-[calc(100dvh-8rem)]">
      <div className="flex items-start justify-between">
        <Header title="Workplace AI Chatbot" desc="Ask anything about work, writing or productivity." />
        {msgs.length > 0 && <Button variant="ghost" size="sm" onClick={() => setMsgs([])}><RotateCcw />New chat</Button>}
      </div>
      <div className="panel flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {msgs.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Bot className="mb-3 h-8 w-8 text-primary" />
              <p className="mb-4 text-sm text-muted-foreground">Start a conversation by typing a message below.</p>
              <div className="flex flex-wrap justify-center gap-2">{suggestions.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border px-3 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground">{s}</button>)}</div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-secondary" : "bg-accent text-accent-foreground"}`}>{m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</div>
              {m.role === "user" ? <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.content}</div>
                : <textarea aria-label="Assistant reply (editable)" className="field max-w-[85%] resize-y" rows={Math.min(14, m.content.split("\n").length + 1)} value={m.content} onChange={(e) => setMsgs(msgs.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))} />}
            </div>
          ))}
          {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Thinking…</div>}
          <div ref={end} />
        </div>
        <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input className="field" placeholder="Type your message…" value={input} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Send"><Send /></Button>
        </form>
      </div>
    </div>
  );
}
