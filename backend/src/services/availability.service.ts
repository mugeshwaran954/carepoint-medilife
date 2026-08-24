import { prisma } from "../config/prisma.js";

export interface CreateAvailabilityInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export interface UpdateAvailabilityInput {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}

export const getDoctorAvailability = async (doctorId: string) => {
  return prisma.doctorAvailability.findMany({
    where: {
      doctorId
    },
    orderBy: [
      {
        dayOfWeek: "asc"
      },
      {
        startTime: "asc"
      }
    ]
  });
};

export const getDoctorById = async (doctorId: string) => {
  return prisma.doctorProfile.findUnique({
    where: {
      id: doctorId
    },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          status: true
        }
      }
    }
  });
};

export const createAvailability = async (
  doctorId: string,
  data: CreateAvailabilityInput
) => {
  return prisma.doctorAvailability.create({
    data: {
      doctorId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      isActive: data.isActive ?? true
    }
  });
};

export const updateAvailability = async (
  availabilityId: string,
  data: UpdateAvailabilityInput
) => {
  return prisma.doctorAvailability.update({
    where: {
      id: availabilityId
    },
    data
  });
};

export const deleteAvailability = async (
  availabilityId: string
) => {
  return prisma.doctorAvailability.delete({
    where: {
      id: availabilityId
    }
  });
};

export const getAvailabilityById = async (
  availabilityId: string
) => {
  return prisma.doctorAvailability.findUnique({
    where: {
      id: availabilityId
    },
    select: {
      id: true,
      doctorId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      isActive: true
    }
  });
};