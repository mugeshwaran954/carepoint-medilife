import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  getAllDoctors,
  getDoctorById,
  createDoctorProfileByAdmin
} from "../services/doctor.service.js";

const doctorIdSchema = z.string().uuid();

export const getDoctors = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const doctors = await getAllDoctors();

    return res.status(200).json({
      success: true,
      data: doctors
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = doctorIdSchema.safeParse(req.params.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID"
      });
    }

    const doctor = await getDoctorById(result.data);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    next(error);
  }
};

const createDoctorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  specialization: z.string().trim().min(1),
  licenseNumber: z.string().trim().min(1),
  qualification: z.string().trim().optional(),
  experienceYears: z.number().int().nonnegative().optional(),
  consultationFee: z.number().nonnegative().optional(),
  slotDuration: z.number().int().positive().optional(),
  bio: z.string().trim().optional(),
  workingHours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string(),
      endTime: z.string()
    })
  ).optional()
});

export const createDoctor = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can create doctor profiles"
      });
    }

    const parsed = createDoctorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor profile data",
        errors: parsed.error.flatten()
      });
    }

    const doctor = await createDoctorProfileByAdmin(parsed.data);

    return res.status(201).json({
      success: true,
      message: "Doctor profile created successfully",
      data: doctor
    });
  } catch (error) {
    next(error);
  }
};