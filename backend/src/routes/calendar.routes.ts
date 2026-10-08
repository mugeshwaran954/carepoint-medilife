import { Router } from "express";
import {
  getConnectUrl,
  googleCallbackHandler,
  getConnectionStatus
} from "../controllers/calendar.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/google/connect", authenticate, getConnectUrl);
router.get("/google/callback", googleCallbackHandler);
router.get("/status", authenticate, getConnectionStatus);

export default router;
