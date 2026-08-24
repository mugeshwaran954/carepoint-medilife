import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  getAllDoctors,
  getDoctorById
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