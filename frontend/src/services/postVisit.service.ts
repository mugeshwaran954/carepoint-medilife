import { get, post } from "../api/api";

export interface PrescriptionItem {
  id?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PostVisitSummaryData {
  id: string;
  appointmentId: string;
  patientSummary: string;
  medicationSchedule: string[];
  followUpSteps: string[];
  generatedBy: "LLM" | "FALLBACK";
  createdAt: string;
  updatedAt: string;
  appointment?: any;
}

export interface CreatePostVisitInput {
  appointmentId: string;
  diagnosis?: string;
  notes: string;
  prescriptions?: PrescriptionItem[];
  followUpDate?: string;
  followUpInstructions?: string;
}

export async function createPostVisitSummary(
  data: CreatePostVisitInput
): Promise<any> {
  const response = await post<any>("/post-visit-summaries", data);

  if (!response.data) {
    throw new Error("Post-visit summary was not created");
  }

  return response.data;
}

export async function getPostVisitSummary(
  appointmentId: string
): Promise<PostVisitSummaryData> {
  const response = await get<PostVisitSummaryData>(
    `/post-visit-summaries/${appointmentId}`
  );

  if (!response.data) {
    throw new Error("Post-visit summary was not returned");
  }

  return response.data;
}
