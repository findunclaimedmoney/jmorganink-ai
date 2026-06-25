import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { MiaChatBody } from "@workspace/api-zod";
import { MIA_SYSTEM_PROMPT, MIA_SEARCH_TOOL, getMiaFallback } from "../lib/mia-knowledge";
import { searchAllSources } from "../lib/multi-scraper";

const router: IRouter = Router();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;
const hits = new Map<string, number[]>();

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
      { role: "system", content: MIA_SYSTEM_PROMPT },
      ...parsed.data.messages,
    ];

    const firstResponse = await openai.chat.completions.create(
      {
        model: useIntegration ? "gpt-5.4" : "gpt-4o-mini",
        max_completion_tokens: 8192,
        messages: baseMessages,
        tools: [MIA_SEARCH_TOOL],
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
      if (callFn?.name === "search_unclaimed_money") {
        let args: { firstName?: string; lastName?: string; address?: string } = {};
        try { args = JSON.parse(callFn.arguments) as typeof args; } catch { /* ignore */ }

        const firstName = args.firstName ?? "";
        const lastName = args.lastName ?? "";

        write(`🔍 Searching 11 Australian databases for **${firstName} ${lastName}**...\n\n`);

        req.log.info({ firstName, lastName }, "Mia triggered live database search");

        const searchResults = await searchAllSources({
          firstName,
          lastName,
          address: args.address,
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
              {
                role: "assistant",
                content: null as unknown as string,
                tool_calls: [call],
              },
              {
                role: "tool" as const,
                tool_call_id: call.id,
                content: toolContent,
              },
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
