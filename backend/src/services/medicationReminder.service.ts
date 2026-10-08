import { prisma } from "../config/prisma.js";

export const generateMedicationReminders = async (appointmentId: string) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      prescription: {
        include: { items: true }
      }
    }
  });

  if (!appointment || !appointment.prescription || !appointment.prescription.items.length) {
    return [];
  }

  const recipientUserId = appointment.patient.userId;
  const createdReminders = [];

  for (const item of appointment.prescription.items) {
    // Parse duration string, default to 7 days if unparseable
    const match = item.duration.match(/\d+/);
    const durationDays = match ? parseInt(match[0], 10) : 7;

    const freq = item.frequency.toUpperCase();
    const now = new Date();

    const scheduledTimes: Date[] = [];

    for (let day = 0; day < Math.min(durationDays, 30); day++) {
      const baseDate = new Date(now.valueOf() + day * 24 * 60 * 60 * 1000);

      if (freq === "TWICE_DAILY") {
        const morning = new Date(baseDate);
        morning.setHours(9, 0, 0, 0);
        const evening = new Date(baseDate);
        evening.setHours(21, 0, 0, 0);
        if (morning > now) scheduledTimes.push(morning);
        if (evening > now) scheduledTimes.push(evening);
      } else if (freq === "THREE_TIMES_DAILY") {
        const t1 = new Date(baseDate);
        t1.setHours(8, 0, 0, 0);
        const t2 = new Date(baseDate);
        t2.setHours(14, 0, 0, 0);
        const t3 = new Date(baseDate);
        t3.setHours(20, 0, 0, 0);
        if (t1 > now) scheduledTimes.push(t1);
        if (t2 > now) scheduledTimes.push(t2);
        if (t3 > now) scheduledTimes.push(t3);
      } else if (freq === "EVERY_8_HOURS") {
        for (let h = 0; h < 24; h += 8) {
          const t = new Date(baseDate);
          t.setHours(h, 0, 0, 0);
          if (t > now) scheduledTimes.push(t);
        }
      } else {
        // Default ONCE_DAILY / AS_NEEDED
        const t = new Date(baseDate);
        t.setHours(9, 0, 0, 0);
        if (t > now) scheduledTimes.push(t);
      }
    }

    for (const time of scheduledTimes) {
      // Check for duplicate reminder
      const existing = await prisma.reminder.findFirst({
        where: {
          recipientUserId,
          appointmentId,
          type: "MEDICATION",
          scheduledFor: time,
          title: `Medication Reminder: ${item.medicationName}`
        }
      });

      if (!existing) {
        const reminder = await prisma.reminder.create({
          data: {
            recipientUserId,
            appointmentId,
            type: "MEDICATION",
            status: "PENDING",
            scheduledFor: time,
            title: `Medication Reminder: ${item.medicationName}`,
            message: `Please take ${item.medicationName} (${item.dosage}). ${item.instructions ? `Instructions: ${item.instructions}` : ""}`
          }
        });
        createdReminders.push(reminder);
      }
    }
  }

  return createdReminders;
};
