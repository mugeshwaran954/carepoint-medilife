import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";

const doctorSelect = {
  id: true,
  specialization: true,
  licenseNumber: true,
  qualification: true,
  experienceYears: true,
  consultationFee: true,
  slotDuration: true,
  bio: true,
  isAvailable: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true
    }
  },
  availability: true
};

export const getAllDoctors = async () => {
  const doctors = await prisma.doctorProfile.findMany({
    where: {
      user: {
        status: "ACTIVE"
      }
    },
    select: doctorSelect,
    orderBy: {
      createdAt: "desc"
    }
  });

  return doctors.map((doctor) => ({
    ...doctor,
    consultationFee:
      doctor.consultationFee !== null
        ? Number(doctor.consultationFee)
        : null
  }));
};

export const getDoctorById = async (doctorId: string) => {
  const doctor = await prisma.doctorProfile.findFirst({
    where: {
      id: doctorId,
      user: {
        status: "ACTIVE"
      }
    },
    select: doctorSelect
  });

  if (!doctor) {
    return null;
  }

  return {
    ...doctor,
    consultationFee:
      doctor.consultationFee !== null
        ? Number(doctor.consultationFee)
        : null
  };
};

export interface CreateDoctorInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  specialization: string;
  licenseNumber: string;
  qualification?: string;
  experienceYears?: number;
  consultationFee?: number;
  slotDuration?: number;
  bio?: string;
  workingHours?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}

export const createDoctorProfileByAdmin = async (data: CreateDoctorInput) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        role: "DOCTOR",
        status: "ACTIVE"
      }
    });

    const doctorProfile = await tx.doctorProfile.create({
      data: {
        userId: user.id,
        specialization: data.specialization,
        licenseNumber: data.licenseNumber,
        qualification: data.qualification || null,
        experienceYears: data.experienceYears ?? null,
        consultationFee: data.consultationFee ?? null,
        slotDuration: data.slotDuration ?? 30,
        bio: data.bio || null,
        isAvailable: true
      }
    });

    if (data.workingHours && data.workingHours.length > 0) {
      await tx.doctorAvailability.createMany({
        data: data.workingHours.map((wh) => ({
          doctorId: doctorProfile.id,
          dayOfWeek: wh.dayOfWeek,
          startTime: wh.startTime,
          endTime: wh.endTime,
          isActive: true
        }))
      });
    }

    return tx.doctorProfile.findUnique({
      where: { id: doctorProfile.id },
      select: doctorSelect
    });
  });
};