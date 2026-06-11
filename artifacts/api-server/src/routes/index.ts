import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import organizationsRouter from "./organizations";
import schoolProfilesRouter from "./school-profiles";
import studentsRouter from "./students";
import usersRouter from "./users";
import classesRouter from "./classes";
import subjectsRouter from "./subjects";
import attendanceRouter from "./attendance";
import staffAttendanceRouter from "./staff-attendance";
import feesRouter from "./fees";
import feeStructuresRouter from "./fee-structures";
import examinationsRouter from "./examinations";
import udiseRouter from "./udise";
import announcementsRouter from "./announcements";
import dashboardRouter from "./dashboard";
import analyticsRouter from "./analytics";
import studentDocumentsRouter from "./student-documents";
import { requireAuthHandler } from "../lib/require-auth";
import { authorizeRequestHandler } from "../lib/authorize-request";

const router: IRouter = Router();

router.use(requireAuthHandler);
router.use(authorizeRequestHandler);

router.use(healthRouter);
router.use(authRouter);
router.use(organizationsRouter);
router.use(schoolProfilesRouter);
router.use(studentsRouter);
router.use(studentDocumentsRouter);
router.use(usersRouter);
router.use(classesRouter);
router.use(subjectsRouter);
router.use(attendanceRouter);
router.use(staffAttendanceRouter);
router.use(feesRouter);
router.use(feeStructuresRouter);
router.use(examinationsRouter);
router.use(udiseRouter);
router.use(announcementsRouter);
router.use(dashboardRouter);
router.use(analyticsRouter);

export default router;
