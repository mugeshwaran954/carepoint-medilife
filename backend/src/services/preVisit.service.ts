import { prisma } from "../config/prisma.js";
import { generatePreVisitLLM } from "../integrations/llm/llm.service.js";

export interface CreatePreVisitSummaryInput {
  appointmentId: string;
  symptoms: string;
  duration?: string;
  additionalDetails?: string;
}

export const createPreVisitSummary = async (
  data: CreatePreVisitSummaryInput
) => {
  const existing =
    await prisma.preVisitSummary.findUnique({
      where: {
        appointmentId: data.appointmentId
      }
    });

  if (existing) {
    return existing;
  }

  const symptoms = data.symptoms.trim();
  const duration = data.duration?.trim() || undefined;
  const additionalDetails = data.additionalDetails?.trim() || undefined;

  // Try LLM generation first
  const llmResult = await generatePreVisitLLM({
    symptoms,
    duration,
    additionalDetails
  });

  if (llmResult) {
    return prisma.preVisitSummary.create({
      data: {
        appointmentId: data.appointmentId,
        symptoms,
        duration: duration || null,
        additionalDetails: additionalDetails || null,
        urgencyLevel: llmResult.urgencyLevel,
        chiefComplaint: llmResult.chiefComplaint,
        suggestedQuestions: llmResult.suggestedQuestions,
        generatedBy: "LLM"
      }
    });
  }

  // Fallback generation if LLM is unavailable or fails
  const combinedText = `${symptoms} ${additionalDetails || ""}`.toLowerCase();

  let urgencyLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";

  if (
    combinedText.includes("severe") ||
    combinedText.includes("chest pain") ||
    combinedText.includes("difficulty breathing") ||
    combinedText.includes("shortness of breath") ||
    combinedText.includes("fainting") ||
    combinedText.includes("unconscious") ||
    combinedText.includes("heavy bleeding")
  ) {
    urgencyLevel = "HIGH";
  } else if (
    combinedText.includes("fever") ||
    combinedText.includes("vomiting") ||
    combinedText.includes("dizziness") ||
    combinedText.includes("persistent") ||
    combinedText.includes("moderate") ||
    combinedText.includes("pain")
  ) {
    urgencyLevel = "MEDIUM";
  }

  const chiefComplaint =
    symptoms.length > 120
      ? `${symptoms.substring(0, 117)}...`
      : symptoms;

  const suggestedQuestions = [
    "When did the symptoms first begin?",
    "Have the symptoms become better or worse over time?",
    "Are there any other symptoms or factors the doctor should know about?"
  ];

  return prisma.preVisitSummary.create({
    data: {
      appointmentId: data.appointmentId,
      symptoms,
      duration: duration || null,
      additionalDetails: additionalDetails || null,
      urgencyLevel,
      chiefComplaint,
      suggestedQuestions,
      generatedBy: "FALLBACK"
    }
  });
};

export const getPreVisitSummaryByAppointment =
  async (
    appointmentId: string
  ) => {
    return prisma.preVisitSummary.findUnique({
      where: {
        appointmentId
      }
    });
  };