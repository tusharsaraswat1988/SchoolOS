import { Router, type Request, type Response } from "express";

const router = Router();

const notImplemented = (_req: Request, res: Response) =>
  res.status(501).json({ error: "Billing endpoint not implemented until Sprint 2+" });

router.all("/branches/:branchId/sessions/:sessionId/billing-runs", notImplemented);
router.all("/branches/:branchId/sessions/:sessionId/billing-runs/*path", notImplemented);
router.all("/branches/:branchId/sessions/:sessionId/payments", notImplemented);
router.all("/branches/:branchId/sessions/:sessionId/payments/*path", notImplemented);
router.all("/branches/:branchId/sessions/:sessionId/receipts", notImplemented);
router.all("/branches/:branchId/sessions/:sessionId/receipts/*path", notImplemented);
router.all("/branches/:branchId/sessions/:sessionId/reports/daily-collection", notImplemented);
router.all("/branches/:branchId/sessions/:sessionId/reports/outstanding", notImplemented);
router.all(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/fee-assignments",
  notImplemented,
);
router.all(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/fee-assignments/*path",
  notImplemented,
);
router.all(
  "/branches/:branchId/sessions/:sessionId/students/:studentId/outstanding",
  notImplemented,
);
router.all("/branches/:branchId/sessions/:sessionId/students/:studentId/ledger", notImplemented);
router.all("/branches/:branchId/sessions/:sessionId/students/search", notImplemented);
router.all(
  "/branches/:branchId/sessions/:newSessionId/fee-structures/clone",
  notImplemented,
);

export default router;
