import { prisma } from "../config/prisma.js";

const doctorSelect = {
  id: true,
  specialization: true,
  licenseNumber: true,
  qualification: true,
  experienceYears: true,
  consultationFee: true,
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
  }
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