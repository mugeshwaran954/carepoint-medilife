import { prisma } from "../config/prisma.js";

export const getUserProfile = async (userId: string) => {
  return prisma.user.findUnique({
    where: {
      id: userId
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
};

export interface UpdateUserProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
}

export const updateUserProfile = async (
  userId: string,
  data: UpdateUserProfileInput
) => {
  return prisma.user.update({
    where: {
      id: userId
    },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      createdAt: true,
      updatedAt: true
    }
  });
};