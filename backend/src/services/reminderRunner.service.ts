import { prisma } from "../config/prisma.js";
import { sendEmail } from "./email.service.js";

let runnerInterval: NodeJS.Timeout | null = null;

export const processDueReminders = async () => {
  try {
    const now = new Date();
    const dueReminders = await prisma.reminder.findMany({
      where: {
        status: "PENDING",
        scheduledFor: { lte: now }
      },
      include: {
        recipient: true
      },
      take: 50
    });

    if (dueReminders.length === 0) {
      return;
    }

    console.log(`[REMINDER RUNNER] Processing ${dueReminders.length} due reminder(s)...`);

    for (const reminder of dueReminders) {
      try {
        if (reminder.recipient && reminder.recipient.email) {
          await sendEmail({
            to: reminder.recipient.email,
            subject: reminder.title,
            html: `
              <h2>${reminder.title}</h2>
              <p>Hello ${reminder.recipient.firstName},</p>
              <p>${reminder.message}</p>
              <p>Health Appointment Manager Notification</p>
            `
          });
        }

        await prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: "SENT",
            sentAt: new Date()
          }
        });
      } catch (err) {
        console.error(`[REMINDER RUNNER] Failed processing reminder ${reminder.id}:`, err);
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: "FAILED" }
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[REMINDER RUNNER ERROR]", err);
  }
};

export const startReminderRunner = (intervalMs = 60000) => {
  if (runnerInterval) return;

  console.log(`[REMINDER RUNNER STARTED] Interval: ${intervalMs}ms`);

  // Run immediately on startup
  processDueReminders().catch(() => {});

  runnerInterval = setInterval(() => {
    processDueReminders().catch(() => {});
  }, intervalMs);
};

export const stopReminderRunner = () => {
  if (runnerInterval) {
    clearInterval(runnerInterval);
    runnerInterval = null;
    console.log("[REMINDER RUNNER STOPPED]");
  }
};
