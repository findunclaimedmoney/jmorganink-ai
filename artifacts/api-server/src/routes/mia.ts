import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import Stripe from "stripe";
import { db } from "@workspace/db";
import { prospectsTable } from "@workspace/db/schema";
import { ilike, and, or } from "drizzle-orm";
import { MiaChatBody } from "@workspace/api-zod";
import { MIA_SYSTEM_PROMPT, MIA_SEARCH_TOOL, MIA_LOOKUP_TOOL, getMiaFallback } from "../lib/mia-knowledge";
import { searchAllSources } from "../lib/multi-scraper";
import { loadMemory, saveMemory } from "../lib/mia-memory";

const router: IRouter = Router();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;
const hits = new Map<string, number[]>();

const SITE_BASE = process.env.REPLIT_DOMAINS
  ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
  : "https://missingcash.com.au";

function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    req.log.warn({ ip: key }, "Mia chat rate limit exceeded");
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
    return;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) hits.delete(k);
    }
  }
  next();
}

function fmtAUD(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

function parseAmountCents(amount: string | null): number {
  if (!amount) return 0;
  const m = amount.match(/[\d,]+(\.\d+)?/);
  if (!m) return 0;
  return Math.round(parseFloat(m[0].replace(/,/g, "")) * 100);
}

function calcFee(totalCents: number): { pct: number; feeCents: number; feeStr: string } {
  const dollars = totalCents / 100;
  const pct = dollars <= 1000 ? 5 : dollars <= 5000 ? 10 : dollars <= 30000 ? 15 : dollars <= 100000 ? 20 : 33;
  const feeCents = Math.max(Math.round(totalCents * pct / 100), 100);
  return { pct, feeCents, feeStr: fmtAUD(feeCents) };
}

// Search our internal scraped prospects DB by name
async function lookupProspects(
  firstName: string,
  lastName: string,
  stripeKey: string | undefined,
): Promise<string> {
  const rows = await db
    .select()
    .from(prospectsTable)
    .where(
      and(
        or(
          ilike(prospectsTable.name, `%${firstName}%`),
          ilike(prospectsTable.name, `%${firstName.toLowerCase()}%`),
        ),
        or(
          ilike(prospectsTable.name, `%${lastName}%`),
          ilike(prospectsTable.name, `%${lastName.toLowerCase()}%`),
        ),
      ),
    )
    .limit(5);

  if (rows.length === 0) {
    return `NO_MATCH: No records found in the MissingCash database for ${firstName} ${lastName}. Fall back to live search.`;
  }

  const lines: string[] = [];
  const checkoutLinks: string[] = [];

  for (const row of rows) {
    const amountCents = parseAmountCents(row.amount);
    const { pct, feeCents, feeStr } = calcFee(amountCents);
    const holder = row.holder ?? "Australian government register";
    const state = row.state ? ` (${row.state})` : "";

    let checkoutUrl = "";
    if (stripeKey && amountCents > 0) {
      try {
        const stripe = new Stripe(stripeKey);
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "aud",
                unit_amount: feeCents,
                product_data: {
                  name: `MissingCash Claim Report — ${row.name}`,
                  description: `${row.amount} held by ${holder}. ${pct}% claim fee. Includes step-by-step claim instructions.`,
                },
              },
            },
          ],
          metadata: { product: "mia-prospect-lookup", prospectId: String(row.id) },
          success_url: `${SITE_BASE}/claim-report?pid=${row.id}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${SITE_BASE}/claim-report?pid=${row.id}`,
        });
        checkoutUrl = session.url ?? "";
      } catch {
        checkoutUrl = "";
      }
    }

    lines.push(
      `MATCH: ${row.name} — ${row.amount ?? "amount on file"} held by ${holder}${state}. ` +
      `Fee: ${pct}% = ${feeStr}. ` +
      (checkoutUrl ? `Checkout URL: ${checkoutUrl}` : "No checkout URL generated."),
    );
    if (checkoutUrl) checkoutLinks.push(checkoutUrl);
  }

  return lines.join("\n");
}

function formatSearchResults(
  results: Awaited<ReturnType<typeof searchAllSources>>,
  firstName: string,
  lastName: string,
): string {
  const searched = results.sourceResults.filter((r) => r.scraped).map((r) => r.sourceName);
  const failed = results.sourceResults.filter((r) => !r.scraped).map((r) => r.sourceName);

  if (results.matches.length === 0) {
    return (
      `No matches found for ${firstName} ${lastName} across ${searched.length} databases.\n` +
      `Databases checked: ${searched.join(", ") || "none"}.\n` +
      (failed.length ? `Could not reach: ${failed.join(", ")}.\n` : "") +
      `Note: ATO (lost super, tax refunds) and myGov require a direct login — they don't appear in public registers. Always worth checking manually at ato.gov.au.`
    );
  }

  const lines = results.matches.map((m) => {
    const amount = m.amount || "amount on file";
    const location = m.state ? ` — ${m.state}` : "";
    const holder = m.holder ? ` held by ${m.holder}` : "";
    return `• ${m.name}: **${amount}**${holder}${location} (${m.source || m.sourceKey})`;
  });

  return (
    `Found ${results.matches.length} match${results.matches.length !== 1 ? "es" : ""} for ${firstName} ${lastName}:\n\n` +
    lines.join("\n") +
    `\n\nDatabases searched: ${searched.join(", ")}.` +
    (failed.length ? `\nCould not reach: ${failed.join(", ")}.` : "")
  );
}

const streamFallback = (res: Response, messages: { role: string; content: string }[], clientGone: () => boolean) => {
  if (clientGone() || res.writableEnded) return;
  const answer = getMiaFallback(messages);
  for (const word of answer.split(" ")) {
    if (clientGone()) return;
    res.write(`data: ${JSON.stringify({ content: word + " " })}\n\n`);
  }
  if (!clientGone()) {
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
};

router.post("/mia/chat", rateLimit, async (req, res): Promise<void> => {
  const parsed = MiaChatBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid Mia chat body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sessionId = ((req.body as Record<string, unknown>).sessionId as string | undefined) ?? "";

  // Load memories for this session (non-blocking if empty)
  const existingMemory = sessionId ? await loadMemory(sessionId) : "";

  // Build system prompt — inject memories if we have any
  const systemPrompt = existingMemory
    ? `${MIA_SYSTEM_PROMPT}\n\n---\n\n## What Mia remembers about this person\n${existingMemory}\n\nUse these memories naturally — greet them by name if known, reference past searches without being asked. Don't recite the list — just let it inform how you speak to them.`
    : MIA_SYSTEM_PROMPT;

  // After response finishes, fire-and-forget memory extraction
  if (sessionId) {
    res.on("finish", () => {
      void saveMemory(sessionId, parsed.data.messages, existingMemory);
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let gone = false;
  res.on("close", () => { if (!res.writableEnded) gone = true; });
  const clientGone = () => gone;

  const write = (content: string) => {
    if (!clientGone() && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  };

  const integrationBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const integrationKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const directKey = process.env.OPENAI_API_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  const useIntegration = !!(integrationBase && integrationKey);
  const useDirect = !useIntegration && !!directKey;

  if (!useIntegration && !useDirect) {
    req.log.info("No AI credentials — using Mia knowledge fallback");
    streamFallback(res, parsed.data.messages, clientGone);
    return;
  }

  try {
    const { default: OpenAI } = await import("openai");
    const openai = useIntegration
      ? new OpenAI({ baseURL: integrationBase, apiKey: integrationKey })
      : new OpenAI({ apiKey: directKey });

    const controller = new AbortController();
    res.on("close", () => controller.abort());

    const baseMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...parsed.data.messages,
    ];

    const firstResponse = await openai.chat.completions.create(
      {
        model: useIntegration ? "gpt-5.4" : "gpt-4o-mini",
        max_completion_tokens: 8192,
        messages: baseMessages,
        tools: [MIA_LOOKUP_TOOL, MIA_SEARCH_TOOL],
        tool_choice: "auto",
        stream: false,
      },
      { signal: controller.signal },
    );

    if (clientGone()) return;

    const choice = firstResponse.choices[0];

    if (choice?.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
      const call = choice.message.tool_calls[0]!;
      const callFn = "function" in call ? call.function : null;

      // ── TOOL: lookup_prospect_database ───────────────────────────────────
      if (callFn?.name === "lookup_prospect_database") {
        let args: { firstName?: string; lastName?: string } = {};
        try { args = JSON.parse(callFn.arguments) as typeof args; } catch { /* ignore */ }

        const firstName = args.firstName ?? "";
        const lastName = args.lastName ?? "";

        write(`🔍 Checking our database for **${firstName} ${lastName}**...\n\n`);
        req.log.info({ firstName, lastName }, "Mia triggered internal DB lookup");

        const toolContent = await lookupProspects(firstName, lastName, stripeKey);
        const isMatch = !toolContent.startsWith("NO_MATCH");

        req.log.info({ firstName, lastName, isMatch }, "Mia DB lookup complete");

        // Give Mia the result — she decides what to say based on system prompt
        const followUpMessages: { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: typeof choice.message.tool_calls }[] = [
          ...baseMessages,
          {
            role: "assistant" as const,
            content: null as unknown as string,
            tool_calls: [call],
          },
          {
            role: "tool" as const,
            tool_call_id: call.id,
            content: toolContent,
          },
        ];

        // If no match in DB, tell Mia to proceed with live search
        if (!isMatch) {
          write(`Let me run a live search now across 13 Australian databases...\n\n`);

          const liveResults = await searchAllSources({ firstName, lastName });
          if (clientGone()) return;

          const liveContent = formatSearchResults(liveResults, firstName, lastName);

          req.log.info(
            { firstName, lastName, matches: liveResults.matches.length },
            "Mia live search fallback complete",
          );

          followUpMessages.push({
            role: "tool" as const,
            tool_call_id: call.id + "_live",
            content: `Live search results: ${liveContent}`,
          });

          // Re-query AI with both results
          const liveFollowUp = await openai.chat.completions.create(
            {
              model: useIntegration ? "gpt-5.4" : "gpt-4o-mini",
              max_completion_tokens: 8192,
              messages: [
                ...baseMessages,
                { role: "assistant" as const, content: null as unknown as string, tool_calls: [call] },
                { role: "tool" as const, tool_call_id: call.id, content: toolContent },
                {
                  role: "user" as const,
                  content: `(system: DB returned no match. Live search results: ${liveContent}. Summarise for the user.)`,
                },
              ],
              stream: true,
            },
            { signal: controller.signal },
          );

          for await (const chunk of liveFollowUp) {
            if (clientGone()) break;
            const content = chunk.choices[0]?.delta?.content;
            if (content) write(content);
          }
        } else {
          // Match found — let Mia present it
          const matchStream = await openai.chat.completions.create(
            {
              model: useIntegration ? "gpt-5.4" : "gpt-4o-mini",
              max_completion_tokens: 8192,
              messages: [
                ...baseMessages,
                { role: "assistant" as const, content: null as unknown as string, tool_calls: [call] },
                { role: "tool" as const, tool_call_id: call.id, content: toolContent },
              ],
              stream: true,
            },
            { signal: controller.signal },
          );

          for await (const chunk of matchStream) {
            if (clientGone()) break;
            const content = chunk.choices[0]?.delta?.content;
            if (content) write(content);
          }
        }

        if (!clientGone()) {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
        }
        return;
      }

      // ── TOOL: search_unclaimed_money (direct call, no DB lookup first) ──
      if (callFn?.name === "search_unclaimed_money") {
        let args: { firstName?: string; lastName?: string; address?: string; dob?: string } = {};
        try { args = JSON.parse(callFn.arguments) as typeof args; } catch { /* ignore */ }

        const firstName = args.firstName ?? "";
        const lastName = args.lastName ?? "";

        write(`🔍 Searching 13 Australian databases for **${firstName} ${lastName}**...\n\n`);
        req.log.info({ firstName, lastName }, "Mia triggered live database search");

        const searchResults = await searchAllSources({
          firstName,
          lastName,
          address: args.address,
          dob: args.dob,
        });

        if (clientGone()) return;

        const toolContent = formatSearchResults(searchResults, firstName, lastName);
        req.log.info(
          { firstName, lastName, matches: searchResults.matches.length, sources: searchResults.totalScanned },
          "Mia live search complete",
        );

        const followUpStream = await openai.chat.completions.create(
          {
            model: useIntegration ? "gpt-5.4" : "gpt-4o-mini",
            max_completion_tokens: 8192,
            messages: [
              ...baseMessages,
              { role: "assistant" as const, content: null as unknown as string, tool_calls: [call] },
              { role: "tool" as const, tool_call_id: call.id, content: toolContent },
            ],
            stream: true,
          },
          { signal: controller.signal },
        );

        for await (const chunk of followUpStream) {
          if (clientGone()) break;
          const content = chunk.choices[0]?.delta?.content;
          if (content) write(content);
        }

        if (!clientGone()) {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
        }
        return;
      }
    }

    const directContent = choice?.message?.content;
    if (directContent) {
      for (const word of directContent.split(" ")) {
        if (clientGone()) break;
        write(word + " ");
      }
      if (!clientGone()) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
      return;
    }

    const fallbackStream = await openai.chat.completions.create(
      {
        model: useIntegration ? "gpt-5.4" : "gpt-4o-mini",
        max_completion_tokens: 8192,
        messages: baseMessages,
        stream: true,
      },
      { signal: controller.signal },
    );

    let streamedAny = false;
    for await (const chunk of fallbackStream) {
      if (clientGone()) break;
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        streamedAny = true;
        write(content);
      }
    }

    if (clientGone()) return;
    if (!streamedAny) {
      req.log.warn("AI returned empty stream, using fallback");
      streamFallback(res, parsed.data.messages, clientGone);
      return;
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    if (clientGone()) return;
    req.log.error({ err }, "Mia chat stream failed, using knowledge fallback");
    streamFallback(res, parsed.data.messages, clientGone);
  }
});

export default router;
