import {
  get
} from "../api/api";

export interface Doctor {
  id: string;
  userId: string;

  specialization?: string;
  licenseNumber?: string;
  consultationFee?: number;
  isAvailable?: boolean;

  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    status?: string;
  };
}

export async function getDoctors(): Promise<Doctor[]> {
  const response =
    await get<Doctor[]>(
      "/doctors"
    );

  return response.data ?? [];
}

export async function getDoctor(
  doctorId: string
): Promise<Doctor> {
  const response =
    await get<Doctor>(
      `/doctors/${doctorId}`
    );

  if (!response.data) {
    throw new Error(
      "Doctor information was not returned"
    );
  }

  return response.data;
}