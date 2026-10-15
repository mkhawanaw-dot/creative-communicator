import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schemas: Record<string, object> = {
  notes: {
    type: "object",
    additionalProperties: false,
    required: ["decisions", "actions", "deadlines"],
    properties: {
      decisions: { type: "array", items: { type: "string" } },
      actions: { type: "array", items: { type: "string" } },
      deadlines: { type: "array", items: { type: "string" } },
    },
  },
  research: {
    type: "object",
    additionalProperties: false,
    required: ["tldr", "insights", "nextSteps"],
    properties: {
      tldr: { type: "string" },
      insights: { type: "array", items: { type: "string" } },
      nextSteps: { type: "array", items: { type: "string" } },
    },
  },
  planner: {
    type: "object",
    additionalProperties: false,
    required: ["schedule"],
    properties: {
      schedule: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["time", "task", "priority", "note"],
          properties: {
            time: { type: "string" },
            task: { type: "string" },
            priority: { type: "string", enum: ["High", "Medium", "Low", "Break"] },
            note: { type: "string" },
          },
        },
      },
    },
  },
};

const instructions: Record<string, string> = {
  email:
    "You write professional workplace emails. Return only the email: a 'Subject:' line, a blank line, then the body with greeting and sign-off ('[Your Name]'). No commentary.",
  notes:
    "Summarize raw meeting notes into key decisions, action items (include owner if known), and deadlines (include date). Be concise. Use empty arrays if none.",
  research:
    "You are a research assistant. Produce a 2-3 sentence TL;DR, 3-6 key insights, and 3-5 concrete suggested next steps.",
  planner:
    "You are a scheduling assistant. Build a realistic workday schedule starting 09:00 from the given tasks, ordering high-priority and deep-work first, adding short breaks and a lunch break. time format 'HH:MM–HH:MM'. note is a short tip.",
  chat: "You are a helpful, concise workplace productivity assistant. Use short paragraphs and markdown-free plain text with simple dashes for lists.",
};

const Input = z.object({
  mode: z.enum(["email", "notes", "research", "planner", "chat"]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000) }))
    .min(1)
    .max(40),
});

export const runAi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false as const, error: "AI is not configured." };
    const schema = schemas[data.mode];
    const body: Record<string, unknown> = {
      model: "openai/gpt-6-astra",
      instructions: instructions[data.mode],
      input: data.messages.map((m) => ({ role: m.role, content: m.content })),
      reasoning: { effort: "low" },
      store: false,
      stream: true,
    };
    if (schema) body.text = { format: { type: "json_schema", name: data.mode, strict: true, schema } };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      let msg = "The AI service returned an error.";
      try { msg = JSON.parse(t)?.error?.message ?? JSON.parse(t)?.message ?? msg; } catch {}
      if (res.status === 429) msg = "Too many requests — please wait a moment and try again.";
      if (res.status === 402) msg = "AI credits are exhausted. Please add credits to continue.";
      return { ok: false as const, error: msg };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    let failure = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const p = line.slice(5).trim();
        if (!p || p === "[DONE]") continue;
        try {
          const ev = JSON.parse(p);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          if (ev.type === "response.failed" || ev.type === "error")
            failure = ev.response?.error?.message ?? ev.message ?? "Generation failed.";
        } catch {}
      }
    }
    if (!text) return { ok: false as const, error: failure || "No response was generated." };
    return { ok: true as const, text };
  });
