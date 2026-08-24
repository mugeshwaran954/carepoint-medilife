import type {
  Response,
  NextFunction
} from "express";

import { z } from "zod";

import type {
  AuthenticatedRequest
} from "../middleware/auth.middleware.js";

import {
  getAppointmentById,
  createFollowUp,
  getFollowUpsForAppointment,
  getFollowUpById,
  userCanAccessFollowUp
} from "../services/appointment.service.js";

const followUpIdSchema =
  z.string().uuid();

const appointmentIdSchema =
  z.string().uuid();

const followUpRoleSchema = z.enum([
  "PATIENT",
  "DOCTOR",
  "ADMIN"
]);

const createFollowUpSchema = z.object({
  scheduledAt: z
    .string()
    .datetime({
      offset: true
    })
    .optional(),

  instructions: z
    .string()
    .trim()
    .max(1000)
    .optional()
});

export const createNewFollowUp = async (
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

    if (req.user.role !== "DOCTOR") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can create follow-ups"
      });
    }

    const appointmentIdResult =
      appointmentIdSchema.safeParse(
        req.params.id
      );

    if (!appointmentIdResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID"
      });
    }

    const parsed =
      createFollowUpSchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid follow-up data",
        errors: parsed.error.flatten()
      });
    }

    const appointment =
      await getAppointmentById(
        appointmentIdResult.data
      );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    if (
      appointment.doctor.userId !==
      req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to create a follow-up for this appointment"
      });
    }

    if (appointment.status === "CANCELLED") {
      return res.status(409).json({
        success: false,
        message:
          "Cannot create a follow-up for a cancelled appointment"
      });
    }

    const followUp =
      await createFollowUp(
        appointment.id,
        {
          scheduledAt: parsed.data.scheduledAt
            ? new Date(
                parsed.data.scheduledAt
              )
            : undefined,

          instructions:
            parsed.data.instructions
        }
      );

    return res.status(201).json({
      success: true,
      message:
        "Follow-up created successfully",
      data: followUp
    });
  } catch (error) {
    next(error);
  }
};

export const getAppointmentFollowUps = async (
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

    const roleResult =
      followUpRoleSchema.safeParse(
        req.user.role
      );

    if (!roleResult.success) {
      return res.status(403).json({
        success: false,
        message: "Invalid user role"
      });
    }

    const appointmentIdResult =
      appointmentIdSchema.safeParse(
        req.params.id
      );

    if (!appointmentIdResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID"
      });
    }

    const appointment =
      await getAppointmentById(
        appointmentIdResult.data
      );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    const allowed =
      userCanAccessFollowUp(
        {
          appointment: {
            patient: {
              userId:
                appointment.patient.userId
            },
            doctor: {
              userId:
                appointment.doctor.userId
            }
          }
        },
        req.user.userId,
        roleResult.data
      );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access these follow-ups"
      });
    }

    const followUps =
      await getFollowUpsForAppointment(
        appointment.id
      );

    return res.status(200).json({
      success: true,
      data: followUps
    });
  } catch (error) {
    next(error);
  }
};

export const getFollowUp = async (
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

    const roleResult =
      followUpRoleSchema.safeParse(
        req.user.role
      );

    if (!roleResult.success) {
      return res.status(403).json({
        success: false,
        message: "Invalid user role"
      });
    }

    const followUpIdResult =
      followUpIdSchema.safeParse(
        req.params.followUpId
      );

    if (!followUpIdResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid follow-up ID"
      });
    }

    const followUp =
      await getFollowUpById(
        followUpIdResult.data
      );

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found"
      });
    }

    const allowed =
      userCanAccessFollowUp(
        followUp,
        req.user.userId,
        roleResult.data
      );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this follow-up"
      });
    }

    return res.status(200).json({
      success: true,
      data: followUp
    });
  } catch (error) {
    next(error);
  }
};