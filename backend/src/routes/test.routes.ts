import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = Router();

router.get(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  (_req, res) => {
    res.json({
      success: true,
      message: "Admin access granted"
    });
  }
);

router.get(
  "/doctor",
  authenticate,
  authorize("DOCTOR", "ADMIN"),
  (_req, res) => {
    res.json({
      success: true,
      message: "Doctor access granted"
    });
  }
);

router.get(
  "/patient",
  authenticate,
  authorize("PATIENT", "ADMIN"),
  (_req, res) => {
    res.json({
      success: true,
      message: "Patient access granted"
    });
  }
);

export default router;