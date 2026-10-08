import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { generateAccessToken } from "../utils/jwt.js";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: "PATIENT" | "DOCTOR";
  phone?: string;
  gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
  dateOfBirth?: Date | string;
}

export const registerUser = async (data: RegisterInput) => {
  const normalizedEmail = data.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const role = data.role || "PATIENT";

  let dob: Date | null = null;
  if (data.dateOfBirth) {
    const d = new Date(data.dateOfBirth);
    if (!Number.isNaN(d.getTime())) {
      dob = d;
    }
  }

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone?.trim() || null,
        role,
        status: "ACTIVE"
      }
    });

    if (role === "PATIENT") {
      await tx.patientProfile.create({
        data: {
          userId: createdUser.id,
          gender: data.gender || null,
          dateOfBirth: dob
        }
      });
    }

    return createdUser;
  });

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role
  });

  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    }
  };
};

export const loginUser = async ({ email, password }: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase()
    }
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role
  });

  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    }
  };
};