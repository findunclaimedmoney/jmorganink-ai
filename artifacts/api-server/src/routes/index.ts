import { Router, type IRouter } from "express";
import healthRouter from "./health";
import miaRouter from "./mia";
import miaTtsRouter from "./mia-tts";
import financeRouter from "./finance";
import searchRouter from "./search";
import alertsRouter from "./alerts";
import miaResearchRouter from "./mia-research";
import miaSearchRouter from "./mia-search";
import leadsRouter from "./leads";
import batchSearchRouter from "./batch-search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(miaRouter);
router.use(miaTtsRouter);
router.use(financeRouter);
router.use(searchRouter);
router.use(alertsRouter);
router.use(miaResearchRouter);
router.use(miaSearchRouter);
router.use(leadsRouter);
router.use(batchSearchRouter);

export default router;
