import {
  get,
  post
} from "../api/api";

export interface FollowUp {
  id: string;
  appointmentId: string;

  scheduledAt?: string;
  status: string;

  instructions?: string;
  patientNotes?: string;
  doctorNotes?: string;

  createdAt: string;
  updatedAt: string;

  appointment?: unknown;
}

export interface CreateFollowUpInput {
  scheduledAt?: string;
  instructions?: string;
}

export async function getAppointmentFollowUps(
  appointmentId: string
): Promise<FollowUp[]> {
  const response =
    await get<FollowUp[]>(
      `/appointments/${appointmentId}/follow-ups`
    );

  return response.data ?? [];
}

export async function getFollowUp(
  followUpId: string
): Promise<FollowUp> {
  const response =
    await get<FollowUp>(
      `/follow-ups/${followUpId}`
    );

  if (!response.data) {
    throw new Error(
      "Follow-up information was not returned"
    );
  }

  return response.data;
}

export async function createFollowUp(
  appointmentId: string,
  data: CreateFollowUpInput
): Promise<FollowUp> {
  const response =
    await post<FollowUp>(
      `/appointments/${appointmentId}/follow-ups`,
      data
    );

  if (!response.data) {
    throw new Error(
      "Follow-up was not returned"
    );
  }

  return response.data;
}