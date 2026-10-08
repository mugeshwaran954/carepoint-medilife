import { get } from "../api/api";

export interface CalendarStatus {
  isConnected: boolean;
  connection?: {
    id: string;
    provider: string;
    calendarId?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export async function getGoogleConnectUrl(): Promise<string> {
  const response = await get<{ url: string }>("/calendar/google/connect");
  if (!response.data?.url) {
    throw new Error(response.message || "Google Calendar integration is not configured on the server.");
  }
  return response.data.url;
}

export async function getCalendarStatus(): Promise<CalendarStatus> {
  const response = await get<CalendarStatus>("/calendar/status");
  return response.data ?? { isConnected: false };
}
