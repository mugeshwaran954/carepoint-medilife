import type {
  Response,
  NextFunction
} from "express";

import { z } from "zod";

import type {
  AuthenticatedRequest
} from "../middleware/auth.middleware.js";

import {
  getAppointmentById
} from "../services/appointment.service.js";

import {
  createPreVisitSummary,
  getPreVisitSummaryByAppointment
} from "../services/preVisit.service.js";

const appointmentIdSchema =
  z.string().uuid();

const createPreVisitSchema =
  z.object({
    appointmentId: z
      .string()
      .uuid(),

    symptoms: z
      .string()
      .trim()
      .min(1)
      .max(5000),

    duration: z
      .string()
      .trim()
      .max(200)
      .optional(),

    additionalDetails: z
      .string()
      .trim()
      .max(5000)
      .optional()
  });

export const createNewPreVisitSummary =
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required"
        });
      }

      if (req.user.role !== "PATIENT") {
        return res.status(403).json({
          success: false,
          message:
            "Only patients can create pre-visit summaries"
        });
      }

      const parsed =
        createPreVisitSchema.safeParse(
          req.body
        );

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid pre-visit summary data",
          errors:
            parsed.error.flatten()
        });
      }

      const appointment =
        await getAppointmentById(
          parsed.data.appointmentId
        );

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message:
            "Appointment not found"
        });
      }

      if (
        appointment.patient.userId !==
        req.user.userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to create a pre-visit summary for this appointment"
        });
      }

      if (
        appointment.status ===
        "CANCELLED"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Cannot create a pre-visit summary for a cancelled appointment"
        });
      }

      const summary =
        await createPreVisitSummary({
          appointmentId:
            parsed.data.appointmentId,

          symptoms:
            parsed.data.symptoms,

          duration:
            parsed.data.duration,

          additionalDetails:
            parsed.data.additionalDetails
        });

      return res.status(201).json({
        success: true,
        message:
          "Pre-visit summary created successfully",
        data: summary
      });
    } catch (error) {
      next(error);
    }
  };

export const getPreVisitSummary =
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required"
        });
      }

      const parsed =
        appointmentIdSchema.safeParse(
          req.params.appointmentId
        );

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid appointment ID"
        });
      }

      const appointment =
        await getAppointmentById(
          parsed.data
        );

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message:
            "Appointment not found"
        });
      }

      const isPatient =
        appointment.patient.userId ===
        req.user.userId;

      const isDoctor =
        appointment.doctor.userId ===
        req.user.userId;

      const isAdmin =
        req.user.role === "ADMIN";

      if (
        !isPatient &&
        !isDoctor &&
        !isAdmin
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to access this pre-visit summary"
        });
      }

      const summary =
        await getPreVisitSummaryByAppointment(
          parsed.data
        );

      if (!summary) {
        return res.status(404).json({
          success: false,
          message:
            "Pre-visit summary not found"
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