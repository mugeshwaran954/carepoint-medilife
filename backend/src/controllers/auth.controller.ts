import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { loginUser, registerUser } from "../services/auth.service.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export const getCurrentUser = async (
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

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        patientProfile: {
          select: {
            id: true
          }
        },
        doctorProfile: {
          select: {
            id: true,
            specialization: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = loginSchema.parse(req.body);

    const authResult = await loginUser(result);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: authResult
    });
  } catch (error) {
    next(error);
  }
};

const registerSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().optional(),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["PATIENT", "DOCTOR"]).default("PATIENT").optional(),
  phone: z.string().trim().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  dateOfBirth: z.string().optional(),
  age: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]).optional()
});

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration input",
        errors: parsed.error.flatten()
      });
    }

    const data = parsed.data;
    let firstName = data.firstName || "";
    let lastName = data.lastName || "";

    if (!firstName && data.fullName) {
      const parts = data.fullName.trim().split(/\s+/);
      firstName = parts[0] || "User";
      lastName = parts.slice(1).join(" ") || parts[0];
    } else if (!firstName) {
      firstName = "User";
    }

    if (!lastName) {
      lastName = firstName;
    }

    let calculatedDob: string | undefined = data.dateOfBirth;
    if (!calculatedDob && data.age && typeof data.age === "number") {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - data.age;
      calculatedDob = `${birthYear}-01-01`;
    }

    const authResult = await registerUser({
      email: data.email,
      password: data.password,
      firstName,
      lastName,
      role: data.role || "PATIENT",
      phone: data.phone,
      gender: data.gender,
      dateOfBirth: calculatedDob
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: authResult
    });
  } catch (error: any) {
    if (error?.message?.includes("already exists")) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};