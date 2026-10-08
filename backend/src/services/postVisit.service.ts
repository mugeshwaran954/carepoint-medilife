import { prisma } from "../config/prisma.js";
import { generatePostVisitLLM } from "../integrations/llm/llm.service.js";
import { generateMedicationReminders } from "./medicationReminder.service.js";

export interface PrescriptionItemInput {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface CreatePostVisitInput {
  appointmentId: string;
  diagnosis?: string;
  notes: string;
  prescriptions?: PrescriptionItemInput[];
  followUpDate?: string;
  followUpInstructions?: string;
}

export const createPostVisitRecord = async (data: CreatePostVisitInput) => {
  const { appointmentId, diagnosis, notes, prescriptions, followUpDate, followUpInstructions } = data;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true }
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // 1. Create or update ClinicalNote
  const clinicalNote = await prisma.clinicalNote.upsert({
    where: { appointmentId },
    create: {
      appointmentId,
      diagnosis: diagnosis?.trim() || null,
      notes: notes.trim()
    },
    update: {
      diagnosis: diagnosis?.trim() || null,
      notes: notes.trim()
    }
  });

  // 2. Save Prescription & Prescription Items if provided
  let prescriptionRecord = null;
  if (prescriptions && prescriptions.length > 0) {
    // Delete existing prescription items if updating
    const existingPrescription = await prisma.prescription.findUnique({
      where: { appointmentId }
    });

    if (existingPrescription) {
      await prisma.prescriptionItem.deleteMany({
        where: { prescriptionId: existingPrescription.id }
      });
      prescriptionRecord = await prisma.prescription.update({
        where: { appointmentId },
        data: {
          items: {
            create: prescriptions.map((item) => ({
              medicationName: item.medicationName.trim(),
              dosage: item.dosage.trim(),
              frequency: item.frequency.trim(),
              duration: item.duration.trim(),
              instructions: item.instructions?.trim() || null
            }))
          }
        },
        include: { items: true }
      });
    } else {
      prescriptionRecord = await prisma.prescription.create({
        data: {
          appointmentId,
          items: {
            create: prescriptions.map((item) => ({
              medicationName: item.medicationName.trim(),
              dosage: item.dosage.trim(),
              frequency: item.frequency.trim(),
              duration: item.duration.trim(),
              instructions: item.instructions?.trim() || null
            }))
          }
        },
        include: { items: true }
      });
    }
  }

  // 3. Create or update FollowUp if specified
  if (followUpDate || followUpInstructions) {
    const scheduledAt = followUpDate ? new Date(followUpDate) : null;
    await prisma.followUp.create({
      data: {
        appointmentId,
        scheduledAt,
        instructions: followUpInstructions?.trim() || null,
        status: "PENDING"
      }
    });
  }

  // 4. Update appointment status to COMPLETED
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "COMPLETED", notes: notes.trim() }
  });

  // 5. Generate AI or Fallback PostVisitSummary
  const llmResult = await generatePostVisitLLM({
    clinicalNotes: notes,
    prescriptions,
    followUpInstructions
  });

  let postVisitSummaryData;
  if (llmResult) {
    postVisitSummaryData = {
      patientSummary: llmResult.patientSummary,
      medicationSchedule: llmResult.medicationSchedule,
      followUpSteps: llmResult.followUpSteps,
      generatedBy: "LLM"
    };
  } else {
    const medSchedule = prescriptions?.map(
      (p) => `${p.medicationName} (${p.dosage}) - Take ${p.frequency} for ${p.duration}. ${p.instructions ? `Notes: ${p.instructions}` : ""}`
    ) || [];

    const steps = [];
    if (followUpInstructions) steps.push(followUpInstructions);
    if (followUpDate) steps.push(`Scheduled follow-up on ${new Date(followUpDate).toLocaleDateString()}`);
    if (steps.length === 0) steps.push("Follow up as advised by your physician.");

    postVisitSummaryData = {
      patientSummary: diagnosis ? `Diagnosis: ${diagnosis}. Notes: ${notes}` : `Clinical Notes: ${notes}`,
      medicationSchedule: medSchedule,
      followUpSteps: steps,
      generatedBy: "FALLBACK"
    };
  }

  const postVisitSummary = await prisma.postVisitSummary.upsert({
    where: { appointmentId },
    create: {
      appointmentId,
      ...postVisitSummaryData
    },
    update: postVisitSummaryData
  });

  // Generate scheduled medication reminders safely
  try {
    await generateMedicationReminders(appointmentId);
  } catch (err) {
    console.warn("Failed generating medication reminders:", err);
  }

  return {
    appointmentId,
    clinicalNote,
    prescription: prescriptionRecord,
    postVisitSummary
  };
};

export const getPostVisitSummaryByAppointment = async (appointmentId: string) => {
  const summary = await prisma.postVisitSummary.findUnique({
    where: { appointmentId },
    include: {
      appointment: {
        include: {
          clinicalNote: true,
          prescription: {
            include: { items: true }
          },
          doctor: {
            include: { user: true }
          },
          patient: {
            include: { user: true }
          }
        }
      }
    }
  });

  return summary;
};
