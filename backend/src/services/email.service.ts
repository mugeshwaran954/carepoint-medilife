import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export interface BookingConfirmationEmailInput {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  appointmentTime: Date;
  type: string;
}

export interface AppointmentCancellationEmailInput {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  appointmentTime: Date;
  reason?: string;
}

export interface AppointmentReminderEmailInput {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  appointmentTime: Date;
}

export interface DoctorLeaveCancellationEmailInput {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  appointmentTime: Date;
  reason: string;
}

/**
 * Creates nodemailer transporter if SMTP credentials exist, else returns null.
 */
function createTransporter() {
  if (!env.smtpHost || !env.smtpPort) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: env.smtpUser && env.smtpPassword ? {
      user: env.smtpUser,
      pass: env.smtpPassword
    } : undefined
  });
}

/**
 * Generic helper to send email with retry attempts and console fallback logging.
 */
export async function sendEmail({
  to,
  subject,
  html,
  retries = 2
}: {
  to: string;
  subject: string;
  html: string;
  retries?: number;
}): Promise<boolean> {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[EMAIL DISPATCH MOCK/FALLBACK]
To: ${to}
Subject: ${subject}
Content: ${html.replace(/<[^>]*>/g, " ")}`);
    return true;
  }

  let attempt = 0;
  while (attempt <= retries) {
    try {
      await transporter.sendMail({
        from: env.smtpFrom,
        to,
        subject,
        html
      });
      console.log(`[EMAIL DISPATCH SUCCESS] To: ${to} | Subject: ${subject}`);
      return true;
    } catch (err) {
      attempt++;
      console.warn(`[EMAIL DISPATCH ATTEMPT ${attempt} FAILED] To: ${to}. Error:`, err instanceof Error ? err.message : err);
      if (attempt > retries) {
        console.log(`[EMAIL FALLBACK - MAX RETRIES EXCEEDED] Logged notification to console for ${to}`);
        return false;
      }
    }
  }
  return false;
}

// 1. Booking confirmation
export async function sendBookingConfirmationEmail(input: BookingConfirmationEmailInput): Promise<boolean> {
  const dateFormatted = new Date(input.appointmentTime).toLocaleString();
  return sendEmail({
    to: input.patientEmail,
    subject: `Appointment Confirmed with Dr. ${input.doctorName}`,
    html: `
      <h2>Appointment Confirmation</h2>
      <p>Hello ${input.patientName},</p>
      <p>Your <strong>${input.type}</strong> appointment with <strong>Dr. ${input.doctorName}</strong> has been successfully booked.</p>
      <p><strong>Date & Time:</strong> ${dateFormatted}</p>
      <p>Thank you for choosing Healthcare Appointment Manager.</p>
    `
  });
}

// 2. Appointment cancellation
export async function sendAppointmentCancellationEmail(input: AppointmentCancellationEmailInput): Promise<boolean> {
  const dateFormatted = new Date(input.appointmentTime).toLocaleString();
  return sendEmail({
    to: input.patientEmail,
    subject: `Appointment Cancelled - Dr. ${input.doctorName}`,
    html: `
      <h2>Appointment Cancellation Notice</h2>
      <p>Hello ${input.patientName},</p>
      <p>Your appointment scheduled for <strong>${dateFormatted}</strong> with <strong>Dr. ${input.doctorName}</strong> has been cancelled.</p>
      ${input.reason ? `<p><strong>Reason:</strong> ${input.reason}</p>` : ""}
      <p>Please log in to reschedule your visit if needed.</p>
    `
  });
}

// 3. Appointment reminder
export async function sendAppointmentReminderEmail(input: AppointmentReminderEmailInput): Promise<boolean> {
  const dateFormatted = new Date(input.appointmentTime).toLocaleString();
  return sendEmail({
    to: input.patientEmail,
    subject: `Reminder: Upcoming Appointment with Dr. ${input.doctorName}`,
    html: `
      <h2>Upcoming Appointment Reminder</h2>
      <p>Hello ${input.patientName},</p>
      <p>This is a reminder for your upcoming appointment with <strong>Dr. ${input.doctorName}</strong>.</p>
      <p><strong>Scheduled Time:</strong> ${dateFormatted}</p>
      <p>Please arrive 10 minutes prior to your appointment time.</p>
    `
  });
}

// 4. Doctor leave cancellation/conflict notification
export async function sendDoctorLeaveCancellationEmail(input: DoctorLeaveCancellationEmailInput): Promise<boolean> {
  const dateFormatted = new Date(input.appointmentTime).toLocaleString();
  return sendEmail({
    to: input.patientEmail,
    subject: `Important: Appointment Cancelled (Doctor Absence) - Dr. ${input.doctorName}`,
    html: `
      <h2>Doctor Absence Notice</h2>
      <p>Hello ${input.patientName},</p>
      <p>We regret to inform you that your appointment on <strong>${dateFormatted}</strong> with <strong>Dr. ${input.doctorName}</strong> must be cancelled due to doctor unavailability.</p>
      <p><strong>Reason:</strong> ${input.reason}</p>
      <p>We apologize for the inconvenience and invite you to log into your portal to select a new appointment slot.</p>
    `
  });
}
