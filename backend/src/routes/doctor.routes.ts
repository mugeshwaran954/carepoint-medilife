import { Router } from "express";
import {
  getDoctors,
  getDoctor,
  createDoctor
} from "../controllers/doctor.controller.js";
import {
  addDoctorLeave,
  fetchDoctorLeaves,
  removeDoctorLeave
} from "../controllers/doctorLeave.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", getDoctors);
router.post("/", authenticate, createDoctor);

router.post("/leaves", authenticate, addDoctorLeave);
router.post("/leave", authenticate, addDoctorLeave);
router.get("/:doctorId/leaves", authenticate, fetchDoctorLeaves);
router.delete("/leaves/:leaveId", authenticate, removeDoctorLeave);

router.get("/:id", getDoctor);

export default router;