import { db } from "@workspace/db";
import { miaMemoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export async function loadMemory(sessionId: string): Promise<string> {
  try {
    const [row] = await db
      .select()
      .from(miaMemoriesTable)
      .where(eq(miaMemoriesTable.sessionId, sessionId))
      .limit(1);
    return row?.memories ?? "";
  } catch (err) {
    logger.warn({ err }, "mia-memory: failed to load");
    return "";
  }
}

export async function saveMemory(
  sessionId: string,
  messages: { role: string; content: string }[],
  existingMemory: string,
): Promise<void> {
  const integrationBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const integrationKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const directKey = process.env.OPENAI_API_KEY;
  const useIntegration = !!(integrationBase && integrationKey);
  const useDirect = !useIntegration && !!directKey;
  if (!useIntegration && !useDirect) return;

  try {
    const { default: OpenAI } = await import("openai");
    const openai = useIntegration
      ? new OpenAI({ baseURL: integrationBase, apiKey: integrationKey })
      : new OpenAI({ apiKey: directKey });

    const conversationText = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m) => `${m.role === "user" ? "User" : "Mia"}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You extract key facts about a user from their conversation with Mia, an AI assistant for MissingCash.
Return a concise bullet list of facts worth remembering for future conversations. Include any of:
- Full name (if given)
- Email address (if given)
- State or suburb (if given)  
- What they were searching for (unclaimed money? finance?)
- What money was found (amount, holder)
- Finance interest (loan type, amount, vehicle)
- Personal context (e.g. deceased estate, recently changed name, old addresses)
- Preferred way to be addressed

If existing memories are provided, merge and update — keep old facts unless the user corrected them.
Return ONLY the bullet list, max 300 words. Each line starts with "- ".
If nothing meaningful was shared, return the existing memories unchanged.`;

    const userContent = existingMemory
      ? `Existing memories:\n${existingMemory}\n\nNew conversation:\n${conversationText}\n\nReturn the updated memory list.`
      : `Conversation:\n${conversationText}\n\nExtract key facts worth remembering.`;

    const response = await openai.chat.completions.create({
      model: useIntegration ? "gpt-5.4" : "gpt-4o-mini",
      max_completion_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      stream: false,
    });

    const extracted = response.choices[0]?.message?.content?.trim() ?? "";
    if (!extracted) return;

    const emailMatch = extracted.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch?.[0] ?? null;

    await db
      .insert(miaMemoriesTable)
      .values({ sessionId, email, memories: extracted, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: miaMemoriesTable.sessionId,
        set: {
          memories: extracted,
          ...(email ? { email } : {}),
          updatedAt: new Date(),
        },
      });

    logger.info({ sessionId }, "mia-memory: saved");
  } catch (err) {
    logger.warn({ err }, "mia-memory: failed to save");
  }
}
