import {
  get,
  post
} from "../api/api";

export interface PreVisitSummary {
  id: string;
  appointmentId: string;

  symptoms: string;
  duration?: string;
  additionalDetails?: string;

  urgencyLevel:
    | "LOW"
    | "MEDIUM"
    | "HIGH";

  chiefComplaint: string;

  suggestedQuestions: string[];

  generatedBy: "LLM" | "FALLBACK";

  createdAt: string;
  updatedAt: string;
}

export interface CreatePreVisitSummaryInput {
  appointmentId: string;
  symptoms: string;
  duration?: string;
  additionalDetails?: string;
}

export async function createPreVisitSummary(
  data: CreatePreVisitSummaryInput
): Promise<PreVisitSummary> {
  const response =
    await post<PreVisitSummary>(
      "/pre-visit-summaries",
      data
    );

  if (!response.data) {
    throw new Error(
      "Pre-visit summary was not returned"
    );
  }

  return response.data;
}

export async function getPreVisitSummary(
  appointmentId: string
): Promise<PreVisitSummary> {
  const response =
    await get<PreVisitSummary>(
      `/pre-visit-summaries/${appointmentId}`
    );

  if (!response.data) {
    throw new Error(
      "Pre-visit summary was not returned"
    );
  }

  return response.data;
}