import "./style.css";

import {
  isAuthenticated,
  getStoredUser,
  getCurrentUser,
  logout
} from "./auth/auth";

import {
  getAppointments,
  createAppointment,
  cancelAppointment,
  updateAppointmentStatus
} from "./services/appointment.service";
import type { Appointment } from "./services/appointment.service";

import {
  getDoctors,
  createDoctor,
  addDoctorLeave,
  getDoctorLeaves,
  deleteDoctorLeave
} from "./services/doctor.service";
import type { Doctor } from "./services/doctor.service";

import {
  getAppointmentFollowUps,
  createFollowUp
} from "./services/followUp.service";
import type { FollowUp } from "./services/followUp.service";

import {
  getReminders
} from "./services/reminder.service";
import type { Reminder } from "./services/reminder.service";

import {
  createPreVisitSummary,
  getPreVisitSummary
} from "./services/preVisit.service";
import type { PreVisitSummary } from "./services/preVisit.service";

import {
  createPostVisitSummary,
  getPostVisitSummary
} from "./services/postVisit.service";
import type { PostVisitSummaryData } from "./services/postVisit.service";

import {
  getCalendarStatus,
  getGoogleConnectUrl
} from "./services/calendar.service";
import type { CalendarStatus } from "./services/calendar.service";

import { renderLogin } from "./pages/login";

/**
 * ---------------------------------------------------------
 * Application Root & Loading
 * ---------------------------------------------------------
 */

function getApp(): HTMLDivElement {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    throw new Error("App root element not found");
  }
  return app;
}

function renderLoading(): void {
  getApp().innerHTML = `
    <div class="app-loading">
      <div class="loading-card">
        <div class="loading-icon">🏥</div>
        <h1>CarePoint MediLife</h1>
        <p>Loading your healthcare workspace...</p>
      </div>
    </div>
  `;
}

/**
 * ---------------------------------------------------------
 * Formatting Helpers
 * ---------------------------------------------------------
 */

function formatDate(value: string | Date | undefined): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatTime(value: string | Date | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const errObj = error as any;
    if (errObj.response && errObj.response.status === 409) {
      return "This slot was just booked by another patient. Please choose another slot.";
    }
    if (errObj.status === 409 || errObj.message?.includes("slot was just booked")) {
      return "This slot was just booked by another patient. Please choose another slot.";
    }
    if (typeof errObj.message === "string" && errObj.message.trim()) {
      return errObj.message;
    }
  }
  return fallback;
}

function getDoctorName(doctor: Doctor): string {
  const firstName = doctor.user?.firstName ?? "";
  const lastName = doctor.user?.lastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName ? `Dr. ${fullName}` : "Doctor";
}

function getDoctorSpecialization(doctor: Doctor): string {
  return doctor.specialization ?? "General Medicine";
}

function getAppointmentDoctorName(appointment: any): string {
  const doctor = appointment.doctor;
  if (!doctor) return "Doctor";
  const firstName = doctor.user?.firstName ?? "";
  const lastName = doctor.user?.lastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName ? `Dr. ${fullName}` : "Doctor";
}

function getAppointmentPatientName(appointment: any): string {
  const patient = appointment.patient;
  if (!patient) return "Patient";
  const firstName = patient.user?.firstName ?? "";
  const lastName = patient.user?.lastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || "Patient";
}

function formatVisitingHours(doctor: Doctor): string {
  if (!doctor.availability || doctor.availability.length === 0) {
    return "Mon–Fri: 09:00 AM – 05:00 PM";
  }

  const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const activeDays = [...doctor.availability]
    .filter((a) => (a as any).isActive !== false)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  if (activeDays.length === 0) {
    return "Mon–Fri: 09:00 AM – 05:00 PM";
  }

  const formatT = (timeStr: string) => {
    const [h, m] = timeStr.split(":");
    const hours = parseInt(h, 10);
    const suffix = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${m} ${suffix}`;
  };

  const first = activeDays[0];
  const timeRange = `${formatT(first.startTime)} – ${formatT(first.endTime)}`;

  if (activeDays.length === 5 && activeDays[0].dayOfWeek === 1 && activeDays[4].dayOfWeek === 5) {
    return `Mon–Fri: ${timeRange}`;
  } else if (activeDays.length === 6 && activeDays[0].dayOfWeek === 1 && activeDays[5].dayOfWeek === 6) {
    return `Mon–Sat: ${timeRange}`;
  } else if (activeDays.length === 7) {
    return `Daily: ${timeRange}`;
  } else if (activeDays.length === 1) {
    return `${daysMap[first.dayOfWeek]}: ${timeRange}`;
  }

  const dayNames = activeDays.map((d) => daysMap[d.dayOfWeek]).join(", ");
  return `${dayNames}: ${timeRange}`;
}

/**
 * ---------------------------------------------------------
 * Data Loaders
 * ---------------------------------------------------------
 */

async function loadDashboardData(): Promise<{
  appointments: Appointment[];
  followUps: FollowUp[];
  reminders: Reminder[];
  doctors: Doctor[];
  calendarStatus: CalendarStatus;
}> {
  const [appointments, reminders, doctors, calendarStatus] = await Promise.all([
    getAppointments().catch(() => []),
    getReminders().catch(() => []),
    getDoctors().catch(() => []),
    getCalendarStatus().catch(() => ({ isConnected: false }))
  ]);

  let followUps: FollowUp[] = [];
  try {
    const followUpPromises = appointments.slice(0, 10).map((apt) =>
      getAppointmentFollowUps(apt.id).catch(() => [])
    );
    const results = await Promise.all(followUpPromises);
    followUps = results.flat();
  } catch {
    followUps = [];
  }

  return { appointments, followUps, reminders, doctors, calendarStatus };
}

/**
 * ---------------------------------------------------------
 * Component Renderers
 * ---------------------------------------------------------
 */

function renderAppointmentsList(appointments: Appointment[], isCompact = false): string {
  const user = getStoredUser();
  if (!user) {
    return `<div class="empty-state compact"><p>Authentication required</p></div>`;
  }

  if (appointments.length === 0) {
    return `
      <div class="empty-state compact">
        <div class="empty-icon">📅</div>
        <h3>No appointments found</h3>
        <p>Your scheduled consultations will appear here.</p>
      </div>
    `;
  }

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const displayList = isCompact ? sorted.slice(0, 5) : sorted;

  return `
    <div class="appointment-list">
      ${displayList
        .map((appointment: any) => {
          const isCancelled = appointment.status === "CANCELLED";
          const isCompleted = appointment.status === "COMPLETED";
          const isNoShow = appointment.status === "NO_SHOW";
          const canCancel = !isCancelled && !isCompleted && !isNoShow;
          const isDoctorOrAdmin = user.role === "DOCTOR" || user.role === "ADMIN";

          const doctorName = getAppointmentDoctorName(appointment);
          const patientName = getAppointmentPatientName(appointment);
          const statusClass = appointment.status.toLowerCase();

          return `
            <div class="appointment-row" data-appointment-id="${escapeHtml(appointment.id)}">
              <div class="appointment-date-badge">
                <span class="badge-month">${new Date(appointment.startTime).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</span>
                <span class="badge-day">${new Date(appointment.startTime).getDate()}</span>
                <span class="badge-time">${formatTime(appointment.startTime)}</span>
              </div>

              <div class="appointment-info">
                <div class="appointment-title-row">
                  <strong>${escapeHtml(appointment.type)}</strong>
                  <span class="status-badge status-${statusClass}">
                    ${escapeHtml(appointment.status)}
                  </span>
                </div>

                <p class="appointment-participants">
                  ${
                    user.role === "PATIENT"
                      ? `👨‍⚕️ <strong>${escapeHtml(doctorName)}</strong>`
                      : `👤 <strong>${escapeHtml(patientName)}</strong>`
                  }
                </p>

                <p class="appointment-reason">
                  ${appointment.reason ? `Reason: ${escapeHtml(appointment.reason)}` : "General health consultation"}
                </p>

                ${
                  appointment.cancellationReason
                    ? `<div class="cancellation-alert">⚠️ Cancelled: ${escapeHtml(appointment.cancellationReason)}</div>`
                    : ""
                }
              </div>

              <div class="appointment-actions">
                ${
                  !isCancelled
                    ? `
                      <button
                        class="btn btn-secondary btn-sm"
                        type="button"
                        data-action="pre-visit"
                        data-appointment-id="${escapeHtml(appointment.id)}"
                      >
                        🧠 Pre-Visit AI
                      </button>
                    `
                    : ""
                }

                ${
                  isCompleted || (user.role === "DOCTOR" && (appointment.status === "CONFIRMED" || appointment.status === "COMPLETED"))
                    ? `
                      <button
                        class="btn btn-secondary btn-sm"
                        type="button"
                        data-action="post-visit"
                        data-appointment-id="${escapeHtml(appointment.id)}"
                      >
                        📋 Post-Visit Rx
                      </button>
                    `
                    : ""
                }

                ${
                  isDoctorOrAdmin && appointment.status === "SCHEDULED"
                    ? `
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        data-action="status"
                        data-status="CONFIRMED"
                        data-appointment-id="${escapeHtml(appointment.id)}"
                      >
                        Confirm
                      </button>
                    `
                    : ""
                }

                ${
                  isDoctorOrAdmin && appointment.status === "CONFIRMED"
                    ? `
                      <button
                        type="button"
                        class="btn btn-success btn-sm"
                        data-action="complete-visit-modal"
                        data-appointment-id="${escapeHtml(appointment.id)}"
                      >
                        Complete Visit
                      </button>
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        data-action="status"
                        data-status="NO_SHOW"
                        data-appointment-id="${escapeHtml(appointment.id)}"
                      >
                        No-Show
                      </button>
                    `
                    : ""
                }

                ${
                  user.role === "DOCTOR" && !isCancelled && !isCompleted && !isNoShow
                    ? `
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        data-action="create-follow-up"
                        data-appointment-id="${escapeHtml(appointment.id)}"
                      >
                        + Follow-up
                      </button>
                    `
                    : ""
                }

                ${
                  canCancel
                    ? `
                      <button
                        type="button"
                        class="btn btn-danger-outline btn-sm"
                        data-action="cancel"
                        data-appointment-id="${escapeHtml(appointment.id)}"
                      >
                        Cancel
                      </button>
                    `
                    : ""
                }
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderFollowUpsList(followUps: FollowUp[], isCompact = false): string {
  if (followUps.length === 0) {
    return `
      <div class="empty-state compact">
        <div class="empty-icon">🔄</div>
        <h3>No follow-ups</h3>
        <p>Follow-up care instructions will appear here.</p>
      </div>
    `;
  }

  const displayList = isCompact ? followUps.slice(0, 5) : followUps;

  return `
    <div class="follow-up-list">
      ${displayList
        .map(
          (fu) => `
            <div class="follow-up-card">
              <div class="follow-up-icon">🔄</div>
              <div class="reminder-content">
                <div class="follow-up-header">
                  <strong>Scheduled Follow-up</strong>
                  <span class="status-badge status-${fu.status.toLowerCase()}">${escapeHtml(fu.status)}</span>
                </div>
                <p class="text-muted"><small>📅 ${fu.scheduledAt ? formatDate(fu.scheduledAt) : "Pending scheduling"}</small></p>
                ${
                  fu.instructions
                    ? `<p class="follow-up-instructions"><strong>Instructions:</strong> ${escapeHtml(fu.instructions)}</p>`
                    : ""
                }
                ${
                  fu.doctorNotes
                    ? `<p class="follow-up-notes"><strong>Doctor notes:</strong> ${escapeHtml(fu.doctorNotes)}</p>`
                    : ""
                }
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRemindersList(reminders: Reminder[], isCompact = false): string {
  if (reminders.length === 0) {
    return `
      <div class="empty-state compact">
        <div class="empty-icon">🔔</div>
        <h3>No active reminders</h3>
        <p>Medication and appointment reminders will be listed here.</p>
      </div>
    `;
  }

  const displayList = isCompact ? reminders.slice(0, 5) : reminders;

  return `
    <div class="reminder-list">
      ${displayList
        .map((rem) => {
          let typeIcon = "🔔";
          if (rem.type === "MEDICATION") typeIcon = "💊";
          if (rem.type === "FOLLOW_UP") typeIcon = "🔄";
          if (rem.type === "APPOINTMENT") typeIcon = "📅";

          return `
            <div class="reminder-card">
              <div class="reminder-icon">${typeIcon}</div>
              <div class="reminder-content">
                <div class="reminder-header">
                  <strong>${escapeHtml(rem.title)}</strong>
                  <span class="status-badge status-${rem.status.toLowerCase()}">${escapeHtml(rem.status)}</span>
                </div>
                <p>${escapeHtml(rem.message)}</p>
                <small class="text-muted">
                  ⏰ Scheduled: ${formatDate(rem.scheduledFor)} at ${formatTime(rem.scheduledFor)}
                  ${rem.sentAt ? ` · Sent: ${formatTime(rem.sentAt)}` : ""}
                </small>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderDoctorsList(doctors: Doctor[], isAdmin = false): string {
  if (doctors.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">👨‍⚕️</div>
        <h3>No doctors found</h3>
        <p>No doctor profiles match the current filter.</p>
      </div>
    `;
  }

  return `
    <div class="doctor-grid">
      ${doctors
        .map((doctor) => {
          const docName = getDoctorName(doctor);
          const spec = getDoctorSpecialization(doctor);
          const fee = doctor.consultationFee ? `₹${doctor.consultationFee}` : "Standard";
          const slot = doctor.slotDuration ?? 30;
          const visitingHours = formatVisitingHours(doctor);

          return `
            <div class="doctor-card">
              <div class="doctor-card-header">
                <div class="doctor-avatar">👨‍⚕️</div>
                <div class="doctor-meta">
                  <h3>${escapeHtml(docName)}</h3>
                  <span class="badge-specialization">${escapeHtml(spec)}</span>
                </div>
              </div>

              <!-- VISITING HOURS & SCHEDULE PREVIEW -->
              <div class="visiting-hours-box">
                <span class="icon">⏰</span>
                <div class="schedule-text">
                  <strong>Visiting Hours</strong>
                  <span>${escapeHtml(visitingHours)}</span>
                </div>
              </div>

              <div class="doctor-details-grid">
                <div class="detail-item">
                  <span class="detail-label">Qualification</span>
                  <strong>${escapeHtml(doctor.qualification || "MBBS")}</strong>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Experience</span>
                  <strong>${doctor.experienceYears ? `${doctor.experienceYears} Years` : "Experienced"}</strong>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Consultation Fee</span>
                  <strong>${fee}</strong>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Slot Duration</span>
                  <strong>${slot} mins</strong>
                </div>
              </div>

              ${doctor.bio ? `<p class="doctor-bio">${escapeHtml(doctor.bio)}</p>` : ""}

              <div class="doctor-card-actions">
                ${
                  isAdmin
                    ? `
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        data-action="manage-doctor-leaves"
                        data-doctor-id="${escapeHtml(doctor.id)}"
                      >
                        🏖️ Manage Leaves & Absences
                      </button>
                    `
                    : `
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        data-action="book-with-doctor"
                        data-doctor-id="${escapeHtml(doctor.id)}"
                      >
                        Book Slot
                      </button>
                    `
                }
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

/**
 * ---------------------------------------------------------
 * Interactive Modals
 * ---------------------------------------------------------
 */

// 1. Appointment Booking Modal with Specialization Filter & Pre-Visit Symptoms
async function openBookingModal(preselectedDoctorId?: string): Promise<void> {
  const existingModal = document.querySelector("#booking-modal");
  if (existingModal) existingModal.remove();

  const doctors = await getDoctors();
  const availableDoctors = doctors.filter(
    (d) => d.isAvailable !== false && d.user?.status !== "INACTIVE"
  );

  const specializations = Array.from(
    new Set(availableDoctors.map((d) => getDoctorSpecialization(d)).filter(Boolean))
  );

  const modal = document.createElement("div");
  modal.id = "booking-modal";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <p class="eyebrow">APPOINTMENT BOOKING</p>
          <h2>Schedule a Consultation</h2>
          <p>Choose a specialist, convenient time slot, and share your symptoms for AI triage.</p>
        </div>
        <button id="close-booking-modal" class="modal-close-btn" type="button">×</button>
      </div>

      <form id="booking-form" class="modal-form">
        <div class="form-row">
          <div class="form-group">
            <label for="filter-specialization">Filter by Specialisation</label>
            <select id="filter-specialization" class="form-control">
              <option value="">All Specialisations</option>
              ${specializations.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("")}
            </select>
          </div>

          <div class="form-group">
            <label for="booking-doctor">Doctor *</label>
            <select id="booking-doctor" name="doctorId" class="form-control" required>
              <option value="" selected disabled>Select a doctor</option>
              ${availableDoctors
                .map(
                  (d) => `
                    <option value="${escapeHtml(d.id)}" ${preselectedDoctorId === d.id ? "selected" : ""}>
                      ${escapeHtml(getDoctorName(d))} (${escapeHtml(getDoctorSpecialization(d))}) · ${d.slotDuration ?? 30}m
                    </option>
                  `
                )
                .join("")}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="booking-start">Start Time *</label>
            <input id="booking-start" name="startTime" type="datetime-local" class="form-control" required />
          </div>

          <div class="form-group">
            <label for="booking-end">End Time *</label>
            <input id="booking-end" name="endTime" type="datetime-local" class="form-control" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="booking-type">Appointment Type</label>
            <select id="booking-type" name="type" class="form-control" required>
              <option value="CONSULTATION">Consultation</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>

          <div class="form-group">
            <label for="booking-reason">Reason for Visit</label>
            <input id="booking-reason" name="reason" type="text" class="form-control" placeholder="e.g. Health checkup, Chest discomfort" />
          </div>
        </div>

        <div class="form-section-title">
          <span>🧠</span>
          <strong>Pre-Visit AI Symptom Triage (Optional)</strong>
        </div>

        <div class="form-group">
          <label for="booking-symptoms">Symptoms</label>
          <textarea id="booking-symptoms" name="symptoms" class="form-control" rows="2" placeholder="Describe symptoms (e.g. Mild headache, fever since yesterday)..."></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="booking-duration">Symptom Duration</label>
            <input id="booking-duration" name="duration" type="text" class="form-control" placeholder="e.g. 2 days, 1 week" />
          </div>
          <div class="form-group">
            <label for="booking-details">Additional Details</label>
            <input id="booking-details" name="details" type="text" class="form-control" placeholder="e.g. Taking paracetamol, no relief" />
          </div>
        </div>

        <div id="booking-error" class="alert alert-danger" hidden></div>
        <div id="booking-success" class="alert alert-success" hidden></div>

        <div class="modal-footer">
          <button id="cancel-booking" class="btn btn-secondary" type="button">Cancel</button>
          <button id="submit-booking" class="btn btn-primary" type="submit">Confirm Booking</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#close-booking-modal")?.addEventListener("click", closeModal);
  modal.querySelector("#cancel-booking")?.addEventListener("click", closeModal);

  const specSelect = modal.querySelector<HTMLSelectElement>("#filter-specialization");
  const docSelect = modal.querySelector<HTMLSelectElement>("#booking-doctor");
  specSelect?.addEventListener("change", () => {
    const selectedSpec = specSelect.value;
    const filtered = selectedSpec
      ? availableDoctors.filter((d) => getDoctorSpecialization(d) === selectedSpec)
      : availableDoctors;

    if (docSelect) {
      docSelect.innerHTML =
        `<option value="" selected disabled>Select a doctor</option>` +
        filtered
          .map(
            (d) => `
              <option value="${escapeHtml(d.id)}">
                ${escapeHtml(getDoctorName(d))} (${escapeHtml(getDoctorSpecialization(d))}) · ${d.slotDuration ?? 30}m
              </option>
            `
          )
          .join("");
    }
  });

  const startInput = modal.querySelector<HTMLInputElement>("#booking-start");
  const endInput = modal.querySelector<HTMLInputElement>("#booking-end");

  const nowStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  if (startInput) startInput.min = nowStr;
  if (endInput) endInput.min = nowStr;

  startInput?.addEventListener("change", () => {
    if (!startInput.value) return;
    const startVal = new Date(startInput.value);
    const selectedDoctorId = docSelect?.value;
    const doc = availableDoctors.find((d) => d.id === selectedDoctorId);
    const slotMins = doc?.slotDuration ?? 30;

    const endVal = new Date(startVal.getTime() + slotMins * 60000);
    const endStr = new Date(endVal.getTime() - endVal.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    if (endInput) {
      endInput.value = endStr;
      endInput.min = startInput.value;
    }
  });

  const form = modal.querySelector<HTMLFormElement>("#booking-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = modal.querySelector<HTMLElement>("#booking-error");
    const successEl = modal.querySelector<HTMLElement>("#booking-success");
    const submitBtn = modal.querySelector<HTMLButtonElement>("#submit-booking");

    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
    if (successEl) {
      successEl.hidden = true;
      successEl.textContent = "";
    }

    const doctorId = docSelect?.value;
    const startTime = startInput?.value;
    const endTime = endInput?.value;
    const type = (modal.querySelector<HTMLSelectElement>("#booking-type")?.value || "CONSULTATION") as any;
    const reason = modal.querySelector<HTMLInputElement>("#booking-reason")?.value.trim();
    const symptoms = modal.querySelector<HTMLTextAreaElement>("#booking-symptoms")?.value.trim();
    const duration = modal.querySelector<HTMLInputElement>("#booking-duration")?.value.trim();
    const details = modal.querySelector<HTMLInputElement>("#booking-details")?.value.trim();

    if (!doctorId || !startTime || !endTime) {
      if (errorEl) {
        errorEl.textContent = "Please select a doctor and appointment times.";
        errorEl.hidden = false;
      }
      return;
    }

    const startObj = new Date(startTime);
    const endObj = new Date(endTime);

    if (startObj <= new Date()) {
      if (errorEl) {
        errorEl.textContent = "Appointment must be scheduled in the future.";
        errorEl.hidden = false;
      }
      return;
    }

    if (startObj >= endObj) {
      if (errorEl) {
        errorEl.textContent = "End time must be later than start time.";
        errorEl.hidden = false;
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Booking slot...";
    }

    try {
      const appointment = await createAppointment({
        doctorId,
        startTime: startObj.toISOString(),
        endTime: endObj.toISOString(),
        type,
        reason: reason || undefined
      });

      if (symptoms && appointment.id) {
        try {
          await createPreVisitSummary({
            appointmentId: appointment.id,
            symptoms,
            duration: duration || undefined,
            additionalDetails: details || undefined
          });
        } catch (symErr) {
          console.warn("Pre-visit summary auto-creation skipped:", symErr);
        }
      }

      if (successEl) {
        successEl.textContent = `Appointment booked successfully for ${formatDate(appointment.startTime)} at ${formatTime(appointment.startTime)}.`;
        successEl.hidden = false;
      }

      setTimeout(() => {
        closeModal();
        void showDashboardPage();
      }, 1000);
    } catch (err) {
      console.error("Booking error:", err);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm Booking";
      }
      if (errorEl) {
        errorEl.textContent = getErrorMessage(
          err,
          "Unable to book this appointment slot. Please select another time or doctor."
        );
        errorEl.hidden = false;
      }
    }
  });
}

// 2. Pre-Visit AI Summary Modal
async function renderPreVisitSummaryModal(appointmentId: string): Promise<void> {
  const existingModal = document.querySelector("#pre-visit-modal");
  if (existingModal) existingModal.remove();

  let summary: PreVisitSummary | null = null;
  try {
    summary = await getPreVisitSummary(appointmentId);
  } catch {
    summary = null;
  }

  const modal = document.createElement("div");
  modal.id = "pre-visit-modal";
  modal.className = "modal-overlay";

  if (summary) {
    const urgencyClass = `badge-urgency-${summary.urgencyLevel.toLowerCase()}`;

    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <p class="eyebrow">AI PRE-VISIT TRIAGE</p>
            <h2>Pre-Visit Clinical Summary</h2>
            <p>Generated by ${escapeHtml(summary.generatedBy || "AI")} based on patient symptoms.</p>
          </div>
          <button id="close-pre-visit-modal" class="modal-close-btn" type="button">×</button>
        </div>

        <div class="pre-visit-body">
          <div class="triage-urgency-banner">
            <span>Triage Urgency Level:</span>
            <span class="status-badge ${urgencyClass}">${escapeHtml(summary.urgencyLevel)}</span>
          </div>

          <div class="card-section">
            <h4>Chief Complaint</h4>
            <p class="chief-complaint-text">${escapeHtml(summary.chiefComplaint)}</p>
          </div>

          <div class="card-section">
            <h4>Patient Reported Symptoms</h4>
            <p>${escapeHtml(summary.symptoms)}</p>
            ${summary.duration ? `<p><small><strong>Duration:</strong> ${escapeHtml(summary.duration)}</small></p>` : ""}
            ${summary.additionalDetails ? `<p><small><strong>Additional details:</strong> ${escapeHtml(summary.additionalDetails)}</small></p>` : ""}
          </div>

          <div class="card-section">
            <h4>Suggested Clinical Inquiries for Doctor</h4>
            <ol class="suggested-questions-list">
              ${
                Array.isArray(summary.suggestedQuestions)
                  ? summary.suggestedQuestions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")
                  : "<li>No questions generated.</li>"
              }
            </ol>
          </div>

          <div class="modal-footer">
            <button id="close-pre-visit-btn" class="btn btn-primary" type="button">Close</button>
          </div>
        </div>
      </div>
    `;
  } else {
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <p class="eyebrow">AI PRE-VISIT TRIAGE</p>
            <h2>Share Patient Symptoms</h2>
            <p>Describe symptoms before the visit to generate triage urgency and suggested doctor questions.</p>
          </div>
          <button id="close-pre-visit-modal" class="modal-close-btn" type="button">×</button>
        </div>

        <form id="pre-visit-create-form" class="modal-form">
          <div class="form-group">
            <label for="pv-symptoms">Symptoms Description *</label>
            <textarea id="pv-symptoms" class="form-control" rows="4" required placeholder="Describe symptoms in detail (e.g., severe sore throat, difficulty swallowing, fever of 101F)..."></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="pv-duration">Duration</label>
              <input id="pv-duration" type="text" class="form-control" placeholder="e.g. 3 days, 1 week" />
            </div>
            <div class="form-group">
              <label for="pv-details">Additional Details</label>
              <input id="pv-details" type="text" class="form-control" placeholder="e.g. No allergies, took aspirin" />
            </div>
          </div>

          <div id="pv-error" class="alert alert-danger" hidden></div>

          <div class="modal-footer">
            <button id="cancel-pv" class="btn btn-secondary" type="button">Cancel</button>
            <button id="submit-pv" class="btn btn-primary" type="submit">Analyze with AI Triage</button>
          </div>
        </form>
      </div>
    `;
  }

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#close-pre-visit-modal")?.addEventListener("click", closeModal);
  modal.querySelector("#close-pre-visit-btn")?.addEventListener("click", closeModal);
  modal.querySelector("#cancel-pv")?.addEventListener("click", closeModal);

  const form = modal.querySelector<HTMLFormElement>("#pre-visit-create-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const symptoms = modal.querySelector<HTMLTextAreaElement>("#pv-symptoms")?.value.trim();
    const duration = modal.querySelector<HTMLInputElement>("#pv-duration")?.value.trim();
    const details = modal.querySelector<HTMLInputElement>("#pv-details")?.value.trim();
    const errorEl = modal.querySelector<HTMLElement>("#pv-error");
    const submitBtn = modal.querySelector<HTMLButtonElement>("#submit-pv");

    if (!symptoms) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Analyzing symptoms with AI...";
    }

    try {
      await createPreVisitSummary({
        appointmentId,
        symptoms,
        duration: duration || undefined,
        additionalDetails: details || undefined
      });
      closeModal();
      void renderPreVisitSummaryModal(appointmentId);
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Analyze with AI Triage";
      }
      if (errorEl) {
        errorEl.textContent = getErrorMessage(err, "Failed to analyze symptoms.");
        errorEl.hidden = false;
      }
    }
  });
}

// 3. Post-Visit Summary & Prescription Modal
async function renderPostVisitModal(appointmentId: string): Promise<void> {
  const existingModal = document.querySelector("#post-visit-modal");
  if (existingModal) existingModal.remove();

  let existingSummary: PostVisitSummaryData | null = null;
  try {
    existingSummary = await getPostVisitSummary(appointmentId);
  } catch {
    existingSummary = null;
  }

  const modal = document.createElement("div");
  modal.id = "post-visit-modal";
  modal.className = "modal-overlay";

  if (existingSummary) {
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <p class="eyebrow">POST-VISIT SUMMARY & PRESCRIPTION (${escapeHtml(existingSummary.generatedBy || "AI")})</p>
            <h2>After-Care Summary & Medication Schedule</h2>
            <p>Generated for patient clear understanding and care instructions.</p>
          </div>
          <button id="close-post-visit-modal" class="modal-close-btn" type="button">×</button>
        </div>

        <div class="post-visit-body">
          <div class="card-section">
            <h4>Patient-Friendly Summary</h4>
            <p class="patient-summary-text">${escapeHtml(existingSummary.patientSummary || "No summary available.")}</p>
          </div>

          ${
            Array.isArray(existingSummary.medicationSchedule) && existingSummary.medicationSchedule.length > 0
              ? `
                <div class="card-section">
                  <h4>💊 Prescriptions & Medication Schedule</h4>
                  <ul class="medication-schedule-list">
                    ${existingSummary.medicationSchedule
                      .map((item) => `<li><strong>${escapeHtml(item)}</strong></li>`)
                      .join("")}
                  </ul>
                </div>
              `
              : ""
          }

          ${
            Array.isArray(existingSummary.followUpSteps) && existingSummary.followUpSteps.length > 0
              ? `
                <div class="card-section">
                  <h4>🔄 Follow-Up Steps & Recovery Advice</h4>
                  <ul class="followup-steps-list">
                    ${existingSummary.followUpSteps
                      .map((step) => `<li>${escapeHtml(step)}</li>`)
                      .join("")}
                  </ul>
                </div>
              `
              : ""
          }

          <div class="modal-footer">
            <button id="close-post-visit-btn" class="btn btn-primary" type="button">Done</button>
          </div>
        </div>
      </div>
    `;
  } else {
    modal.innerHTML = `
      <div class="modal-card modal-card-lg">
        <div class="modal-header">
          <div>
            <p class="eyebrow">DOCTOR CONSULTATION CONCLUSION</p>
            <h2>Complete Visit & Generate AI Post-Visit Summary</h2>
            <p>Record clinical notes and structured prescriptions to automatically schedule medication reminders.</p>
          </div>
          <button id="close-post-visit-modal" class="modal-close-btn" type="button">×</button>
        </div>

        <form id="post-visit-form" class="modal-form">
          <div class="form-group">
            <label for="pv-diagnosis">Primary Diagnosis</label>
            <input id="pv-diagnosis" type="text" class="form-control" placeholder="e.g. Acute Pharyngitis / Hypertension Stage 1" />
          </div>

          <div class="form-group">
            <label for="pv-notes">Clinical Notes *</label>
            <textarea id="pv-notes" class="form-control" rows="3" required placeholder="Patient presented with mild fever and sore throat. Throat shows erythematous mucosa..."></textarea>
          </div>

          <div class="form-section-title">
            <span>💊</span>
            <strong>Structured Prescription</strong>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="med-name">Medication Name</label>
              <input id="med-name" type="text" class="form-control" placeholder="e.g. Amoxicillin 500mg / Paracetamol" />
            </div>
            <div class="form-group">
              <label for="med-dosage">Dosage</label>
              <input id="med-dosage" type="text" class="form-control" placeholder="e.g. 500mg, 1 tablet" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="med-freq">Frequency</label>
              <select id="med-freq" class="form-control">
                <option value="ONCE_DAILY">Once Daily (Every morning)</option>
                <option value="TWICE_DAILY">Twice Daily (Morning & Night)</option>
                <option value="THREE_TIMES_DAILY">Three Times Daily (Morning, Afternoon, Night)</option>
                <option value="EVERY_8_HOURS">Every 8 Hours</option>
                <option value="AS_NEEDED">As Needed (PRN)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="med-duration">Duration</label>
              <input id="med-duration" type="text" class="form-control" placeholder="e.g. 5 days, 7 days" />
            </div>
          </div>

          <div class="form-group">
            <label for="med-inst">Medication Instructions</label>
            <input id="med-inst" type="text" class="form-control" placeholder="e.g. Take after food with plenty of water" />
          </div>

          <div class="form-section-title">
            <span>🔄</span>
            <strong>Follow-Up & Advice</strong>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="fu-date">Follow-up Date (Optional)</label>
              <input id="fu-date" type="date" class="form-control" />
            </div>
            <div class="form-group">
              <label for="fu-inst">Follow-up Advice</label>
              <input id="fu-inst" type="text" class="form-control" placeholder="e.g. Review if fever persists after 3 days" />
            </div>
          </div>

          <div id="pv-form-error" class="alert alert-danger" hidden></div>

          <div class="modal-footer">
            <button id="cancel-post-visit" class="btn btn-secondary" type="button">Cancel</button>
            <button id="submit-post-visit" class="btn btn-success" type="submit">Complete Visit & Generate AI Summary</button>
          </div>
        </form>
      </div>
    `;
  }

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#close-post-visit-modal")?.addEventListener("click", closeModal);
  modal.querySelector("#close-post-visit-btn")?.addEventListener("click", closeModal);
  modal.querySelector("#cancel-post-visit")?.addEventListener("click", closeModal);

  const form = modal.querySelector<HTMLFormElement>("#post-visit-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const diagnosis = modal.querySelector<HTMLInputElement>("#pv-diagnosis")?.value.trim();
    const notes = modal.querySelector<HTMLTextAreaElement>("#pv-notes")?.value.trim();
    const medName = modal.querySelector<HTMLInputElement>("#med-name")?.value.trim();
    const medDosage = modal.querySelector<HTMLInputElement>("#med-dosage")?.value.trim();
    const medFreq = modal.querySelector<HTMLSelectElement>("#med-freq")?.value || "ONCE_DAILY";
    const medDuration = modal.querySelector<HTMLInputElement>("#med-duration")?.value.trim();
    const medInst = modal.querySelector<HTMLInputElement>("#med-inst")?.value.trim();
    const fuDate = modal.querySelector<HTMLInputElement>("#fu-date")?.value;
    const fuInst = modal.querySelector<HTMLInputElement>("#fu-inst")?.value.trim();
    const errorEl = modal.querySelector<HTMLElement>("#pv-form-error");
    const submitBtn = modal.querySelector<HTMLButtonElement>("#submit-post-visit");

    if (!notes) {
      if (errorEl) {
        errorEl.textContent = "Clinical notes are required to complete visit.";
        errorEl.hidden = false;
      }
      return;
    }

    const prescriptions = medName
      ? [
          {
            medicationName: medName,
            dosage: medDosage || "1 dose",
            frequency: medFreq,
            duration: medDuration || "7 days",
            instructions: medInst || undefined
          }
        ]
      : [];

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing notes & AI summary...";
    }

    try {
      await createPostVisitSummary({
        appointmentId,
        diagnosis: diagnosis || undefined,
        notes,
        prescriptions,
        followUpDate: fuDate || undefined,
        followUpInstructions: fuInst || undefined
      });

      closeModal();
      void renderPostVisitModal(appointmentId);
      void showDashboardPage();
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Complete Visit & Generate AI Summary";
      }
      if (errorEl) {
        errorEl.textContent = getErrorMessage(err, "Failed to complete visit and generate summary.");
        errorEl.hidden = false;
      }
    }
  });
}

// 4. Admin: Create Doctor Profile Modal
function renderCreateDoctorModal(): void {
  const existingModal = document.querySelector("#create-doctor-modal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "create-doctor-modal";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-card modal-card-lg">
      <div class="modal-header">
        <div>
          <p class="eyebrow">ADMINISTRATOR</p>
          <h2>Add New Doctor Profile</h2>
          <p>Register a doctor with credentials, specialization, slot duration, and working hours.</p>
        </div>
        <button id="close-doctor-modal" class="modal-close-btn" type="button">×</button>
      </div>

      <form id="create-doctor-form" class="modal-form">
        <div class="form-row">
          <div class="form-group">
            <label for="doc-first-name">First Name *</label>
            <input id="doc-first-name" type="text" class="form-control" required placeholder="e.g. Ramesh" />
          </div>
          <div class="form-group">
            <label for="doc-last-name">Last Name *</label>
            <input id="doc-last-name" type="text" class="form-control" required placeholder="e.g. Gupta" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="doc-email">Email Address *</label>
            <input id="doc-email" type="email" class="form-control" required placeholder="doctor@healthcare.local" />
          </div>
          <div class="form-group">
            <label for="doc-password">Password *</label>
            <input id="doc-password" type="password" class="form-control" required placeholder="Password@123" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="doc-phone">Phone Number</label>
            <input id="doc-phone" type="tel" class="form-control" placeholder="+919876543210" />
          </div>
          <div class="form-group">
            <label for="doc-specialization">Specialisation *</label>
            <input id="doc-specialization" type="text" class="form-control" required placeholder="e.g. Dermatology / Neurology" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="doc-license">License Number *</label>
            <input id="doc-license" type="text" class="form-control" required placeholder="e.g. MED-LIC-9988" />
          </div>
          <div class="form-group">
            <label for="doc-qualification">Qualification</label>
            <input id="doc-qualification" type="text" class="form-control" placeholder="e.g. MBBS, MD, DNB" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="doc-experience">Experience (Years)</label>
            <input id="doc-experience" type="number" min="0" class="form-control" placeholder="10" />
          </div>
          <div class="form-group">
            <label for="doc-fee">Consultation Fee (₹)</label>
            <input id="doc-fee" type="number" min="0" step="50" class="form-control" placeholder="600" />
          </div>
          <div class="form-group">
            <label for="doc-slot">Slot Duration (Mins)</label>
            <select id="doc-slot" class="form-control">
              <option value="15">15 mins</option>
              <option value="30" selected>30 mins</option>
              <option value="45">45 mins</option>
              <option value="60">60 mins</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="doc-bio">Professional Biography</label>
          <textarea id="doc-bio" class="form-control" rows="2" placeholder="Brief summary of expertise and background..."></textarea>
        </div>

        <div class="form-section-title">
          <span>⏰</span>
          <strong>Default Working Hours</strong>
        </div>

        <p class="text-muted"><small>Schedule: Mon-Fri 09:00 - 17:00 (Auto-configured upon profile creation)</small></p>

        <div id="create-doctor-error" class="alert alert-danger" hidden></div>
        <div id="create-doctor-success" class="alert alert-success" hidden></div>

        <div class="modal-footer">
          <button id="cancel-create-doc" class="btn btn-secondary" type="button">Cancel</button>
          <button id="submit-create-doc" class="btn btn-primary" type="submit">Create Doctor Profile</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#close-doctor-modal")?.addEventListener("click", closeModal);
  modal.querySelector("#cancel-create-doc")?.addEventListener("click", closeModal);

  const form = modal.querySelector<HTMLFormElement>("#create-doctor-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = modal.querySelector<HTMLInputElement>("#doc-first-name")?.value.trim();
    const lastName = modal.querySelector<HTMLInputElement>("#doc-last-name")?.value.trim();
    const email = modal.querySelector<HTMLInputElement>("#doc-email")?.value.trim();
    const password = modal.querySelector<HTMLInputElement>("#doc-password")?.value;
    const phone = modal.querySelector<HTMLInputElement>("#doc-phone")?.value.trim();
    const specialization = modal.querySelector<HTMLInputElement>("#doc-specialization")?.value.trim();
    const licenseNumber = modal.querySelector<HTMLInputElement>("#doc-license")?.value.trim();
    const qualification = modal.querySelector<HTMLInputElement>("#doc-qualification")?.value.trim();
    const experienceYears = modal.querySelector<HTMLInputElement>("#doc-experience")?.value;
    const consultationFee = modal.querySelector<HTMLInputElement>("#doc-fee")?.value;
    const slotDuration = modal.querySelector<HTMLSelectElement>("#doc-slot")?.value;
    const bio = modal.querySelector<HTMLTextAreaElement>("#doc-bio")?.value.trim();

    const errorEl = modal.querySelector<HTMLElement>("#create-doctor-error");
    const successEl = modal.querySelector<HTMLElement>("#create-doctor-success");
    const submitBtn = modal.querySelector<HTMLButtonElement>("#submit-create-doc");

    if (!firstName || !lastName || !email || !password || !specialization || !licenseNumber) {
      if (errorEl) {
        errorEl.textContent = "Please fill in all required fields.";
        errorEl.hidden = false;
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating profile...";
    }

    const workingHours = [1, 2, 3, 4, 5].map((day) => ({
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "17:00"
    }));

    try {
      await createDoctor({
        firstName,
        lastName,
        email,
        password,
        phone: phone || undefined,
        specialization,
        licenseNumber,
        qualification: qualification || undefined,
        experienceYears: experienceYears ? parseInt(experienceYears, 10) : undefined,
        consultationFee: consultationFee ? parseFloat(consultationFee) : undefined,
        slotDuration: slotDuration ? parseInt(slotDuration, 10) : 30,
        bio: bio || undefined,
        workingHours
      });

      if (successEl) {
        successEl.textContent = `Doctor Dr. ${firstName} ${lastName} created successfully!`;
        successEl.hidden = false;
      }

      setTimeout(() => {
        closeModal();
        void showDoctorManagementPage();
      }, 1000);
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Doctor Profile";
      }
      if (errorEl) {
        errorEl.textContent = getErrorMessage(err, "Failed to create doctor profile.");
        errorEl.hidden = false;
      }
    }
  });
}

// 5. Manage Doctor Leaves Modal (Admin / Doctor)
async function renderManageDoctorLeavesModal(doctor: Doctor): Promise<void> {
  const existingModal = document.querySelector("#doctor-leaves-modal");
  if (existingModal) existingModal.remove();

  const leaves = await getDoctorLeaves(doctor.id);

  const modal = document.createElement("div");
  modal.id = "doctor-leaves-modal";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-card modal-card-lg">
      <div class="modal-header">
        <div>
          <p class="eyebrow">DOCTOR LEAVE MANAGEMENT</p>
          <h2>Manage Leaves: ${escapeHtml(getDoctorName(doctor))}</h2>
          <p>Mark leave dates. Any conflicting appointments will be cancelled and patients notified automatically.</p>
        </div>
        <button id="close-leaves-modal" class="modal-close-btn" type="button">×</button>
      </div>

      <div class="modal-body">
        <form id="add-leave-form" class="modal-form leave-form-box">
          <h4>Mark New Leave Period</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="leave-start">Start Date *</label>
              <input id="leave-start" type="date" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="leave-end">End Date *</label>
              <input id="leave-end" type="date" class="form-control" required />
            </div>
          </div>

          <div class="form-group">
            <label for="leave-reason">Reason for Leave</label>
            <input id="leave-reason" type="text" class="form-control" placeholder="e.g. Annual Leave, Medical Conference, Personal Emergency" />
          </div>

          <div id="leave-error" class="alert alert-danger" hidden></div>
          <div id="leave-success" class="alert alert-success" hidden></div>

          <button id="submit-leave" class="btn btn-danger btn-sm" type="submit">Confirm & Cancel Conflicting Bookings</button>
        </form>

        <hr class="divider" />

        <h4>Scheduled Leaves (${leaves.length})</h4>
        <div id="leaves-list-container">
          ${
            leaves.length === 0
              ? `<p class="text-muted">No leaves currently scheduled for this doctor.</p>`
              : `
                <div class="data-table-wrapper">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Reason</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${leaves
                        .map(
                          (leave: any) => `
                            <tr>
                              <td><strong>${formatDate(leave.startDate)}</strong></td>
                              <td><strong>${formatDate(leave.endDate)}</strong></td>
                              <td>${escapeHtml(leave.reason || "Scheduled Leave")}</td>
                              <td>
                                <button
                                  type="button"
                                  class="btn btn-danger-outline btn-xs"
                                  data-action="delete-leave"
                                  data-leave-id="${escapeHtml(leave.id)}"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              `
          }
        </div>
      </div>

      <div class="modal-footer">
        <button id="done-leaves-btn" class="btn btn-secondary" type="button">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#close-leaves-modal")?.addEventListener("click", closeModal);
  modal.querySelector("#done-leaves-btn")?.addEventListener("click", closeModal);

  const todayStr = new Date().toISOString().split("T")[0];
  const startInput = modal.querySelector<HTMLInputElement>("#leave-start");
  const endInput = modal.querySelector<HTMLInputElement>("#leave-end");
  if (startInput) startInput.min = todayStr;
  if (endInput) endInput.min = todayStr;

  startInput?.addEventListener("change", () => {
    if (startInput.value && endInput) endInput.min = startInput.value;
  });

  const form = modal.querySelector<HTMLFormElement>("#add-leave-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const startDate = startInput?.value;
    const endDate = endInput?.value;
    const reason = modal.querySelector<HTMLInputElement>("#leave-reason")?.value.trim();
    const errorEl = modal.querySelector<HTMLElement>("#leave-error");
    const successEl = modal.querySelector<HTMLElement>("#leave-success");
    const submitBtn = modal.querySelector<HTMLButtonElement>("#submit-leave");

    if (!startDate || !endDate) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Processing leave & notifying patients...";
    }

    try {
      const result = await addDoctorLeave({
        doctorId: doctor.id,
        startDate,
        endDate,
        reason: reason || undefined
      });

      if (successEl) {
        successEl.textContent = `Leave booked. ${result?.cancelledAppointmentsCount || 0} conflicting appointment(s) cancelled and patients notified.`;
        successEl.hidden = false;
      }

      setTimeout(() => {
        closeModal();
        void renderManageDoctorLeavesModal(doctor);
      }, 1200);
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm & Cancel Conflicting Bookings";
      }
      if (errorEl) {
        errorEl.textContent = getErrorMessage(err, "Failed to schedule doctor leave.");
        errorEl.hidden = false;
      }
    }
  });

  modal.querySelectorAll<HTMLButtonElement>('[data-action="delete-leave"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const leaveId = btn.dataset.leaveId;
      if (!leaveId) return;
      if (!confirm("Are you sure you want to remove this leave schedule?")) return;
      try {
        await deleteDoctorLeave(leaveId);
        closeModal();
        void renderManageDoctorLeavesModal(doctor);
      } catch (err) {
        alert("Failed to delete leave: " + (err instanceof Error ? err.message : "Unknown error"));
      }
    });
  });
}

// 6. Cancel Appointment Modal
function renderCancelAppointmentModal(appointmentId: string): void {
  const existingModal = document.querySelector("#cancel-modal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "cancel-modal";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <p class="eyebrow text-danger">APPOINTMENT CANCELLATION</p>
          <h2>Cancel Appointment</h2>
          <p>Please provide a reason for cancelling this appointment.</p>
        </div>
        <button id="close-cancel-modal" class="modal-close-btn" type="button">×</button>
      </div>

      <form id="cancel-form" class="modal-form">
        <div class="form-group">
          <label for="cancel-reason">Cancellation Reason *</label>
          <textarea id="cancel-reason" class="form-control" rows="3" required placeholder="e.g. Scheduling conflict, Feeling better, Rescheduling..."></textarea>
        </div>

        <div id="cancel-error" class="alert alert-danger" hidden></div>

        <div class="modal-footer">
          <button id="dismiss-cancel" class="btn btn-secondary" type="button">Keep Appointment</button>
          <button id="confirm-cancel" class="btn btn-danger" type="submit">Confirm Cancellation</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#close-cancel-modal")?.addEventListener("click", closeModal);
  modal.querySelector("#dismiss-cancel")?.addEventListener("click", closeModal);

  const form = modal.querySelector<HTMLFormElement>("#cancel-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const reason = modal.querySelector<HTMLTextAreaElement>("#cancel-reason")?.value.trim();
    const errorEl = modal.querySelector<HTMLElement>("#cancel-error");
    const submitBtn = modal.querySelector<HTMLButtonElement>("#confirm-cancel");

    if (!reason) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Cancelling...";
    }

    try {
      await cancelAppointment(appointmentId, { cancellationReason: reason });
      closeModal();
      void showDashboardPage();
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm Cancellation";
      }
      if (errorEl) {
        errorEl.textContent = getErrorMessage(err, "Failed to cancel appointment.");
        errorEl.hidden = false;
      }
    }
  });
}

// 7. Create Follow-up Modal
function renderCreateFollowUpModal(appointmentId: string): void {
  const existingModal = document.querySelector("#followup-modal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "followup-modal";
  modal.className = "modal-overlay";

  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <p class="eyebrow">DOCTOR CARE PLAN</p>
          <h2>Schedule Follow-Up</h2>
          <p>Set a follow-up evaluation and instructions for the patient.</p>
        </div>
        <button id="close-fu-modal" class="modal-close-btn" type="button">×</button>
      </div>

      <form id="create-fu-form" class="modal-form">
        <div class="form-group">
          <label for="fu-scheduled-at">Follow-up Date & Time</label>
          <input id="fu-scheduled-at" type="datetime-local" class="form-control" />
        </div>

        <div class="form-group">
          <label for="fu-instructions-text">Care Instructions *</label>
          <textarea id="fu-instructions-text" class="form-control" rows="3" required placeholder="Follow-up in 2 weeks for blood pressure re-evaluation..."></textarea>
        </div>

        <div id="fu-error" class="alert alert-danger" hidden></div>

        <div class="modal-footer">
          <button id="cancel-fu-btn" class="btn btn-secondary" type="button">Cancel</button>
          <button id="submit-fu-btn" class="btn btn-primary" type="submit">Schedule Follow-up</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector("#close-fu-modal")?.addEventListener("click", closeModal);
  modal.querySelector("#cancel-fu-btn")?.addEventListener("click", closeModal);

  const form = modal.querySelector<HTMLFormElement>("#create-fu-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const scheduledAt = modal.querySelector<HTMLInputElement>("#fu-scheduled-at")?.value;
    const instructions = modal.querySelector<HTMLTextAreaElement>("#fu-instructions-text")?.value.trim();
    const errorEl = modal.querySelector<HTMLElement>("#fu-error");
    const submitBtn = modal.querySelector<HTMLButtonElement>("#submit-fu-btn");

    if (!instructions) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Scheduling...";
    }

    try {
      await createFollowUp(appointmentId, {
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        instructions
      });
      closeModal();
      void showDashboardPage();
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Schedule Follow-up";
      }
      if (errorEl) {
        errorEl.textContent = getErrorMessage(err, "Failed to schedule follow-up.");
        errorEl.hidden = false;
      }
    }
  });
}

/**
 * ---------------------------------------------------------
 * Action Listeners Setup
 * ---------------------------------------------------------
 */

function setupAppointmentActionListeners(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-action="pre-visit"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const aptId = btn.dataset.appointmentId;
      if (aptId) void renderPreVisitSummaryModal(aptId);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="post-visit"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const aptId = btn.dataset.appointmentId;
      if (aptId) void renderPostVisitModal(aptId);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="complete-visit-modal"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const aptId = btn.dataset.appointmentId;
      if (aptId) void renderPostVisitModal(aptId);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="status"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const aptId = btn.dataset.appointmentId;
      const status = btn.dataset.status as any;
      if (!aptId || !status) return;

      btn.disabled = true;
      try {
        await updateAppointmentStatus(aptId, { status });
        void showDashboardPage();
      } catch (err) {
        alert("Failed to update status: " + (err instanceof Error ? err.message : "Unknown error"));
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="cancel"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const aptId = btn.dataset.appointmentId;
      if (aptId) renderCancelAppointmentModal(aptId);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="create-follow-up"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const aptId = btn.dataset.appointmentId;
      if (aptId) renderCreateFollowUpModal(aptId);
    });
  });
}

function setupDoctorActionListeners(doctors: Doctor[]): void {
  document.querySelectorAll<HTMLButtonElement>('[data-action="manage-doctor-leaves"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const docId = btn.dataset.doctorId;
      const doc = doctors.find((d) => d.id === docId);
      if (doc) void renderManageDoctorLeavesModal(doc);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="book-with-doctor"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const docId = btn.dataset.doctorId;
      void openBookingModal(docId);
    });
  });
}

/**
 * ---------------------------------------------------------
 * Role-Based Page Views
 * ---------------------------------------------------------
 */

// 1. Universal Dashboard Dispatcher
async function showDashboardPage(): Promise<void> {
  const user = getStoredUser();
  if (!user) {
    renderLogin(initializeApplication);
    return;
  }

  if (user.role === "PATIENT") {
    await showPatientDashboardPage();
  } else if (user.role === "DOCTOR") {
    await showDoctorDashboardPage();
  } else if (user.role === "ADMIN") {
    await showAdminDashboardPage();
  }
}

// 1A. PATIENT DASHBOARD
async function showPatientDashboardPage(): Promise<void> {
  const user = getStoredUser();
  if (!user) return;

  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">PATIENT WORKSPACE</p>
        <h1>Welcome, ${escapeHtml(user.firstName)}</h1>
        <p>Review your upcoming consultations, health follow-ups, and visiting specialists.</p>
      </div>

      <div class="page-header-actions">
        <button id="btn-book-top" class="btn btn-primary" type="button">+ Book Consultation</button>
      </div>
    </div>

    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon-blue">📅</div>
        <div>
          <span class="stat-label">My Appointments</span>
          <strong id="stat-appointments-count">—</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon-purple">🔄</div>
        <div>
          <span class="stat-label">Follow-ups</span>
          <strong id="stat-followups-count">—</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon-amber">🔔</div>
        <div>
          <span class="stat-label">Reminders</span>
          <strong id="stat-reminders-count">—</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon-green">📅</div>
        <div>
          <span class="stat-label">Google Calendar</span>
          <strong id="stat-calendar-sync">Checking...</strong>
        </div>
      </div>
    </section>

    <!-- PROMINENT VISITING HOURS PREVIEW -->
    <section class="content-card">
      <div class="card-header">
        <div>
          <h2>Available Doctors & Visiting Hours</h2>
          <p>Find qualified specialists and their weekly consultation hours.</p>
        </div>
        <button id="view-all-docs-btn" class="btn btn-outline-primary btn-sm" type="button">View All Doctors →</button>
      </div>
      <div id="patient-doctors-preview-container">
        <div class="empty-state compact"><p>Loading doctors...</p></div>
      </div>
    </section>

    <section class="content-card">
      <div class="card-header">
        <div>
          <h2>Upcoming Appointments</h2>
          <p>Manage your consultations, access AI Pre-Visit summaries, and view care directions.</p>
        </div>
      </div>
      <div id="dashboard-appointments-container">
        <div class="empty-state compact"><p>Loading appointments...</p></div>
      </div>
    </section>

    <div class="dashboard-columns">
      <section class="content-card">
        <div class="card-header">
          <div>
            <h2>Follow-up Care Plan</h2>
            <p>Post-consultation directions.</p>
          </div>
        </div>
        <div id="dashboard-followups-container">
          <div class="empty-state compact"><p>Loading follow-ups...</p></div>
        </div>
      </section>

      <section class="content-card">
        <div class="card-header">
          <div>
            <h2>Medication & Schedule Reminders</h2>
            <p>Automated reminders.</p>
          </div>
        </div>
        <div id="dashboard-reminders-container">
          <div class="empty-state compact"><p>Loading reminders...</p></div>
        </div>
      </section>
    </div>
  `;

  document.querySelector("#btn-book-top")?.addEventListener("click", () => void openBookingModal());
  document.querySelector("#view-all-docs-btn")?.addEventListener("click", () => {
    void showAvailableDoctorsPage();
    highlightNav("available-doctors");
  });

  try {
    const { appointments, followUps, reminders, doctors, calendarStatus } = await loadDashboardData();

    const aptCount = document.querySelector("#stat-appointments-count");
    if (aptCount) aptCount.textContent = String(appointments.length);

    const fuCount = document.querySelector("#stat-followups-count");
    if (fuCount) fuCount.textContent = String(followUps.length);

    const remCount = document.querySelector("#stat-reminders-count");
    if (remCount) remCount.textContent = String(reminders.length);

    const calSync = document.querySelector("#stat-calendar-sync");
    if (calSync) {
      calSync.textContent = calendarStatus.isConnected ? "Connected" : "Not Linked";
      calSync.className = calendarStatus.isConnected ? "text-success" : "text-muted";
    }

    const docsPreview = document.querySelector("#patient-doctors-preview-container");
    if (docsPreview) {
      docsPreview.innerHTML = renderDoctorsList(doctors.slice(0, 3), false);
      setupDoctorActionListeners(doctors);
    }

    const aptContainer = document.querySelector("#dashboard-appointments-container");
    if (aptContainer) {
      aptContainer.innerHTML = renderAppointmentsList(appointments, true);
      setupAppointmentActionListeners();
    }

    const fuContainer = document.querySelector("#dashboard-followups-container");
    if (fuContainer) {
      fuContainer.innerHTML = renderFollowUpsList(followUps, true);
    }

    const remContainer = document.querySelector("#dashboard-reminders-container");
    if (remContainer) {
      remContainer.innerHTML = renderRemindersList(reminders, true);
    }
  } catch (err) {
    console.error("Patient Dashboard error:", err);
  }
}

// 1B. DOCTOR DASHBOARD
async function showDoctorDashboardPage(): Promise<void> {
  const user = getStoredUser();
  if (!user) return;

  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">PHYSICIAN WORKSPACE</p>
        <h1>Welcome, Dr. ${escapeHtml(user.lastName || user.firstName)}</h1>
        <p>Review patient consultations, AI symptom summaries, and manage your practice schedule.</p>
      </div>

      <div class="page-header-actions">
        <button id="btn-apply-leave-dash" class="btn btn-secondary" type="button">🏖️ Apply for Leave</button>
      </div>
    </div>

    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon-blue">📅</div>
        <div>
          <span class="stat-label">Assigned Appointments</span>
          <strong id="stat-appointments-count">—</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon-green">🩺</div>
        <div>
          <span class="stat-label">Active Consultations</span>
          <strong id="stat-active-consultations">—</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon-purple">🔄</div>
        <div>
          <span class="stat-label">Follow-ups Scheduled</span>
          <strong id="stat-followups-count">—</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon-amber">📅</div>
        <div>
          <span class="stat-label">Google Calendar</span>
          <strong id="stat-calendar-sync">Checking...</strong>
        </div>
      </div>
    </section>

    <section class="content-card">
      <div class="card-header">
        <div>
          <h2>Upcoming Consultations</h2>
          <p>Review patient symptoms with AI Triage, confirm visits, or complete consultations with Rx.</p>
        </div>
      </div>
      <div id="doctor-dashboard-appointments-container">
        <div class="empty-state compact"><p>Loading consultations...</p></div>
      </div>
    </section>

    <div class="dashboard-columns">
      <section class="content-card">
        <div class="card-header">
          <div>
            <h2>Patient Follow-Up Care</h2>
            <p>Recent follow-up instructions given to patients.</p>
          </div>
        </div>
        <div id="doctor-dashboard-followups-container">
          <div class="empty-state compact"><p>Loading follow-ups...</p></div>
        </div>
      </section>

      <section class="content-card">
        <div class="card-header">
          <div>
            <h2>Schedule & Leave Quick Preview</h2>
            <p>Manage planned absence.</p>
          </div>
        </div>
        <div id="doctor-leaves-preview-container">
          <p class="text-muted"><small>Loading leave status...</small></p>
        </div>
      </section>
    </div>
  `;

  document.querySelector("#btn-apply-leave-dash")?.addEventListener("click", () => {
    void showDoctorScheduleLeavePage();
    highlightNav("schedule-leave");
  });

  try {
    const { appointments, followUps, calendarStatus, doctors } = await loadDashboardData();

    const currentDoc = doctors.find((d) => d.userId === user.id) || null;

    const aptCount = document.querySelector("#stat-appointments-count");
    if (aptCount) aptCount.textContent = String(appointments.length);

    const activeCount = appointments.filter((a) => a.status === "SCHEDULED" || a.status === "CONFIRMED").length;
    const activeEl = document.querySelector("#stat-active-consultations");
    if (activeEl) activeEl.textContent = String(activeCount);

    const fuCount = document.querySelector("#stat-followups-count");
    if (fuCount) fuCount.textContent = String(followUps.length);

    const calSync = document.querySelector("#stat-calendar-sync");
    if (calSync) {
      calSync.textContent = calendarStatus.isConnected ? "Connected" : "Not Linked";
      calSync.className = calendarStatus.isConnected ? "text-success" : "text-muted";
    }

    const aptContainer = document.querySelector("#doctor-dashboard-appointments-container");
    if (aptContainer) {
      aptContainer.innerHTML = renderAppointmentsList(appointments, true);
      setupAppointmentActionListeners();
    }

    const fuContainer = document.querySelector("#doctor-dashboard-followups-container");
    if (fuContainer) {
      fuContainer.innerHTML = renderFollowUpsList(followUps, true);
    }

    // Leave preview
    const leavesPreview = document.querySelector("#doctor-leaves-preview-container");
    if (leavesPreview) {
      if (currentDoc) {
        const leaves = await getDoctorLeaves(currentDoc.id);
        if (leaves.length === 0) {
          leavesPreview.innerHTML = `
            <div class="empty-state compact">
              <p>No upcoming leave scheduled. Practice hours active.</p>
              <button id="btn-schedule-leave-inline" class="btn btn-outline-primary btn-sm" type="button" style="margin-top: 8px;">
                Apply for Leave
              </button>
            </div>
          `;
          leavesPreview.querySelector("#btn-schedule-leave-inline")?.addEventListener("click", () => {
            void showDoctorScheduleLeavePage();
            highlightNav("schedule-leave");
          });
        } else {
          leavesPreview.innerHTML = `
            <ul style="list-style: none; padding: 0;">
              ${leaves.slice(0, 3).map((l: any) => `
                <li style="padding: 8px 0; border-bottom: 1px solid var(--border);">
                  🏖️ <strong>${formatDate(l.startDate)}</strong> – <strong>${formatDate(l.endDate)}</strong>
                  <br /><small class="text-muted">${escapeHtml(l.reason || "Approved absence")}</small>
                </li>
              `).join("")}
            </ul>
            <button id="btn-view-all-leaves" class="btn btn-secondary btn-sm w-full" type="button" style="margin-top: 10px;">
              Manage All Leaves →
            </button>
          `;
          leavesPreview.querySelector("#btn-view-all-leaves")?.addEventListener("click", () => {
            void showDoctorScheduleLeavePage();
            highlightNav("schedule-leave");
          });
        }
      } else {
        leavesPreview.innerHTML = `<p class="text-muted">Doctor profile linked.</p>`;
      }
    }
  } catch (err) {
    console.error("Doctor Dashboard error:", err);
  }
}

// 1C. ADMIN CLEAN WORKSPACE DASHBOARD
async function showAdminDashboardPage(): Promise<void> {
  const user = getStoredUser();
  if (!user) return;

  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">ADMINISTRATION CONTROL PANEL</p>
        <h1>Hospital Operations Workspace</h1>
        <p>Clean administrative dashboard for doctor profile creation, specialisations, and system-wide leave overrides.</p>
      </div>

      <div class="page-header-actions">
        <button id="btn-add-doc-admin-top" class="btn btn-primary" type="button">+ Add Doctor Profile</button>
        <button id="btn-view-sys-apts" class="btn btn-secondary" type="button">System Appointments</button>
      </div>
    </div>

    <!-- ADMIN EXCLUSIVE METRICS -->
    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon-blue">👨‍⚕️</div>
        <div>
          <span class="stat-label">Total Doctors</span>
          <strong id="stat-admin-docs-count">—</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon-green">📅</div>
        <div>
          <span class="stat-label">Patient Appointments</span>
          <strong id="stat-admin-apts-count">—</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon-purple">🩺</div>
        <div>
          <span class="stat-label">Specialisations</span>
          <strong id="stat-admin-specs-count">—</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon-amber">🏖️</div>
        <div>
          <span class="stat-label">Doctor Leaves</span>
          <strong id="stat-admin-leaves-count">—</strong>
        </div>
      </div>
    </section>

    <!-- SPECIALISATION & LEAVE OVERRIDES DUAL PANELS -->
    <div class="dashboard-columns">
      <section class="content-card">
        <div class="card-header">
          <div>
            <h2>Specialisation Management</h2>
            <p>Active medical departments & doctor distribution.</p>
          </div>
        </div>
        <div id="admin-specialisations-container">
          <div class="empty-state compact"><p>Loading specialisations...</p></div>
        </div>
      </section>

      <section class="content-card">
        <div class="card-header">
          <div>
            <h2>Doctor Leave Overrides</h2>
            <p>System-wide view of doctor leaves and schedule absences.</p>
          </div>
        </div>
        <div id="admin-leaves-override-container">
          <div class="empty-state compact"><p>Loading leave schedules...</p></div>
        </div>
      </section>
    </div>

    <!-- SYSTEM APPOINTMENTS RECENT LOG -->
    <section class="content-card">
      <div class="card-header">
        <div>
          <h2>System Appointments Overview</h2>
          <p>Recent hospital-wide appointments across all departments.</p>
        </div>
        <button id="btn-see-all-sys-apts" class="btn btn-outline-primary btn-sm" type="button">Full System Log →</button>
      </div>
      <div id="admin-appointments-container">
        <div class="empty-state compact"><p>Loading appointments...</p></div>
      </div>
    </section>
  `;

  document.querySelector("#btn-add-doc-admin-top")?.addEventListener("click", renderCreateDoctorModal);
  document.querySelector("#btn-view-sys-apts")?.addEventListener("click", () => {
    void showSystemAppointmentsPage();
    highlightNav("system-appointments");
  });
  document.querySelector("#btn-see-all-sys-apts")?.addEventListener("click", () => {
    void showSystemAppointmentsPage();
    highlightNav("system-appointments");
  });

  try {
    const { appointments, doctors } = await loadDashboardData();

    // 1. Stats
    const docsCountEl = document.querySelector("#stat-admin-docs-count");
    if (docsCountEl) docsCountEl.textContent = String(doctors.length);

    const aptsCountEl = document.querySelector("#stat-admin-apts-count");
    if (aptsCountEl) aptsCountEl.textContent = String(appointments.length);

    const specs = Array.from(new Set(doctors.map((d) => getDoctorSpecialization(d)).filter(Boolean)));
    const specsCountEl = document.querySelector("#stat-admin-specs-count");
    if (specsCountEl) specsCountEl.textContent = String(specs.length);

    // 2. Load all doctor leaves for override review
    const leavesPromises = doctors.map((d) =>
      getDoctorLeaves(d.id).then((leaves) => leaves.map((l: any) => ({ ...l, doctor: d })))
    );
    const leavesResults = await Promise.all(leavesPromises);
    const allLeaves = leavesResults.flat();

    const leavesCountEl = document.querySelector("#stat-admin-leaves-count");
    if (leavesCountEl) leavesCountEl.textContent = String(allLeaves.length);

    // 3. Specialisation table
    const specsContainer = document.querySelector("#admin-specialisations-container");
    if (specsContainer) {
      const specMap = new Map<string, number>();
      doctors.forEach((d) => {
        const s = getDoctorSpecialization(d);
        specMap.set(s, (specMap.get(s) || 0) + 1);
      });

      specsContainer.innerHTML = `
        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Specialisation</th>
                <th>Doctors</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${Array.from(specMap.entries())
                .map(
                  ([sp, count]) => `
                    <tr>
                      <td><strong>${escapeHtml(sp)}</strong></td>
                      <td>${count} specialist(s)</td>
                      <td><span class="status-badge status-confirmed">Active</span></td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    // 4. Leave Overrides
    const leavesContainer = document.querySelector("#admin-leaves-override-container");
    if (leavesContainer) {
      if (allLeaves.length === 0) {
        leavesContainer.innerHTML = `<div class="empty-state compact"><p>No doctor leaves scheduled.</p></div>`;
      } else {
        leavesContainer.innerHTML = `
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${allLeaves
                  .slice(0, 5)
                  .map(
                    (leave: any) => `
                      <tr>
                        <td><strong>${escapeHtml(getDoctorName(leave.doctor))}</strong></td>
                        <td>${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}</td>
                        <td>${escapeHtml(leave.reason || "Absence")}</td>
                        <td>
                          <button
                            type="button"
                            class="btn btn-danger-outline btn-xs"
                            data-action="admin-override-leave"
                            data-leave-id="${escapeHtml(leave.id)}"
                          >
                            Override
                          </button>
                        </td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `;

        leavesContainer.querySelectorAll<HTMLButtonElement>('[data-action="admin-override-leave"]').forEach((btn) => {
          btn.addEventListener("click", async () => {
            const leaveId = btn.dataset.leaveId;
            if (!leaveId) return;
            if (!confirm("Are you sure you want to override and remove this leave schedule?")) return;
            try {
              await deleteDoctorLeave(leaveId);
              void showAdminDashboardPage();
            } catch (err) {
              alert("Failed to override leave: " + (err instanceof Error ? err.message : "Unknown error"));
            }
          });
        });
      }
    }

    // 5. Recent Appointments
    const aptContainer = document.querySelector("#admin-appointments-container");
    if (aptContainer) {
      aptContainer.innerHTML = renderAppointmentsList(appointments, true);
      setupAppointmentActionListeners();
    }
  } catch (err) {
    console.error("Admin dashboard error:", err);
  }
}

// 2. PATIENT: Available Doctors & Visiting Hours Page
async function showAvailableDoctorsPage(): Promise<void> {
  const user = getStoredUser();
  if (!user) return;

  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">DOCTOR DIRECTORY & VISITING HOURS</p>
        <h1>Available Doctors & Visiting Hours</h1>
        <p>Explore healthcare specialists, review their weekly visiting hours, and book a consultation slot.</p>
      </div>

      <div class="page-header-actions">
        <button id="btn-quick-book" class="btn btn-primary" type="button">+ Book Any Slot</button>
      </div>
    </div>

    <!-- FILTER BAR -->
    <section class="content-card" style="padding: 16px 24px; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
        <label for="doctor-spec-filter" style="font-weight: 600; font-size: 13px;">Filter by Specialisation:</label>
        <select id="doctor-spec-filter" class="form-control" style="max-width: 300px;">
          <option value="">All Specialisations</option>
        </select>
      </div>
    </section>

    <div id="full-doctors-grid-container">
      <div class="empty-state compact"><p>Loading doctors & visiting hours...</p></div>
    </div>
  `;

  document.querySelector("#btn-quick-book")?.addEventListener("click", () => void openBookingModal());

  try {
    const doctors = await getDoctors();
    const availableDocs = doctors.filter((d) => d.isAvailable !== false && d.user?.status !== "INACTIVE");

    const specs = Array.from(new Set(availableDocs.map((d) => getDoctorSpecialization(d)).filter(Boolean)));
    const filterSelect = document.querySelector<HTMLSelectElement>("#doctor-spec-filter");
    if (filterSelect) {
      specs.forEach((sp) => {
        const opt = document.createElement("option");
        opt.value = sp;
        opt.textContent = sp;
        filterSelect.appendChild(opt);
      });

      filterSelect.addEventListener("change", () => {
        const val = filterSelect.value;
        const filtered = val ? availableDocs.filter((d) => getDoctorSpecialization(d) === val) : availableDocs;
        const container = document.querySelector("#full-doctors-grid-container");
        if (container) {
          container.innerHTML = renderDoctorsList(filtered, false);
          setupDoctorActionListeners(filtered);
        }
      });
    }

    const container = document.querySelector("#full-doctors-grid-container");
    if (container) {
      container.innerHTML = renderDoctorsList(availableDocs, false);
      setupDoctorActionListeners(availableDocs);
    }
  } catch (err) {
    console.error(err);
  }
}

// 3. COMMON / ROLE APPOINTMENTS PAGE
async function showAppointmentsPage(): Promise<void> {
  const user = getStoredUser();
  if (!user) return;

  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">${user.role === "PATIENT" ? "MY CONSULTATIONS" : "SCHEDULED APPOINTMENTS"}</p>
        <h1>My Appointments</h1>
        <p>Complete view of all scheduled, completed, and cancelled healthcare consultations.</p>
      </div>
      ${
        user.role === "PATIENT"
          ? `<button id="btn-book-apt-page" class="btn btn-primary" type="button">+ Book Consultation</button>`
          : ""
      }
    </div>

    <section class="content-card">
      <div id="full-appointments-container">
        <div class="empty-state compact"><p>Loading appointments...</p></div>
      </div>
    </section>
  `;

  document.querySelector("#btn-book-apt-page")?.addEventListener("click", () => void openBookingModal());

  try {
    const appointments = await getAppointments();
    const container = document.querySelector("#full-appointments-container");
    if (container) {
      container.innerHTML = renderAppointmentsList(appointments, false);
      setupAppointmentActionListeners();
    }
  } catch (err) {
    console.error(err);
  }
}

// 4. DOCTOR: Patient Consultations Page
async function showPatientConsultationsPage(): Promise<void> {
  const user = getStoredUser();
  if (!user) return;

  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">CLINICAL PRACTICE</p>
        <h1>Patient Consultations</h1>
        <p>Clinical workspace to review patient symptom reports, generate AI triage questions, and prescribe medications.</p>
      </div>
    </div>

    <section class="content-card">
      <div class="card-header">
        <div>
          <h2>Active & Confirmed Consultations</h2>
          <p>Consultations ready for clinical review and post-visit summaries.</p>
        </div>
      </div>
      <div id="doctor-consultations-container">
        <div class="empty-state compact"><p>Loading consultations...</p></div>
      </div>
    </section>
  `;

  try {
    const appointments = await getAppointments();
    const container = document.querySelector("#doctor-consultations-container");
    if (container) {
      container.innerHTML = renderAppointmentsList(appointments, false);
      setupAppointmentActionListeners();
    }
  } catch (err) {
    console.error(err);
  }
}

// 5. DOCTOR: Apply Leave / Schedule Management Page
async function showDoctorScheduleLeavePage(): Promise<void> {
  const user = getStoredUser();
  if (!user) return;

  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">DOCTOR PRACTICE SCHEDULE</p>
        <h1>Apply Leave / Schedule Management</h1>
        <p>Manage your weekly visiting hours and apply for planned leave. Any conflicting appointments will be automatically cancelled and patients notified.</p>
      </div>
    </div>

    <div class="dashboard-columns">
      <!-- WORKING HOURS CARD -->
      <section class="content-card">
        <div class="card-header">
          <div>
            <h2>Current Visiting Schedule</h2>
            <p>Your established consultation hours.</p>
          </div>
        </div>
        <div id="doctor-current-schedule-box">
          <div class="visiting-hours-box" style="margin-bottom: 16px;">
            <span class="icon">⏰</span>
            <div class="schedule-text">
              <strong>Standard Working Hours</strong>
              <span id="doc-working-hours-text">Mon–Fri: 09:00 AM – 05:00 PM</span>
            </div>
          </div>
          <div class="visiting-hours-box">
            <span class="icon">⏱️</span>
            <div class="schedule-text">
              <strong>Slot Duration</strong>
              <span id="doc-slot-duration-text">30 minutes</span>
            </div>
          </div>
        </div>
      </section>

      <!-- APPLY LEAVE FORM -->
      <section class="content-card">
        <div class="card-header">
          <div>
            <h2>Apply for Planned Leave</h2>
            <p>Select leave dates. Conflicting slots will be cancelled.</p>
          </div>
        </div>

        <form id="doc-apply-leave-form">
          <div class="form-row">
            <div class="form-group">
              <label for="leave-start-input">Start Date *</label>
              <input id="leave-start-input" type="date" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="leave-end-input">End Date *</label>
              <input id="leave-end-input" type="date" class="form-control" required />
            </div>
          </div>

          <div class="form-group">
            <label for="leave-reason-input">Reason for Absence</label>
            <input id="leave-reason-input" type="text" class="form-control" placeholder="e.g. Annual Leave, Medical Conference, Personal" />
          </div>

          <div id="doc-leave-error" class="alert alert-danger" hidden></div>
          <div id="doc-leave-success" class="alert alert-success" hidden></div>

          <button id="doc-submit-leave-btn" class="btn btn-danger w-full" type="submit">
            Apply Leave & Cancel Conflicting Slots
          </button>
        </form>
      </section>
    </div>

    <!-- SCHEDULED LEAVES TABLE -->
    <section class="content-card">
      <div class="card-header">
        <div>
          <h2>My Scheduled Leaves</h2>
          <p>Active and upcoming leave entries.</p>
        </div>
      </div>
      <div id="doctor-leaves-table-container">
        <div class="empty-state compact"><p>Loading leave records...</p></div>
      </div>
    </section>
  `;

  // Set min dates to today
  const todayStr = new Date().toISOString().split("T")[0];
  const startInput = document.querySelector<HTMLInputElement>("#leave-start-input");
  const endInput = document.querySelector<HTMLInputElement>("#leave-end-input");
  if (startInput) startInput.min = todayStr;
  if (endInput) endInput.min = todayStr;

  startInput?.addEventListener("change", () => {
    if (startInput.value && endInput) endInput.min = startInput.value;
  });

  try {
    const doctors = await getDoctors();
    const currentDoctor = doctors.find((d) => d.userId === user.id);

    if (currentDoctor) {
      const whText = document.querySelector("#doc-working-hours-text");
      if (whText) whText.textContent = formatVisitingHours(currentDoctor);

      const slotText = document.querySelector("#doc-slot-duration-text");
      if (slotText) slotText.textContent = `${currentDoctor.slotDuration ?? 30} minutes`;

      const refreshLeaves = async () => {
        const leaves = await getDoctorLeaves(currentDoctor.id);
        const container = document.querySelector("#doctor-leaves-table-container");
        if (container) {
          if (leaves.length === 0) {
            container.innerHTML = `<div class="empty-state compact"><p>No leaves currently scheduled.</p></div>`;
          } else {
            container.innerHTML = `
              <div class="data-table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Reason</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${leaves
                      .map(
                        (l: any) => `
                          <tr>
                            <td><strong>${formatDate(l.startDate)}</strong></td>
                            <td><strong>${formatDate(l.endDate)}</strong></td>
                            <td>${escapeHtml(l.reason || "Approved Leave")}</td>
                            <td>
                              <button
                                type="button"
                                class="btn btn-danger-outline btn-xs"
                                data-action="delete-my-leave"
                                data-leave-id="${escapeHtml(l.id)}"
                              >
                                Cancel Leave
                              </button>
                            </td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `;

            container.querySelectorAll<HTMLButtonElement>('[data-action="delete-my-leave"]').forEach((btn) => {
              btn.addEventListener("click", async () => {
                const leaveId = btn.dataset.leaveId;
                if (!leaveId) return;
                if (!confirm("Are you sure you want to cancel this leave?")) return;
                try {
                  await deleteDoctorLeave(leaveId);
                  void refreshLeaves();
                } catch (err) {
                  alert("Failed to cancel leave: " + (err instanceof Error ? err.message : "Unknown error"));
                }
              });
            });
          }
        }
      };

      await refreshLeaves();

      // Form submit handler
      const form = document.querySelector<HTMLFormElement>("#doc-apply-leave-form");
      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const startDate = startInput?.value;
        const endDate = endInput?.value;
        const reason = document.querySelector<HTMLInputElement>("#leave-reason-input")?.value.trim();
        const errorEl = document.querySelector<HTMLElement>("#doc-leave-error");
        const successEl = document.querySelector<HTMLElement>("#doc-leave-success");
        const submitBtn = document.querySelector<HTMLButtonElement>("#doc-submit-leave-btn");

        if (!startDate || !endDate) return;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Processing leave & cancelling conflicts...";
        }
        if (errorEl) errorEl.hidden = true;
        if (successEl) successEl.hidden = true;

        try {
          const result = await addDoctorLeave({
            doctorId: currentDoctor.id,
            startDate,
            endDate,
            reason: reason || undefined
          });

          if (successEl) {
            successEl.textContent = `Leave booked successfully! ${result?.cancelledAppointmentsCount || 0} conflicting appointment(s) cancelled and patients notified.`;
            successEl.hidden = false;
          }

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Apply Leave & Cancel Conflicting Slots";
          }

          form.reset();
          await refreshLeaves();
        } catch (err) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Apply Leave & Cancel Conflicting Slots";
          }
          if (errorEl) {
            errorEl.textContent = getErrorMessage(err, "Failed to apply doctor leave.");
            errorEl.hidden = false;
          }
        }
      });
    }
  } catch (err) {
    console.error("Doctor schedule leave page error:", err);
  }
}

// 6. ADMIN: Doctor Management Page
async function showDoctorManagementPage(): Promise<void> {
  const user = getStoredUser();
  if (!user || user.role !== "ADMIN") return;

  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">HOSPITAL STAFF MANAGEMENT</p>
        <h1>Doctor Management</h1>
        <p>Add and edit doctor profiles, manage default working hours (Mon-Fri 09:00 - 17:00), and administer leave schedules.</p>
      </div>

      <div class="page-header-actions">
        <button id="btn-add-doc-mgmt-page" class="btn btn-primary" type="button">+ Add New Doctor Profile</button>
      </div>
    </div>

    <section class="content-card">
      <div class="card-header">
        <div>
          <h2>Registered Healthcare Specialists</h2>
          <p>Specialisation, qualifications, slot durations, and absence administration.</p>
        </div>
      </div>
      <div id="admin-doctors-list-container">
        <div class="empty-state compact"><p>Loading doctors...</p></div>
      </div>
    </section>
  `;

  document.querySelector("#btn-add-doc-mgmt-page")?.addEventListener("click", renderCreateDoctorModal);

  try {
    const doctors = await getDoctors();
    const container = document.querySelector("#admin-doctors-list-container");
    if (container) {
      container.innerHTML = renderDoctorsList(doctors, true);
      setupDoctorActionListeners(doctors);
    }
  } catch (err) {
    console.error(err);
  }
}

// 7. ADMIN: System Appointments Overview Page
async function showSystemAppointmentsPage(): Promise<void> {
  const user = getStoredUser();
  if (!user || user.role !== "ADMIN") return;

  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">SYSTEM AUDIT & BOOKINGS</p>
        <h1>System Appointments Overview</h1>
        <p>Complete hospital-wide register of all patient bookings across all doctor schedules.</p>
      </div>
    </div>

    <section class="content-card">
      <div id="system-appointments-full-container">
        <div class="empty-state compact"><p>Loading system appointments...</p></div>
      </div>
    </section>
  `;

  try {
    const appointments = await getAppointments();
    const container = document.querySelector("#system-appointments-full-container");
    if (container) {
      container.innerHTML = renderAppointmentsList(appointments, false);
      setupAppointmentActionListeners();
    }
  } catch (err) {
    console.error(err);
  }
}

// 8. ADMIN: Analytics / Metrics Summary Page
async function showAnalyticsPage(): Promise<void> {
  const user = getStoredUser();
  if (!user || user.role !== "ADMIN") return;

  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">SYSTEM PERFORMANCE & METRICS</p>
        <h1>Analytics / Metrics Summary</h1>
        <p>High-level operational performance, consultation fulfillment rates, and departmental breakdown.</p>
      </div>
    </div>

    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon-blue">📊</div>
        <div>
          <span class="stat-label">Total Appointments</span>
          <strong id="analytics-total-apts">—</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon-green">✅</div>
        <div>
          <span class="stat-label">Fulfillment Rate</span>
          <strong id="analytics-fulfillment-rate">—</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon-red">❌</div>
        <div>
          <span class="stat-label">Cancellation Rate</span>
          <strong id="analytics-cancellation-rate">—</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon-purple">👨‍⚕️</div>
        <div>
          <span class="stat-label">Active Doctors</span>
          <strong id="analytics-active-docs">—</strong>
        </div>
      </div>
    </section>

    <div class="dashboard-columns">
      <section class="content-card">
        <div class="card-header">
          <div>
            <h2>Appointments Status Distribution</h2>
            <p>Breakdown across scheduling lifecycles.</p>
          </div>
        </div>
        <div id="analytics-status-breakdown">
          <div class="empty-state compact"><p>Loading status analytics...</p></div>
        </div>
      </section>

      <section class="content-card">
        <div class="card-header">
          <div>
            <h2>Specialisation Distribution</h2>
            <p>Doctor roster capacity across clinical specialties.</p>
          </div>
        </div>
        <div id="analytics-spec-breakdown">
          <div class="empty-state compact"><p>Loading specialty analytics...</p></div>
        </div>
      </section>
    </div>
  `;

  try {
    const { appointments, doctors } = await loadDashboardData();

    const totalApts = appointments.length;
    const completedApts = appointments.filter((a) => a.status === "COMPLETED").length;
    const confirmedApts = appointments.filter((a) => a.status === "CONFIRMED").length;
    const scheduledApts = appointments.filter((a) => a.status === "SCHEDULED").length;
    const cancelledApts = appointments.filter((a) => a.status === "CANCELLED").length;

    const totalEl = document.querySelector("#analytics-total-apts");
    if (totalEl) totalEl.textContent = String(totalApts);

    const fulfillEl = document.querySelector("#analytics-fulfillment-rate");
    if (fulfillEl) {
      const rate = totalApts > 0 ? Math.round(((completedApts + confirmedApts) / totalApts) * 100) : 100;
      fulfillEl.textContent = `${rate}%`;
    }

    const cancelEl = document.querySelector("#analytics-cancellation-rate");
    if (cancelEl) {
      const cancelRate = totalApts > 0 ? Math.round((cancelledApts / totalApts) * 100) : 0;
      cancelEl.textContent = `${cancelRate}%`;
    }

    const docEl = document.querySelector("#analytics-active-docs");
    if (docEl) docEl.textContent = String(doctors.length);

    // Status progress bars
    const statusBox = document.querySelector("#analytics-status-breakdown");
    if (statusBox) {
      const makeBar = (label: string, count: number, fillClass: string) => {
        const pct = totalApts > 0 ? Math.round((count / totalApts) * 100) : 0;
        return `
          <div class="analytics-bar-item">
            <div class="analytics-bar-label">
              <span>${label} (${count})</span>
              <span>${pct}%</span>
            </div>
            <div class="analytics-progress-bg">
              <div class="analytics-progress-fill ${fillClass}" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      };

      statusBox.innerHTML = `
        ${makeBar("Confirmed Consultations", confirmedApts, "fill-green")}
        ${makeBar("Completed Consultations", completedApts, "fill-green")}
        ${makeBar("Scheduled (Pending)", scheduledApts, "fill-amber")}
        ${makeBar("Cancelled / Doctor Absence", cancelledApts, "fill-red")}
      `;
    }

    // Specialisation breakdown
    const specBox = document.querySelector("#analytics-spec-breakdown");
    if (specBox) {
      const specMap = new Map<string, number>();
      doctors.forEach((d) => {
        const s = getDoctorSpecialization(d);
        specMap.set(s, (specMap.get(s) || 0) + 1);
      });

      specBox.innerHTML = `
        ${Array.from(specMap.entries())
          .map(([sp, count]) => {
            const pct = doctors.length > 0 ? Math.round((count / doctors.length) * 100) : 0;
            return `
              <div class="analytics-bar-item">
                <div class="analytics-bar-label">
                  <span>${escapeHtml(sp)} (${count})</span>
                  <span>${pct}%</span>
                </div>
                <div class="analytics-progress-bg">
                  <div class="analytics-progress-fill" style="width: ${pct}%;"></div>
                </div>
              </div>
            `;
          })
          .join("")}
      `;
    }
  } catch (err) {
    console.error("Analytics error:", err);
  }
}

// 9. Follow-ups Page
async function showFollowUpsPage(): Promise<void> {
  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">CARE CONTINUITY</p>
        <h1>Follow-ups</h1>
        <p>Review follow-up evaluations and physician care instructions.</p>
      </div>
    </div>

    <section class="content-card">
      <div id="full-followups-container">
        <div class="empty-state compact"><p>Loading follow-ups...</p></div>
      </div>
    </section>
  `;

  try {
    const { followUps } = await loadDashboardData();
    const container = document.querySelector("#full-followups-container");
    if (container) {
      container.innerHTML = renderFollowUpsList(followUps, false);
    }
  } catch (err) {
    console.error(err);
  }
}

// 10. Reminders Page
async function showRemindersPage(): Promise<void> {
  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">NOTIFICATIONS & MEDICATION</p>
        <h1>Reminders</h1>
        <p>Automated reminders for appointment times, prescribed medication frequency, and follow-ups.</p>
      </div>
    </div>

    <section class="content-card">
      <div id="full-reminders-container">
        <div class="empty-state compact"><p>Loading reminders...</p></div>
      </div>
    </section>
  `;

  try {
    const reminders = await getReminders();
    const container = document.querySelector("#full-reminders-container");
    if (container) {
      container.innerHTML = renderRemindersList(reminders, false);
    }
  } catch (err) {
    console.error(err);
  }
}

// 11. Profile & Calendar Integrations Page
async function showProfilePage(): Promise<void> {
  const user = getStoredUser();
  if (!user) return;

  const mainContent = document.querySelector<HTMLElement>("#main-page-content");
  if (!mainContent) return;

  let calStatus: CalendarStatus = { isConnected: false };
  try {
    calStatus = await getCalendarStatus();
  } catch {
    calStatus = { isConnected: false };
  }

  mainContent.innerHTML = `
    <div class="page-header">
      <div>
        <p class="eyebrow">ACCOUNT & INTEGRATIONS</p>
        <h1>Profile & Calendar</h1>
        <p>Account details and external Google Calendar synchronization.</p>
      </div>
    </div>

    <div class="dashboard-columns">
      <section class="content-card">
        <div class="card-header">
          <div>
            <h2>Personal Information</h2>
          </div>
        </div>
        <div class="profile-details-grid">
          <div class="profile-row">
            <span class="text-muted">Full Name</span>
            <strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong>
          </div>
          <div class="profile-row">
            <span class="text-muted">Email</span>
            <strong>${escapeHtml(user.email)}</strong>
          </div>
          <div class="profile-row">
            <span class="text-muted">Role</span>
            <span class="status-badge status-confirmed">${escapeHtml(user.role)}</span>
          </div>
          ${
            user.phone
              ? `
                <div class="profile-row">
                  <span class="text-muted">Phone</span>
                  <strong>${escapeHtml(user.phone)}</strong>
                </div>
              `
              : ""
          }
        </div>
      </section>

      <section class="content-card">
        <div class="card-header">
          <div>
            <h2>Google Calendar Integration</h2>
            <p>Sync your booked appointments directly to your personal Google Calendar.</p>
          </div>
        </div>

        <div class="calendar-integration-box">
          <div class="cal-status-row">
            <span class="cal-icon">📅</span>
            <div>
              <strong>Google Calendar</strong>
              <p class="text-muted">
                ${
                  calStatus.isConnected
                    ? `Connected (${calStatus.connection?.calendarId || "primary"})`
                    : "Not connected yet"
                }
              </p>
            </div>
            <span class="status-badge ${calStatus.isConnected ? "status-confirmed" : "status-scheduled"}">
              ${calStatus.isConnected ? "Active" : "Unlinked"}
            </span>
          </div>

          <div class="cal-actions">
            <button id="btn-connect-google-cal" class="btn btn-primary" type="button">
              ${calStatus.isConnected ? "🔄 Re-authenticate Google Calendar" : "🔗 Connect Google Calendar"}
            </button>
          </div>
          <div id="cal-connect-error" class="alert alert-danger" hidden></div>
        </div>
      </section>
    </div>
  `;

  document.querySelector("#btn-connect-google-cal")?.addEventListener("click", async () => {
    const errorEl = document.querySelector("#cal-connect-error") as HTMLElement;
    if (errorEl) errorEl.hidden = true;
    try {
      const url = await getGoogleConnectUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = getErrorMessage(
          err,
          "Google Calendar OAuth credentials are not configured on the server."
        );
        errorEl.hidden = false;
      }
    }
  });
}

function highlightNav(navKey: string): void {
  document.querySelectorAll<HTMLButtonElement>(".nav-item").forEach((btn) => {
    if (btn.dataset.nav === navKey) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

/**
 * ---------------------------------------------------------
 * Application Dashboard Layout (Strict Role-Based Sidebars)
 * ---------------------------------------------------------
 */

function generateRoleSidebarHtml(role: string): string {
  if (role === "PATIENT") {
    return `
      <p class="nav-role-heading">Patient Menu</p>
      <button class="nav-item active" type="button" data-nav="dashboard">
        <span>📊</span> Dashboard
      </button>
      <button class="nav-item" type="button" data-nav="available-doctors">
        <span>👨‍⚕️</span> Available Doctors & Slots
      </button>
      <button class="nav-item" type="button" data-nav="my-appointments">
        <span>📅</span> My Appointments
      </button>
      <button class="nav-item" type="button" data-nav="follow-ups">
        <span>🔄</span> Follow-ups
      </button>
      <button class="nav-item" type="button" data-nav="reminders">
        <span>🔔</span> Reminders
      </button>
      <button class="nav-item" type="button" data-nav="profile">
        <span>👤</span> Profile & Calendar
      </button>
    `;
  }

  if (role === "DOCTOR") {
    return `
      <p class="nav-role-heading">Physician Menu</p>
      <button class="nav-item active" type="button" data-nav="dashboard">
        <span>📊</span> Dashboard
      </button>
      <button class="nav-item" type="button" data-nav="my-appointments">
        <span>📅</span> My Appointments
      </button>
      <button class="nav-item" type="button" data-nav="patient-consultations">
        <span>🩺</span> Patient Consultations
      </button>
      <button class="nav-item" type="button" data-nav="schedule-leave">
        <span>🏖️</span> Apply Leave / Schedule Management
      </button>
      <button class="nav-item" type="button" data-nav="profile">
        <span>👤</span> Profile & Calendar
      </button>
    `;
  }

  // ADMIN
  return `
    <p class="nav-role-heading">Admin Operations</p>
    <button class="nav-item active" type="button" data-nav="dashboard">
      <span>📊</span> Dashboard
    </button>
    <button class="nav-item" type="button" data-nav="doctor-management">
      <span>👨‍⚕️</span> Doctor Management
    </button>
    <button class="nav-item" type="button" data-nav="system-appointments">
      <span>📅</span> System Appointments Overview
    </button>
    <button class="nav-item" type="button" data-nav="analytics">
      <span>📈</span> Analytics / Metrics Summary
    </button>
  `;
}

async function renderDashboard(): Promise<void> {
  const user = getStoredUser();
  if (!user) {
    renderLogin(initializeApplication);
    return;
  }

  const app = getApp();

  app.innerHTML = `
    <div class="app-shell">
      <!-- DEEP NAVY NAVBAR -->
      <header class="topbar">
        <div class="brand">
          <div class="brand-icon-nav">🏥</div>
          <div>
            <strong>CarePoint</strong>
            <span>MediLife Healthcare</span>
          </div>
        </div>

        <div class="user-area">
          <div class="user-info">
            <strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong>
            <span class="user-role-tag">${escapeHtml(user.role)}</span>
          </div>

          <button id="logout-button" class="btn btn-sm btn-logout" type="button">
            Logout
          </button>
        </div>
      </header>

      <div class="app-body">
        <!-- DYNAMIC ROLE-BASED SIDEBAR -->
        <aside class="sidebar">
          <nav id="role-sidebar-nav">
            ${generateRoleSidebarHtml(user.role)}
          </nav>
        </aside>

        <main id="main-page-content" class="main-content">
          <div class="empty-state"><p>Loading workspace...</p></div>
        </main>
      </div>
    </div>
  `;

  // Logout listener
  document.querySelector("#logout-button")?.addEventListener("click", () => {
    logout();
    initializeApplication();
  });

  // Navigation listener
  document.querySelectorAll<HTMLButtonElement>(".nav-item").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const dest = btn.dataset.nav;

      document.querySelectorAll<HTMLButtonElement>(".nav-item").forEach((item) => {
        item.classList.remove("active");
      });
      btn.classList.add("active");

      if (dest === "dashboard") {
        await showDashboardPage();
      } else if (dest === "available-doctors") {
        await showAvailableDoctorsPage();
      } else if (dest === "my-appointments") {
        await showAppointmentsPage();
      } else if (dest === "patient-consultations") {
        await showPatientConsultationsPage();
      } else if (dest === "schedule-leave") {
        await showDoctorScheduleLeavePage();
      } else if (dest === "doctor-management") {
        await showDoctorManagementPage();
      } else if (dest === "system-appointments") {
        await showSystemAppointmentsPage();
      } else if (dest === "analytics") {
        await showAnalyticsPage();
      } else if (dest === "follow-ups") {
        await showFollowUpsPage();
      } else if (dest === "reminders") {
        await showRemindersPage();
      } else if (dest === "profile") {
        await showProfilePage();
      }
    });
  });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("calendar") === "connected") {
    window.history.replaceState({}, document.title, window.location.pathname);
    alert("Google Calendar successfully connected!");
  }

  await showDashboardPage();
}

/**
 * ---------------------------------------------------------
 * Application Entry Point
 * ---------------------------------------------------------
 */

async function initializeApplication(): Promise<void> {
  if (!isAuthenticated()) {
    renderLogin(initializeApplication);
    return;
  }

  renderLoading();

  try {
    await getCurrentUser();
    await renderDashboard();
  } catch (error) {
    console.error("Initialization error:", error);
    logout();
    renderLogin(initializeApplication);
  }
}

// Start application
initializeApplication();