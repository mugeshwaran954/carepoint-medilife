import type { Response, NextFunction } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getAppointmentById } from "../services/appointment.service.js";
import {
  createPostVisitRecord,
  getPostVisitSummaryByAppointment
} from "../services/postVisit.service.js";

const prescriptionItemSchema = z.object({
  medicationName: z.string().trim().min(1),
  dosage: z.string().trim().min(1),
  frequency: z.string().trim().min(1),
  duration: z.string().trim().min(1),
  instructions: z.string().trim().optional()
});

const createPostVisitSchema = z.object({
  appointmentId: z.string().uuid(),
  diagnosis: z.string().trim().optional(),
  notes: z.string().trim().min(1),
  prescriptions: z.array(prescriptionItemSchema).optional(),
  followUpDate: z.string().optional(),
  followUpInstructions: z.string().trim().optional()
});

export const createPostVisitSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (req.user.role !== "DOCTOR" && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only doctors or admins can create post-visit notes & summaries"
      });
    }

    const parsed = createPostVisitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid post-visit data",
        errors: parsed.error.flatten()
      });
    }

    const appointment = await getAppointmentById(parsed.data.appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    if (req.user.role === "DOCTOR" && appointment.doctor.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized for this appointment"
      });
    }

    const result = await createPostVisitRecord(parsed.data);

    return res.status(201).json({
      success: true,
      message: "Post-visit notes and summary recorded successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getPostVisitSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const rawId = req.params.appointmentId;
    const appointmentId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "Appointment ID is required"
      });
    }

    const appointment = await getAppointmentById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    const isPatient = appointment.patient.userId === req.user.userId;
    const isDoctor = appointment.doctor.userId === req.user.userId;
    const isAdmin = req.user.role === "ADMIN";

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this post-visit summary"
      });
    }

    const summary = await getPostVisitSummaryByAppointment(appointmentId);
    if (!summary) {
      return res.status(404).json({
        success: false,
        message: "Post-visit summary not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
