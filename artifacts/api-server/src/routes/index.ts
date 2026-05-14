import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import schoolsRouter from "./schools";
import studentsRouter from "./students";
import staffRouter from "./staff";
import classesRouter from "./classes";
import attendanceRouter from "./attendance";
import feesRouter from "./fees";
import announcementsRouter from "./announcements";
import dashboardRouter from "./dashboard";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(schoolsRouter);
router.use(studentsRouter);
router.use(staffRouter);
router.use(classesRouter);
router.use(attendanceRouter);
router.use(feesRouter);
router.use(announcementsRouter);
router.use(dashboardRouter);
router.use(analyticsRouter);

export default router;
