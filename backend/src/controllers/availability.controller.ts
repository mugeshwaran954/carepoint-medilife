import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

import {
  getDoctorAvailability,
  getDoctorById,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getAvailabilityById
} from "../services/availability.service.js";

const uuidSchema = z.string().uuid();

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:mm format");

const createAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema,
  isActive: z.boolean().optional()
});

const updateAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  isActive: z.boolean().optional()
});

const checkDoctorAccess = async (
  req: AuthenticatedRequest,
  doctorId: string
) => {
  if (!req.user) {
    return {
      allowed: false,
      status: 401,
      message: "Authentication required"
    };
  }

  const doctor = await getDoctorById(doctorId);

  if (!doctor || doctor.user.status !== "ACTIVE") {
    return {
      allowed: false,
      status: 404,
      message: "Doctor not found"
    };
  }

  if (req.user.role === "ADMIN") {
    return {
      allowed: true
    };
  }

  if (
    req.user.role === "DOCTOR" &&
    req.user.userId === doctor.userId
  ) {
    return {
      allowed: true
    };
  }

  return {
    allowed: false,
    status: 403,
    message: "You do not have permission to manage this doctor's availability"
  };
};

export const getAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const doctorIdResult = uuidSchema.safeParse(req.params.id);

    if (!doctorIdResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID"
      });
    }

    const doctor = await getDoctorById(doctorIdResult.data);

    if (!doctor || doctor.user.status !== "ACTIVE") {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }

    const availability = await getDoctorAvailability(
      doctorIdResult.data
    );

    return res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    next(error);
  }
};

export const createDoctorAvailability = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const doctorIdResult = uuidSchema.safeParse(req.params.id);

    if (!doctorIdResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID"
      });
    }

    const access = await checkDoctorAccess(
      req,
      doctorIdResult.data
    );

    if (!access.allowed) {
  return res.status(access.status ?? 403).json({
    success: false,
    message: access.message ?? "Forbidden"
  });
}

    const data = createAvailabilitySchema.parse(req.body);

    if (data.startTime >= data.endTime) {
      return res.status(400).json({
        success: false,
        message: "startTime must be earlier than endTime"
      });
    }

    const availability = await createAvailability(
      doctorIdResult.data,
      data
    );

    return res.status(201).json({
      success: true,
      message: "Doctor availability created successfully",
      data: availability
    });
  } catch (error) {
    next(error);
  }
};

export const updateDoctorAvailability = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const doctorIdResult = uuidSchema.safeParse(req.params.id);
    const availabilityIdResult = uuidSchema.safeParse(
      req.params.availabilityId
    );

    if (
      !doctorIdResult.success ||
      !availabilityIdResult.success
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor or availability ID"
      });
    }

    const access = await checkDoctorAccess(
      req,
      doctorIdResult.data
    );

    if (!access.allowed) {
  return res.status(access.status ?? 403).json({
    success: false,
    message: access.message ?? "Forbidden"
  });
}

    const existing = await getAvailabilityById(
      availabilityIdResult.data
    );

    if (
      !existing ||
      existing.doctorId !== doctorIdResult.data
    ) {
      return res.status(404).json({
        success: false,
        message: "Availability record not found"
      });
    }

    const data = updateAvailabilitySchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one availability field is required"
      });
    }

    const startTime = data.startTime ?? existing.startTime;
    const endTime = data.endTime ?? existing.endTime;

    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: "startTime must be earlier than endTime"
      });
    }

    const availability = await updateAvailability(
      availabilityIdResult.data,
      data
    );

    return res.status(200).json({
      success: true,
      message: "Doctor availability updated successfully",
      data: availability
    });
  } catch (error) {
    next(error);
  }
};

export const removeDoctorAvailability = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const doctorIdResult = uuidSchema.safeParse(req.params.id);
    const availabilityIdResult = uuidSchema.safeParse(
      req.params.availabilityId
    );

    if (
      !doctorIdResult.success ||
      !availabilityIdResult.success
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor or availability ID"
      });
    }

    const access = await checkDoctorAccess(
      req,
      doctorIdResult.data
    );

    if (!access.allowed) {
  return res.status(access.status ?? 403).json({
    success: false,
    message: access.message ?? "Forbidden"
  });
}

    const existing = await getAvailabilityById(
      availabilityIdResult.data
    );

    if (
      !existing ||
      existing.doctorId !== doctorIdResult.data
    ) {
      return res.status(404).json({
        success: false,
        message: "Availability record not found"
      });
    }

    await deleteAvailability(availabilityIdResult.data);

    return res.status(200).json({
      success: true,
      message: "Doctor availability deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};