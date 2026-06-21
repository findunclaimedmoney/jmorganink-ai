import { Router, type IRouter } from "express";
import { FinanceEnquiryBody } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { financeEnquiriesTable } from "@workspace/db/schema";

const router: IRouter = Router();

router.post("/finance/enquiry", async (req, res) => {
  const parsed = FinanceEnquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid enquiry data", details: parsed.error.issues });
    return;
  }

  try {
    const [row] = await db
      .insert(financeEnquiriesTable)
      .values({
        ...parsed.data,
        estimatedMonthly: parsed.data.estimatedMonthly ? Math.round(parsed.data.estimatedMonthly) : undefined,
      })
      .returning({ id: financeEnquiriesTable.id });

    req.log.info({ enquiryId: row.id, email: parsed.data.email, loanType: parsed.data.loanType }, "Finance enquiry saved");
    res.status(201).json({ success: true, enquiryId: row.id });
  } catch (err) {
    req.log.error({ err }, "Failed to save finance enquiry");
    res.status(500).json({ error: "Failed to submit enquiry. Please try again or call 0432 280 181." });
  }
});

export default router;
