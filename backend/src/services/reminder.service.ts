import { prisma } from "../config/prisma.js";

export type ReminderRole =
  | "PATIENT"
  | "DOCTOR"
  | "ADMIN";

export interface CreateReminderInput {
  appointmentId?: string;
  followUpId?: string;
  recipientUserId: string;
  type:
    | "APPOINTMENT"
    | "FOLLOW_UP"
    | "MEDICATION"
    | "CUSTOM";
  scheduledFor: Date;
  title: string;
  message: string;
}

export const createReminder = async (
  data: CreateReminderInput
) => {
  return prisma.reminder.create({
    data: {
      appointmentId: data.appointmentId,
      followUpId: data.followUpId,
      recipientUserId: data.recipientUserId,
      type: data.type,
      scheduledFor: data.scheduledFor,
      title: data.title,
      message: data.message
    },
    include: {
      appointment: true,
      followUp: true,
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });
};

export const getRemindersForUser = async (
  userId: string
) => {
  return prisma.reminder.findMany({
    where: {
      recipientUserId: userId
    },
    orderBy: {
      scheduledFor: "asc"
    },
    include: {
      appointment: true,
      followUp: true
    }
  });
};

export const getAllReminders = async () => {
  return prisma.reminder.findMany({
    orderBy: {
      scheduledFor: "asc"
    },
    include: {
      appointment: true,
      followUp: true,
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });
};

export const getReminderById = async (
  reminderId: string
) => {
  return prisma.reminder.findUnique({
    where: {
      id: reminderId
    },
    include: {
      appointment: {
        include: {
          patient: true,
          doctor: true
        }
      },
      followUp: true,
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  });
};

export const userCanAccessReminder = (
  reminder: {
    recipientUserId: string;
    appointment?: {
      patient: {
        userId: string;
      };
      doctor: {
        userId: string;
      };
    } | null;
  },
  userId: string,
  role: ReminderRole
) => {
  if (role === "ADMIN") {
    return true;
  }

  if (reminder.recipientUserId === userId) {
    return true;
  }

  if (
    role === "PATIENT" &&
    reminder.appointment?.patient.userId === userId
  ) {
    return true;
  }

  if (
    role === "DOCTOR" &&
    reminder.appointment?.doctor.userId === userId
  ) {
    return true;
  }

  return false;
};