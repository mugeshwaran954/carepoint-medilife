import { Router } from "express";
import {
  getCurrentUser,
  login,
  register
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);

router.get("/me", authenticate, getCurrentUser);

export default router;