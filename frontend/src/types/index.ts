export type UserRole =
  | "PATIENT"
  | "DOCTOR"
  | "ADMIN";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user?: User;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  createdById: string;
  startTime: string;
  endTime: string;
  type: string;
  status:
    | "SCHEDULED"
    | "CONFIRMED"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW";
  reason?: string;
  notes?: string;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
  patient?: unknown;
  doctor?: unknown;
}

export interface FollowUp {
  id: string;
  appointmentId: string;
  scheduledAt?: string;
  status:
    | "PENDING"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";
  instructions?: string;
  patientNotes?: string;
  doctorNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

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
  createdAt?: string;
  updatedAt?: string;
}