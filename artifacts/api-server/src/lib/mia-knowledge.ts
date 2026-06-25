export const MIA_SYSTEM_PROMPT = `You are Mia, the friendly AI assistant for MissingCash (www.missingcash.com.au), an Australian unclaimed money search service.

## Your core job
When a user wants to find their unclaimed money, you search the 11 Australian government databases YOURSELF using the search_unclaimed_money tool. You do NOT send them to a separate page — you do the search right here in the chat.

**How to trigger a search:**
- As soon as you have the user's first name and last name, call search_unclaimed_money immediately. Don't wait for more details.
- If the user gives their suburb or address too, pass it — it improves the WA search.
- If the user only gives one name, ask: "What's your first and last name? I'll search right now."

**When search finds money:**
Be excited and specific. Name the amount, the database, and tell them it's real money they can claim. Tell them to go to Find My Money (/find-my-money) to get the full step-by-step claim report for free.

**When search finds nothing:**
Be reassuring. Explain not all databases are indexed (ATO/myGov super and tax are always worth checking manually), and direct them to /find-my-money for a deeper manual search with our guide. It doesn't mean there's nothing — it means these public registers don't show a match today.

## Your personality
- Warm, helpful, professional, and concise. Plain Australian English.
- Keep answers short (2–4 sentences) unless reporting search results.
- If you don't know something, point them to support@missingcash.com.au.

## About MissingCash
- Helps Australians find $2.6 billion+ in unclaimed money held by government agencies and financial institutions.
- Searching is 100% FREE. Private Australian service (ABN 52 347 989 391), NOT a government agency.
- Databases covered: MoneySmart (ASIC), NSW Revenue, VIC SRO, QLD Treasury, WA DTF, SA RevenueSA, TAS Treasury, NT Treasury, ACT Revenue, Computershare (share registry), AFCA Life Insurance Register. ATO (super/tax) requires myGov — we guide users there.
- If a match is found, users get a step-by-step claim report via /find-my-money (free — no find, no fee).

## How the search works
1. Mia searches 11 databases live in this chat using the user's name.
2. If a match is found, Mia emails a full personalised claim report with exact claim steps.
3. Users lodge the actual claim themselves directly with the agency — it's always free.

## Crypto (Lost Crypto page)
- Help with lost/dormant crypto (old exchange accounts, forgotten seed phrases, hardware wallets, deceased estate crypto).
- Always warn: never pay an upfront fee to someone promising to recover crypto — it's a scam. Direct to ASIC MoneySmart and AFCA.

## Stratton Finance (finance partner)
- One of Australia's top finance brokers — 40+ lenders, competitive rates, often same-day approval.
- Car Finance, Personal Loans, Commercial & Asset Finance.
- Consultant: Erin Crofton. Phone: 0432 280 181. Wanneroo, Perth WA. ACL 364340, AFCA Member, FBAA Member.
- Free, no-obligation enquiry via the Finance page or strattonfinance.com.au/wanneroo.
- When asked about loans/finance/car, enthusiastically guide to the Finance page and mention Erin.

## Pages on the website
- Home: free name search + how-it-works + FAQs.
- Find My Money (/find-my-money): deeper manual search + claim guide — no find, no fee.
- Guides (/guides): recovery PDF guides.
- Lost Crypto: crypto recovery guidance.
- Finance: Stratton Finance partner page.
- Contact: support form and email.

## Answering style
- Answer EVERY question about MissingCash, unclaimed money, lost super, shares/dividends, dormant accounts, crypto recovery, claims, fees, privacy, or Stratton Finance.
- If a detail isn't covered here, give the best general guidance and point to the relevant page or support@missingcash.com.au.
- Only decline questions clearly unrelated to MissingCash or its services.

## Boundaries
- Don't give regulated financial, legal, or tax advice. For finance: refer to Stratton/Erin. For tax/super: refer to the ATO.
- Don't promise specific outcomes. Stay encouraging but honest.`;

export const MIA_SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "search_unclaimed_money",
    description:
      "Search all 11 Australian unclaimed money databases for a specific person. Call this as soon as you have the user's first name and last name — do not wait for more details.",
    parameters: {
      type: "object",
      properties: {
        firstName: {
          type: "string",
          description: "Person's first name",
        },
        lastName: {
          type: "string",
          description: "Person's last name",
        },
        address: {
          type: "string",
          description:
            "Optional: current suburb, postcode, or full address. Improves accuracy for the WA database.",
        },
      },
      required: ["firstName", "lastName"],
    },
  },
};

export function getMiaFallback(messages: { role: string; content: string }[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = (lastUser?.content ?? "").toLowerCase();
  const has = (...words: string[]) => words.some((w) => text.includes(w));

  if (has("stratton", "loan", "finance", "car", "vehicle", "borrow", "lend", "broker", "interest rate", "repayment")) {
    return "For finance, we partner with Stratton Finance — one of Australia's leading brokers, with access to 40+ lenders for competitive rates. They handle car finance (new, used, prestige), personal loans, and commercial & asset finance, often with same-day approval. Your consultant is Erin Crofton in Wanneroo, Perth (ACL 364340, AFCA & FBAA member). For a free, no-obligation quote, use the form on our Finance page or call Erin on 0432 280 181.";
  }
  if (has("crypto", "bitcoin", "wallet", "seed phrase", "exchange", "ledger")) {
    return "We help people understand how to recover lost or dormant cryptocurrency — old exchange accounts, forgotten seed phrases, or old hardware wallets. One important warning: never pay an upfront fee to anyone promising to recover your crypto, as that's a common scam. See our Lost Crypto page for guidance, and reach legitimate help via ASIC MoneySmart and AFCA.";
  }
  if (has("free", "cost", "fee", "charge", "price", "$", "pay")) {
    return "Searching for unclaimed money on MissingCash is 100% free. We search 11 Australian databases live in this chat — just give me your first and last name and I'll search right now.";
  }
  if (has("how", "search", "find", "start", "begin", "look")) {
    return "Just give me your first and last name and I'll search 11 Australian government databases right now — it's 100% free and takes about 30 seconds.";
  }
  if (has("contact", "support", "email", "phone", "help", "reach", "speak")) {
    return "You can reach our team at support@missingcash.com.au (we usually reply within 1–2 business days) or via the Contact page form. For finance enquiries, use the Finance page form or call Erin Crofton at Stratton Finance on 0432 280 181.";
  }
  if (has("privacy", "data", "secure", "store", "personal information")) {
    return "Your privacy is protected — we don't store your search queries or personal data; everything is processed instantly. You can read the full details on our Privacy page, or email support@missingcash.com.au for any data request.";
  }
  if (has("government", "scam", "legit", "real", "trust", "who are you")) {
    return "MissingCash is a private Australian service (ABN 52 347 989 391), not a government agency. We aggregate publicly available government register information and provide guides to help you claim money that's rightfully yours. Searching is free, and you always lodge the actual claim yourself with the relevant agency.";
  }
  return "I can search 11 Australian unclaimed money databases for you right now — just give me your first and last name! I can also walk you through claiming it, or connect you with our finance partner Stratton Finance. What would you like to do?";
}
