import { prisma } from "../config/prisma.js";
import { sendDoctorLeaveCancellationEmail } from "./email.service.js";

export interface CreateDoctorLeaveInput {
  doctorId: string;
  startDate: string | Date;
  endDate: string | Date;
  reason?: string;
}

export const isDoctorOnLeave = async (doctorId: string, targetDate: Date): Promise<boolean> => {
  const dateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

  const leave = await prisma.doctorLeave.findFirst({
    where: {
      doctorId,
      startDate: { lte: dateOnly },
      endDate: { gte: dateOnly }
    }
  });

  return !!leave;
};

export const createDoctorLeave = async (data: CreateDoctorLeaveInput) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);

  const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  // 1. Create doctor leave record
  const leave = await prisma.doctorLeave.create({
    data: {
      doctorId: data.doctorId,
      startDate: startDateOnly,
      endDate: endDateOnly,
      reason: data.reason?.trim() || null
    },
    include: {
      doctor: {
        include: { user: true }
      }
    }
  });

  // 2. Query affected appointments in date range
  const startOfDay = new Date(startDateOnly);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(endDateOnly);
  endOfDay.setHours(23, 59, 59, 999);

  const affectedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId: data.doctorId,
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startTime: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } }
    }
  });

  // 3. Mark/Cancel affected appointments & queue notifications
  for (const appointment of affectedAppointments) {
    const cancelReason = `Doctor is on leave: ${data.reason || "Scheduled absence"}`;

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELLED",
        cancellationReason: cancelReason
      }
    });

    // Create queued reminder record for patient
    await prisma.reminder.create({
      data: {
        appointmentId: appointment.id,
        recipientUserId: appointment.patient.userId,
        type: "APPOINTMENT",
        status: "PENDING",
        scheduledFor: new Date(),
        title: "Appointment Cancelled - Doctor on Leave",
        message: `Your appointment on ${appointment.startTime.toLocaleString()} with Dr. ${appointment.doctor.user.lastName} has been cancelled due to doctor leave.`
      }
    });

    // Send email notification safely
    try {
      await sendDoctorLeaveCancellationEmail({
        patientEmail: appointment.patient.user.email,
        patientName: `${appointment.patient.user.firstName} ${appointment.patient.user.lastName}`,
        doctorName: `${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}`,
        appointmentTime: appointment.startTime,
        reason: data.reason || "Doctor unavailability"
      });
    } catch (err) {
      console.warn("Failed to send leave cancellation email:", err);
    }
  }

  return {
    leave,
    cancelledAppointmentsCount: affectedAppointments.length
  };
};

export const getDoctorLeaves = async (doctorId: string) => {
  return prisma.doctorLeave.findMany({
    where: { doctorId },
    orderBy: { startDate: "asc" }
  });
};

export const deleteDoctorLeave = async (leaveId: string) => {
  return prisma.doctorLeave.delete({
    where: { id: leaveId }
  });
};
