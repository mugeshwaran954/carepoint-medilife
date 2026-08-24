import type { Response, NextFunction } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

import {
  getPatientProfileByUserId,
  getDoctorProfile,
  findOverlappingAppointment,
  findDoctorAvailability,
  createAppointment,
  getAppointmentsForUser,
  getAppointmentById,
  userCanAccessAppointment,
  cancelAppointment,
  updateAppointmentStatus
} from "../services/appointment.service.js";
const updateAppointmentStatusSchema = z.object({
  status: z.enum([
    "CONFIRMED",
    "COMPLETED",
    "NO_SHOW"
  ])
});
const uuidSchema = z.string().uuid();

const appointmentIdSchema = z.string().uuid();

const appointmentRoleSchema = z.enum([
  "PATIENT",
  "DOCTOR",
  "ADMIN"
]);

const createAppointmentSchema = z.object({
  doctorId: uuidSchema,

  startTime: z.string().datetime({
    offset: true
  }),

  endTime: z.string().datetime({
    offset: true
  }),

  type: z
    .enum([
      "CONSULTATION",
      "FOLLOW_UP",
      "EMERGENCY"
    ])
    .optional(),

  reason: z
    .string()
    .trim()
    .max(500)
    .optional()
});
const cancelAppointmentSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(3, "Cancellation reason must be at least 3 characters")
    .max(500, "Cancellation reason must not exceed 500 characters")
});

/**
 * POST /api/v1/appointments
 *
 * Create a new appointment.
 *
 * Only authenticated patients can create 
 */
export const createNewAppointment = async (
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
    console.log("CREATE APPOINTMENT AUTH USER:", req.user);

    if (req.user.role !== "PATIENT") {
      return res.status(403).json({
        success: false,
        message: "Only patients can create appointments"
      });
    }

    const parsed = createAppointmentSchema.safeParse(
      req.body
    );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment data",
        errors: parsed.error.flatten()
      });
    }

    const {
      doctorId,
      startTime,
      endTime,
      type,
      reason
    } = parsed.data;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: "startTime must be earlier than endTime"
      });
    }

    if (start <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Appointment must be scheduled in the future"
      });
    }

    const patient = await getPatientProfileByUserId(
      req.user.userId
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found"
      });
    }

    const doctor = await getDoctorProfile(doctorId);

    if (
      !doctor ||
      doctor.user.status !== "ACTIVE" ||
      !doctor.isAvailable
    ) {
      return res.status(404).json({
        success: false,
        message: "Doctor is not available"
      });
    }

    

   const dayOfWeek = start.getDay();

const startTimeOnly = start
  .toTimeString()
  .slice(0, 5);

const endTimeOnly = end
  .toTimeString()
  .slice(0, 5);

const availability = await findDoctorAvailability(
  doctorId,
  dayOfWeek,
  startTimeOnly,
  endTimeOnly
);
    if (!availability) {
      return res.status(400).json({
        success: false,
        message:
          "The selected time is outside the doctor's availability"
      });
    }

    const overlapping =
      await findOverlappingAppointment(
        doctorId,
        start,
        end
      );

    if (overlapping) {
      return res.status(409).json({
        success: false,
        message:
          "Doctor already has an appointment during the selected time",
        data: {
          appointmentId: overlapping.id,
          startTime: overlapping.startTime,
          endTime: overlapping.endTime
        }
      });
    }

    const appointment = await createAppointment(
      patient.id,
      doctor.id,
      req.user.userId,
      {
        doctorId,
        startTime: start,
        endTime: end,
        type,
        reason
      }
    );

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/appointments
 *
 * Retrieve appointments based on the
 * authenticated user's role.
 *
 * PATIENT -> own appointments
 * DOCTOR  -> assigned appointments
 * ADMIN   -> all appointments
 */
export const getAppointments = async (
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

    const roleResult = appointmentRoleSchema.safeParse(
      req.user.role
    );

    if (!roleResult.success) {
      return res.status(403).json({
        success: false,
        message: "Invalid user role"
      });
    }

    const appointments = await getAppointmentsForUser(
      req.user.userId,
      roleResult.data
    );

    return res.status(200).json({
      success: true,
      data: appointments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/appointments/:id
 *
 * Retrieve a single appointment.
 *
 * PATIENT -> only their appointment
 * DOCTOR  -> only their assigned appointment
 * ADMIN   -> any appointment
 */
export const getAppointment = async (
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

    const roleResult = appointmentRoleSchema.safeParse(
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

    const allowed = userCanAccessAppointment(
      appointment,
      req.user.userId,
      roleResult.data
    );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this appointment"
      });
    }

    return res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
};
/**
 * PATCH /api/v1/appointments/:id/cancel
 *
 * Cancel an appointment.
 *
 * PATIENT -> can cancel their own appointment
 * DOCTOR  -> can cancel an appointment assigned to them
 * ADMIN   -> can cancel any appointment
 */
export const cancelExistingAppointment = async (
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

    const roleResult = appointmentRoleSchema.safeParse(
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

    const parsed = cancelAppointmentSchema.safeParse(
      req.body
    );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid cancellation data",
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

    const allowed = userCanAccessAppointment(
      appointment,
      req.user.userId,
      roleResult.data
    );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to cancel this appointment"
      });
    }

    if (appointment.status === "CANCELLED") {
      return res.status(409).json({
        success: false,
        message: "Appointment is already cancelled"
      });
    }

    if (appointment.status === "COMPLETED") {
      return res.status(409).json({
        success: false,
        message:
          "Completed appointments cannot be cancelled"
      });
    }

    if (appointment.status === "NO_SHOW") {
      return res.status(409).json({
        success: false,
        message:
          "No-show appointments cannot be cancelled"
      });
    }

    const cancelledAppointment =
      await cancelAppointment(
        appointment.id,
        parsed.data.cancellationReason
      );

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      data: cancelledAppointment
    });
  } catch (error) {
    next(error);
  }
};
export const changeAppointmentStatus = async (
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

    const roleResult = appointmentRoleSchema.safeParse(
      req.user.role
    );

    if (!roleResult.success) {
      return res.status(403).json({
        success: false,
        message: "Invalid user role"
      });
    }

    if (
      roleResult.data !== "DOCTOR" &&
      roleResult.data !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors and administrators can update appointment status"
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
      updateAppointmentStatusSchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status",
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

    const allowed = userCanAccessAppointment(
      appointment,
      req.user.userId,
      roleResult.data
    );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to update this appointment"
      });
    }

    const currentStatus = appointment.status;
    const newStatus = parsed.data.status;

    if (currentStatus === "CANCELLED") {
      return res.status(409).json({
        success: false,
        message:
          "Cancelled appointments cannot have their status changed"
      });
    }

    if (currentStatus === "COMPLETED") {
      return res.status(409).json({
        success: false,
        message:
          "Completed appointments cannot have their status changed"
      });
    }

    if (currentStatus === "NO_SHOW") {
      return res.status(409).json({
        success: false,
        message:
          "No-show appointments cannot have their status changed"
      });
    }

    if (
      currentStatus === "SCHEDULED" &&
      newStatus === "COMPLETED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "An appointment must be confirmed before it can be completed"
      });
    }

    if (
      currentStatus === "SCHEDULED" &&
      newStatus === "NO_SHOW"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "An appointment must be confirmed before it can be marked as no-show"
      });
    }

    if (
      currentStatus === "CONFIRMED" &&
      newStatus === "CONFIRMED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Appointment is already confirmed"
      });
    }

    const updatedAppointment =
      await updateAppointmentStatus(
        appointment.id,
        newStatus
      );

    return res.status(200).json({
      success: true,
      message: `Appointment status updated to ${newStatus}`,
      data: updatedAppointment
    });
  } catch (error) {
    next(error);
  }
};