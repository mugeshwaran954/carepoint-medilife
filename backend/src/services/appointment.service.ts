import { prisma } from "../config/prisma.js";

export interface CreateAppointmentInput {
  doctorId: string;
  startTime: Date;
  endTime: Date;
  type?: "CONSULTATION" | "FOLLOW_UP" | "EMERGENCY";
  reason?: string;
}

export const getPatientProfileByUserId = async (
  userId: string
) => {
  return prisma.patientProfile.findUnique({
    where: {
      userId
    }
  });
};

export const getDoctorProfile = async (
  doctorId: string
) => {
  return prisma.doctorProfile.findUnique({
    where: {
      id: doctorId
    },
    include: {
      user: {
        select: {
          id: true,
          status: true
        }
      }
    }
  });
};

export const findOverlappingAppointment = async (
  doctorId: string,
  startTime: Date,
  endTime: Date
) => {
  return prisma.appointment.findFirst({
    where: {
      doctorId,
      status: {
        notIn: ["CANCELLED", "NO_SHOW"]
      },
      startTime: {
        lt: endTime
      },
      endTime: {
        gt: startTime
      }
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true
    }
  });
};

export const findDoctorAvailability = async (
  doctorId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
) => {
  return prisma.doctorAvailability.findFirst({
    where: {
      doctorId,
      dayOfWeek,
      isActive: true,
      startTime: {
        lte: startTime
      },
      endTime: {
        gte: endTime
      }
    }
  });
};

export const createAppointment = async (
  patientId: string,
  doctorId: string,
  createdById: string,
  data: CreateAppointmentInput
) => {
  return prisma.$transaction(async (tx) => {
    const overlapping = await tx.appointment.findFirst({
      where: {
        doctorId,
        status: {
          notIn: ["CANCELLED", "NO_SHOW"]
        },
        startTime: {
          lt: data.endTime
        },
        endTime: {
          gt: data.startTime
        }
      }
    });

    if (overlapping) {
      const err: any = new Error("This slot was just booked by another patient. Please choose another slot.");
      err.code = "P2002";
      throw err;
    }

    return tx.appointment.create({
      data: {
        patientId,
        doctorId,
        createdById,
        startTime: data.startTime,
        endTime: data.endTime,
        type: data.type ?? "CONSULTATION",
        reason: data.reason
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });
  });
};
type AppointmentUserRole =
  | "PATIENT"
  | "DOCTOR"
  | "ADMIN";
export const getAppointmentsForUser = async (
  userId: string,
  role: AppointmentUserRole
) => {
  const where =
    role === "PATIENT"
      ? {
          patient: {
            userId
          }
        }
      : role === "DOCTOR"
        ? {
            doctor: {
              userId
            }
          }
        : {};

  return prisma.appointment.findMany({
    where,
    orderBy: {
      startTime: "asc"
    },
    include: {
      patient: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      },
      doctor: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }
    }
  });
};

export const getAppointmentById = async (
  appointmentId: string
) => {
  return prisma.appointment.findUnique({
    where: {
      id: appointmentId
    },
    include: {
      patient: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      },
      doctor: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      },
      followUps: true,
      reminders: true
    }
  });
};
export const userCanAccessAppointment = (
  appointment: {
    patient: {
      userId: string;
    };
    doctor: {
      userId: string;
    };
  },
  userId: string,
  role: AppointmentUserRole
) => {
  if (role === "ADMIN") {
    return true;
  }

  if (role === "PATIENT") {
    return appointment.patient.userId === userId;
  }

  if (role === "DOCTOR") {
    return appointment.doctor.userId === userId;
  }

  return false;
};
export const cancelAppointment = async (
  appointmentId: string,
  cancellationReason: string
) => {
  return prisma.appointment.update({
    where: {
      id: appointmentId
    },
    data: {
      status: "CANCELLED",
      cancellationReason
    },
    include: {
      patient: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      },
      doctor: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }
    }
  });
};
export type UpdatableAppointmentStatus =
  | "CONFIRMED"
  | "COMPLETED"
  | "NO_SHOW";

export const updateAppointmentStatus = async (
  appointmentId: string,
  status: UpdatableAppointmentStatus
) => {
  return prisma.appointment.update({
    where: {
      id: appointmentId
    },
    data: {
      status
    },
    include: {
      patient: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      },
      doctor: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }
    }
  });
};
export interface CreateFollowUpInput {
  scheduledAt?: Date;
  instructions?: string;
}

export const createFollowUp = async (
  appointmentId: string,
  data: CreateFollowUpInput
) => {
  return prisma.followUp.create({
    data: {
      appointmentId,
      scheduledAt: data.scheduledAt,
      instructions: data.instructions,
      status: "PENDING"
    }
  });
};
export const getFollowUpsForAppointment = async (
  appointmentId: string
) => {
  return prisma.followUp.findMany({
    where: {
      appointmentId
    },
    orderBy: {
      scheduledAt: "asc"
    },
    include: {
      appointment: {
        select: {
          id: true,
          patientId: true,
          doctorId: true,
          startTime: true,
          endTime: true,
          type: true,
          status: true
        }
      }
    }
  });
};

export const getFollowUpById = async (
  followUpId: string
) => {
  return prisma.followUp.findUnique({
    where: {
      id: followUpId
    },
    include: {
      appointment: {
        include: {
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });
};
export const userCanAccessFollowUp = (
  followUp: {
    appointment: {
      patient: {
        userId: string;
      };
      doctor: {
        userId: string;
      };
    };
  },
  userId: string,
  role: AppointmentUserRole
) => {
  if (role === "ADMIN") {
    return true;
  }

  if (role === "PATIENT") {
    return (
      followUp.appointment.patient.userId ===
      userId
    );
  }

  if (role === "DOCTOR") {
    return (
      followUp.appointment.doctor.userId ===
      userId
    );
  }

  return false;
};