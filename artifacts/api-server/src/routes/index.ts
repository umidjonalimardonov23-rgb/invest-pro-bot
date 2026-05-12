import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import usersRouter from "./users.js";
import depositsRouter from "./deposits.js";
import investmentsRouter from "./investments.js";
import gamesRouter from "./games.js";
import donationsRouter from "./donations.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(depositsRouter);
router.use(investmentsRouter);
router.use(gamesRouter);
router.use(donationsRouter);

export default router;
