import type { Response, NextFunction } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createDoctorLeave,
  getDoctorLeaves,
  deleteDoctorLeave
} from "../services/doctorLeave.service.js";
import { prisma } from "../config/prisma.js";

const createLeaveSchema = z.object({
  doctorId: z.string().uuid().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().trim().optional()
});

export const addDoctorLeave = async (
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

    if (req.user.role !== "ADMIN" && req.user.role !== "DOCTOR") {
      return res.status(403).json({
        success: false,
        message: "Only doctors or admins can set doctor leave"
      });
    }

    const parsed = createLeaveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave input",
        errors: parsed.error.flatten()
      });
    }

    let targetDoctorId = parsed.data.doctorId;

    // If user is doctor, ensure they are setting leave for themselves
    if (req.user.role === "DOCTOR") {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: req.user.userId }
      });
      if (!doctorProfile) {
        return res.status(404).json({
          success: false,
          message: "Doctor profile not found for this account"
        });
      }
      if (targetDoctorId && doctorProfile.id !== targetDoctorId) {
        return res.status(403).json({
          success: false,
          message: "You can only set leave for yourself"
        });
      }
      targetDoctorId = doctorProfile.id;
    } else if (!targetDoctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID is required for administrator leave scheduling"
      });
    }

    const result = await createDoctorLeave({
      doctorId: targetDoctorId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      reason: parsed.data.reason
    });

    return res.status(201).json({
      success: true,
      message: `Doctor leave set successfully. ${result.cancelledAppointmentsCount} affected appointment(s) cancelled and patients notified.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const fetchDoctorLeaves = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawId = req.params.doctorId;
    const doctorId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID is required"
      });
    }

    const leaves = await getDoctorLeaves(doctorId);

    return res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    next(error);
  }
};

export const removeDoctorLeave = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || (req.user.role !== "ADMIN" && req.user.role !== "DOCTOR")) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const rawId = req.params.leaveId;
    const leaveId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!leaveId) {
      return res.status(400).json({
        success: false,
        message: "Leave ID is required"
      });
    }

    await deleteDoctorLeave(leaveId);

    return res.status(200).json({
      success: true,
      message: "Doctor leave removed successfully"
    });
  } catch (error) {
    next(error);
  }
};
