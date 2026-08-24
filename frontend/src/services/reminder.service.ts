import {
  get
} from "../api/api";

export interface Reminder {
  id: string;

  appointmentId?: string;
  followUpId?: string;
  recipientUserId: string;

  type:
    | "APPOINTMENT"
    | "FOLLOW_UP"
    | "MEDICATION"
    | "CUSTOM";

  status:
    | "PENDING"
    | "SENT"
    | "FAILED"
    | "CANCELLED";

  scheduledFor: string;
  sentAt?: string;

  title: string;
  message: string;

  createdAt: string;
  updatedAt: string;

  appointment?: unknown;
  followUp?: unknown;
  recipient?: unknown;
}

export async function getReminders(): Promise<
  Reminder[]
> {
  const response =
    await get<Reminder[]>(
      "/reminders"
    );

  return response.data ?? [];
}

export async function getReminder(
  reminderId: string
): Promise<Reminder> {
  const response =
    await get<Reminder>(
      `/reminders/${reminderId}`
    );

  if (!response.data) {
    throw new Error(
      "Reminder information was not returned"
    );
  }

  return response.data;
}