import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import usersRouter from "./users";
import authRouter from "./auth";
import chatRouter from "./chat";
import storageRouter from "./storage";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(chatRouter);
router.use(aiRouter);
router.use(usersRouter);
router.use(storageRouter);
router.use(reportsRouter);

export default router;
