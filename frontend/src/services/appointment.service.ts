import {
  get,
  post,
  patch
} from "../api/api";

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  createdById?: string;

  startTime: string;
  endTime: string;

  type: string;
  status: string;

  reason?: string;
  notes?: string;
  cancellationReason?: string;

  createdAt: string;
  updatedAt: string;

  patient?: unknown;
  doctor?: unknown;
}

export interface CreateAppointmentInput {
  doctorId: string;
  startTime: string;
  endTime: string;
  type: string;
  reason?: string;
  notes?: string;
}

export interface CancelAppointmentInput {
  cancellationReason: string;
}

export interface UpdateAppointmentStatusInput {
  status:
    | "CONFIRMED"
    | "COMPLETED"
    | "NO_SHOW";
}

export async function getAppointments(): Promise<
  Appointment[]
> {
  const response =
    await get<Appointment[]>(
      "/appointments"
    );

  return response.data ?? [];
}

export async function getAppointment(
  appointmentId: string
): Promise<Appointment> {
  const response =
    await get<Appointment>(
      `/appointments/${appointmentId}`
    );

  if (!response.data) {
    throw new Error(
      "Appointment information was not returned"
    );
  }

  return response.data;
}

export async function createAppointment(
  data: CreateAppointmentInput
): Promise<Appointment> {
  const response =
    await post<Appointment>(
      "/appointments",
      data
    );

  if (!response.data) {
    throw new Error(
      "Appointment was not returned"
    );
  }

  return response.data;
}

export async function cancelAppointment(
  appointmentId: string,
  data: CancelAppointmentInput
): Promise<Appointment> {
  const response =
    await patch<Appointment>(
      `/appointments/${appointmentId}/cancel`,
      data
    );

  if (!response.data) {
    throw new Error(
      "Cancelled appointment was not returned"
    );
  }

  return response.data;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  data: UpdateAppointmentStatusInput
): Promise<Appointment> {
  const response =
    await patch<Appointment>(
      `/appointments/${appointmentId}/status`,
      data
    );

  if (!response.data) {
    throw new Error(
      "Updated appointment was not returned"
    );
  }

  return response.data;
}