import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(usersRouter);

export default router;
