import { get, post, del } from "../api/api";

export interface Doctor {
  id: string;
  userId: string;
  specialization?: string;
  licenseNumber?: string;
  qualification?: string;
  experienceYears?: number;
  consultationFee?: number;
  slotDuration?: number;
  bio?: string;
  isAvailable?: boolean;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    status?: string;
  };
  availability?: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}

export interface CreateDoctorInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  specialization: string;
  licenseNumber: string;
  qualification?: string;
  experienceYears?: number;
  consultationFee?: number;
  slotDuration?: number;
  bio?: string;
  workingHours?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}

export interface DoctorLeaveInput {
  doctorId?: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export async function getDoctors(): Promise<Doctor[]> {
  const response = await get<Doctor[]>("/doctors");
  return response.data ?? [];
}

export async function getDoctor(doctorId: string): Promise<Doctor> {
  const response = await get<Doctor>(`/doctors/${doctorId}`);
  if (!response.data) {
    throw new Error("Doctor information was not returned");
  }
  return response.data;
}

export async function createDoctor(data: CreateDoctorInput): Promise<Doctor> {
  const response = await post<Doctor>("/doctors", data);
  if (!response.data) {
    throw new Error("Doctor profile creation failed");
  }
  return response.data;
}

export async function addDoctorLeave(data: DoctorLeaveInput): Promise<any> {
  const response = await post<any>("/doctors/leave", data);
  return response.data;
}

export async function getDoctorLeaves(doctorId: string): Promise<any[]> {
  const response = await get<any[]>(`/doctors/${doctorId}/leaves`);
  return response.data ?? [];
}

export async function deleteDoctorLeave(leaveId: string): Promise<void> {
  await del(`/doctors/leaves/${leaveId}`);
}