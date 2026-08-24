import "./style.css";

import {
  isAuthenticated,
  getStoredUser,
  getCurrentUser,
  logout
} from "./auth/auth";
import {
  getReminders
} from "./services/reminder.service";
import {
  createPreVisitSummary,
  getPreVisitSummary
} from "./services/preVisit.service";

import {
  renderLogin
} from "./pages/login";

import {
  get,
} from "./api/api";

import {
  getAppointments,
  createAppointment,
  cancelAppointment,
  updateAppointmentStatus
} from "./services/appointment.service";

import {
  getAppointmentFollowUps,
  createFollowUp
} from "./services/followUp.service";



import type {
  Appointment
} from "./services/appointment.service";

import type {
  FollowUp
} from "./services/followUp.service";

import type {
  Reminder
} from "./services/reminder.service";

/**
 * ---------------------------------------------------------
 * Types
 * ---------------------------------------------------------
 */

interface Doctor {
  id: string;
  userId?: string;

  specialization?: string;
  qualification?: string;
  experienceYears?: number;
  consultationFee?: number;
  isAvailable?: boolean;

  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    status?: string;
  };
}

/**
 * ---------------------------------------------------------
 * Application root
 * ---------------------------------------------------------
 */

function getApp(): HTMLDivElement {
  const app =
    document.querySelector<HTMLDivElement>(
      "#app"
    );

  if (!app) {
    throw new Error(
      "App root element not found"
    );
  }

  return app;
}

/**
 * ---------------------------------------------------------
 * Loading screen
 * ---------------------------------------------------------
 */

function renderLoading(): void {
  getApp().innerHTML = `
    <div class="app-loading">
      <div class="loading-card">

        <div class="loading-icon">
          🏥
        </div>

        <h1>CarePoint</h1>

        <p>
          Loading your healthcare dashboard...
        </p>

      </div>
    </div>
  `;
}

/**
 * ---------------------------------------------------------
 * Formatting helpers
 * ---------------------------------------------------------
 */

function formatDate(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

function formatTime(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function escapeHtml(
  value: string
): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * ---------------------------------------------------------
 * Doctor helpers
 * ---------------------------------------------------------
 */

function getDoctorName(
  doctor: Doctor
): string {
  const firstName =
    doctor.user?.firstName ?? "";

  const lastName =
    doctor.user?.lastName ?? "";

  const fullName =
    `${firstName} ${lastName}`.trim();

  if (fullName) {
    return `Dr. ${fullName}`;
  }

  return "Doctor";
}

function getDoctorSpecialization(
  doctor: Doctor
): string {
  return (
    doctor.specialization ??
    "General Medicine"
  );
}

/**
 * ---------------------------------------------------------
 * Fetch doctors
 * ---------------------------------------------------------
 *
 * The backend exposes:
 *
 * GET /api/v1/doctors
 *
 * and returns:
 *
 * {
 *   success: true,
 *   data: [...]
 * }
 *
 * The API helper already handles the
 * /api/v1 base path.
 */

async function getDoctors(): Promise<
  Doctor[]
> {
  const response =
    await get<Doctor[]>(
      "/doctors"
    );

  return response.data ?? [];
}
function getAppointmentDoctorName(
  appointment: Appointment
): string {

  const doctor =
    appointment.doctor as
      | {
          user?: {
            firstName?: string;
            lastName?: string;
          };
        }
      | undefined;

  const firstName =
    doctor?.user?.firstName ?? "";

  const lastName =
    doctor?.user?.lastName ?? "";

  const fullName =
    `${firstName} ${lastName}`.trim();

  return fullName
    ? `Dr. ${fullName}`
    : "Doctor";
}

function getAppointmentPatientName(
  appointment: Appointment
): string {

  const patient =
    appointment.patient as
      | {
          user?: {
            firstName?: string;
            lastName?: string;
          };
        }
      | undefined;

  const firstName =
    patient?.user?.firstName ?? "";

  const lastName =
    patient?.user?.lastName ?? "";

  const fullName =
    `${firstName} ${lastName}`.trim();

  return fullName || "Patient";
}


/**
 * ---------------------------------------------------------
 * Render appointment rows
 * ---------------------------------------------------------
 */
function renderAppointments(
  appointments: Appointment[]
): string {

  const user =
    getStoredUser();

  if (!user) {
    return `
      <div class="empty-state compact">
        <h3>Authentication required</h3>
      </div>
    `;
  }

  if (appointments.length === 0) {
    return `
      <div class="empty-state compact">

        <div class="empty-icon">
          📅
        </div>

        <h3>
          No appointments found
        </h3>

        <p>
          Your appointments will appear here.
        </p>

      </div>
    `;
  }

  const sortedAppointments =
    [...appointments].sort(
      (a, b) =>
        new Date(a.startTime).getTime() -
        new Date(b.startTime).getTime()
    );

  return `
    <div class="appointment-list">

      ${sortedAppointments
        .map(
          (appointment) => {

            const isCancelled =
              appointment.status ===
              "CANCELLED";

            const isCompleted =
              appointment.status ===
              "COMPLETED";

            const isNoShow =
              appointment.status ===
              "NO_SHOW";

            const canCancel =
              !isCancelled &&
              !isCompleted &&
              !isNoShow;

            const canChangeStatus =
              user.role === "DOCTOR" ||
              user.role === "ADMIN";
              const canCreateFollowUp =
  user.role === "DOCTOR" &&
  !isCancelled &&
  !isCompleted &&
  !isNoShow;

            const doctorName =
              getAppointmentDoctorName(
                appointment
              );

            const patientName =
              getAppointmentPatientName(
                appointment
              );

            return `
              <div
                class="appointment-row appointment-management-row"
                data-appointment-id="${escapeHtml(
                  appointment.id
                )}"
              >

                <div class="appointment-date">

                  <strong>
                    ${formatDate(
                      appointment.startTime
                    )}
                  </strong>

                  <span>
                    ${formatTime(
                      appointment.startTime
                    )}
                    -
                    ${formatTime(
                      appointment.endTime
                    )}
                  </span>

                </div>

                <div class="appointment-info">

                  <strong>
                    ${escapeHtml(
                      appointment.type
                    )}
                  </strong>

                  <span>
                    ${
                      user.role === "PATIENT"
                        ? `Doctor: ${escapeHtml(
                            doctorName
                          )}`
                        : `Patient: ${escapeHtml(
                            patientName
                          )}`
                    }
                  </span>

                  <span>
                    ${
                      appointment.reason
                        ? escapeHtml(
                            appointment.reason
                          )
                        : "Healthcare consultation"
                    }
                  </span>

                  ${
                    appointment.cancellationReason
                      ? `
                        <small>
                          Cancellation reason:
                          ${escapeHtml(
                            appointment.cancellationReason
                          )}
                        </small>
                      `
                      : ""
                  }

                </div>

                <div class="appointment-actions">

                  <span
                    class="status-badge status-${appointment.status.toLowerCase()}"
                  >
                    ${escapeHtml(
                      appointment.status
                    )}
                  </span>
                  ${
  user.role === "PATIENT" &&
  appointment.status !== "CANCELLED"
    ? `
      <button
        class="secondary-button"
        type="button"
        data-action="pre-visit"
        data-appointment-id="${escapeHtml(
          appointment.id
        )}"
      >
        🧠 Pre-Visit Summary
      </button>
    `
    : ""
}
                  ${
  canCreateFollowUp
    ? `
      <button
        type="button"
        class="secondary-button appointment-follow-up-button"
        data-action="create-follow-up"
        data-appointment-id="${escapeHtml(
          appointment.id
        )}"
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
                          class="secondary-button appointment-cancel-button"
                          data-action="cancel"
                          data-appointment-id="${escapeHtml(
                            appointment.id
                          )}"
                        >
                          Cancel
                        </button>
                      `
                      : ""
                  }

                  ${
                    canChangeStatus &&
                    appointment.status === "SCHEDULED"
                      ? `
                        <button
                          type="button"
                          class="primary-button appointment-status-button"
                          data-action="status"
                          data-status="CONFIRMED"
                          data-appointment-id="${escapeHtml(
                            appointment.id
                          )}"
                        >
                          Confirm
                        </button>
                      `
                      : ""
                  }

                  ${
                    canChangeStatus &&
                    appointment.status === "CONFIRMED"
                      ? `
                        <button
                          type="button"
                          class="primary-button appointment-status-button"
                          data-action="status"
                          data-status="COMPLETED"
                          data-appointment-id="${escapeHtml(
                            appointment.id
                          )}"
                        >
                          Complete
                        </button>

                        <button
                          type="button"
                          class="secondary-button appointment-status-button"
                          data-action="status"
                          data-status="NO_SHOW"
                          data-appointment-id="${escapeHtml(
                            appointment.id
                          )}"
                        >
                          No-show
                        </button>
                      `
                      : ""
                  }

                </div>

              </div>
            `;
          }
        )
        .join("")}

    </div>
  `;
}

/**
 * ---------------------------------------------------------
 * Render follow-ups
 * ---------------------------------------------------------
 */

function renderFollowUps(
  followUps: FollowUp[]
): string {

  if (followUps.length === 0) {
    return `
      <div class="empty-state compact">

        <div class="empty-icon">
          🔄
        </div>

        <h3>
          No follow-ups
        </h3>

        <p>
          Follow-up appointments will appear
          here when available.
        </p>

      </div>
    `;
  }

  return `
    <div class="follow-up-list">

      ${followUps
        .slice(0, 5)
        .map(
          (followUp) => `
            <div class="follow-up-row">

              <div class="follow-up-icon">
                🔄
              </div>

              <div class="follow-up-info">

                <strong>
                  Follow-up evaluation
                </strong>

                <span>
                  ${
                    followUp.scheduledAt
                      ? formatDate(
                          followUp.scheduledAt
                        )
                      : "Schedule pending"
                  }
                </span>

              </div>

              <span
                class="status-badge status-${followUp.status.toLowerCase()}"
              >
                ${escapeHtml(
                  followUp.status
                )}
              </span>

            </div>
          `
        )
        .join("")}

    </div>
  `;
}

/**
 * ---------------------------------------------------------
 * Render reminders
 * ---------------------------------------------------------
 */

function renderReminders(
  reminders: Reminder[]
): string {

  if (reminders.length === 0) {
    return `
      <div class="empty-state compact">

        <div class="empty-icon">
          🔔
        </div>

        <h3>
          No reminders
        </h3>

        <p>
          You currently have no reminders.
        </p>

      </div>
    `;
  }

  return `
    <div class="reminder-list">

      ${reminders
        .slice(0, 5)
        .map(
          (reminder) => `
            <div class="reminder-row">

              <div class="reminder-icon">
                🔔
              </div>

              <div class="reminder-info">

                <strong>
                  ${escapeHtml(
                    reminder.title
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    reminder.message
                  )}
                </span>

                <small>
                  ${formatDate(
                    reminder.scheduledFor
                  )}
                  ·
                  ${formatTime(
                    reminder.scheduledFor
                  )}
                </small>

              </div>

              <span
                class="status-badge status-${reminder.status.toLowerCase()}"
              >
                ${escapeHtml(
                  reminder.status
                )}
              </span>

            </div>
          `
        )
        .join("")}

    </div>
  `;
}

/**
 * ---------------------------------------------------------
 * Dashboard data
 * ---------------------------------------------------------
 */

async function loadDashboardData(): Promise<{
  appointments: Appointment[];
  followUps: FollowUp[];
  reminders: Reminder[];
}> {

  const appointments =
    await getAppointments();

  const reminders =
    await getReminders();

  /**
   * Follow-ups are accessed through
   * individual appointments.
   *
   * If one appointment's follow-up
   * request fails, the other requests
   * should still succeed.
   */

  const followUpResults =
    await Promise.all(
      appointments.map(
        async (appointment) => {
          try {

            return await getAppointmentFollowUps(
              appointment.id
            );

          } catch {

            return [];
          }
        }
      )
    );

  const followUps =
    followUpResults.flat();

  return {
    appointments,
    followUps,
    reminders
  };
}

/**
 * ---------------------------------------------------------
 * Appointment booking modal
 * ---------------------------------------------------------
 */

function renderBookingModal(
  doctors: Doctor[]
): void {

  const existingModal =
    document.querySelector(
      "#booking-modal"
    );

  if (existingModal) {
    existingModal.remove();
  }

  const availableDoctors =
    doctors.filter(
      (doctor) =>
        doctor.isAvailable !== false &&
        doctor.user?.status !== "INACTIVE"
    );

  const doctorOptions =
    availableDoctors.length > 0
      ? availableDoctors
          .map(
            (doctor) => `
              <option
                value="${escapeHtml(
                  doctor.id
                )}"
              >
                ${escapeHtml(
                  getDoctorName(doctor)
                )}
                -
                ${escapeHtml(
                  getDoctorSpecialization(
                    doctor
                  )
                )}
              </option>
            `
          )
          .join("")
      : `
          <option value="">
            No doctors available
          </option>
        `;

  const modal =
    document.createElement(
      "div"
    );

  modal.id =
    "booking-modal";

  modal.innerHTML = `
    <div
      class="booking-modal-backdrop"
      data-close-booking="true"
    >

      <div
        class="booking-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
      >

        <div class="booking-modal-header">

          <div>

            <p class="eyebrow">
              APPOINTMENT
            </p>

            <h2 id="booking-modal-title">
              Book an appointment
            </h2>

            <p>
              Select a doctor and schedule
              your consultation.
            </p>

          </div>

          <button
            id="close-booking-modal"
            class="modal-close-button"
            type="button"
            aria-label="Close"
          >
            ×
          </button>

        </div>

        <form
          id="booking-form"
          class="booking-form"
        >

          <div class="form-group">

            <label
              for="booking-doctor"
            >
              Doctor
            </label>

            <select
              id="booking-doctor"
              name="doctorId"
              required
            >

              <option
                value=""
                selected
                disabled
              >
                Select a doctor
              </option>

              ${doctorOptions}

            </select>

          </div>

          <div class="form-row">

            <div class="form-group">

              <label
                for="booking-start"
              >
                Start time
              </label>

              <input
                id="booking-start"
                name="startTime"
                type="datetime-local"
                required
              />

            </div>

            <div class="form-group">

              <label
                for="booking-end"
              >
                End time
              </label>

              <input
                id="booking-end"
                name="endTime"
                type="datetime-local"
                required
              />

            </div>

          </div>

          <div class="form-group">

            <label
              for="booking-type"
            >
              Appointment type
            </label>

            <select
              id="booking-type"
              name="type"
              required
            >

              <option
                value="CONSULTATION"
              >
                Consultation
              </option>

              <option
                value="FOLLOW_UP"
              >
                Follow-up
              </option>

              <option
                value="EMERGENCY"
              >
                Emergency
              </option>

            </select>

          </div>

          <div class="form-group">

            <label
              for="booking-reason"
            >
              Reason
            </label>

            <textarea
              id="booking-reason"
              name="reason"
              rows="4"
              maxlength="500"
              placeholder="Describe the reason for your appointment"
            ></textarea>

          </div>

          <div
            id="booking-error"
            class="form-error"
            hidden
          ></div>

          <div
            id="booking-success"
            class="form-success"
            hidden
          ></div>

          <div class="booking-form-actions">

            <button
              id="cancel-booking"
              class="secondary-button"
              type="button"
            >
              Cancel
            </button>

            <button
              id="submit-booking"
              class="primary-button"
              type="submit"
            >
              Book Appointment
            </button>

          </div>

        </form>

      </div>

    </div>
  `;

  document.body.appendChild(
    modal
  );

  /**
   * Close modal.
   */

  const closeModal =
    () => {
      modal.remove();
    };

  document
    .querySelector<HTMLButtonElement>(
      "#close-booking-modal"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .querySelector<HTMLButtonElement>(
      "#cancel-booking"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .querySelector<HTMLElement>(
      '[data-close-booking="true"]'
    )
    ?.addEventListener(
      "click",
      (event) => {

        if (
          event.target ===
          event.currentTarget
        ) {
          closeModal();
        }

      }
    );

  /**
   * Prevent selecting a time in the past.
   */

  const startInput =
    document.querySelector<HTMLInputElement>(
      "#booking-start"
    );

  const endInput =
    document.querySelector<HTMLInputElement>(
      "#booking-end"
    );

  const now =
    new Date();

  now.setMinutes(
    now.getMinutes() -
      now.getTimezoneOffset()
  );

  const minimumDateTime =
    now
      .toISOString()
      .slice(
        0,
        16
      );

  if (startInput) {
    startInput.min =
      minimumDateTime;
  }

  if (endInput) {
    endInput.min =
      minimumDateTime;
  }

  startInput?.addEventListener(
    "change",
    () => {

      if (
        startInput.value
      ) {

        if (endInput) {
          endInput.min =
            startInput.value;
        }

      }

    }
  );

  /**
   * Booking form submit.
   */

  const form =
    document.querySelector<HTMLFormElement>(
      "#booking-form"
    );

  form?.addEventListener(
    "submit",
    async (
      event
    ) => {

      event.preventDefault();

      const submitButton =
        document.querySelector<HTMLButtonElement>(
          "#submit-booking"
        );

      const errorBox =
        document.querySelector<HTMLDivElement>(
          "#booking-error"
        );

      const successBox =
        document.querySelector<HTMLDivElement>(
          "#booking-success"
        );

      if (
        errorBox
      ) {
        errorBox.hidden =
          true;

        errorBox.textContent =
          "";
      }

      if (
        successBox
      ) {
        successBox.hidden =
          true;

        successBox.textContent =
          "";
      }

      const formData =
        new FormData(
          form
        );

      const doctorId =
        String(
          formData.get(
            "doctorId"
          ) ?? ""
        );

      const startTime =
        String(
          formData.get(
            "startTime"
          ) ?? ""
        );

      const endTime =
        String(
          formData.get(
            "endTime"
          ) ?? ""
        );

      const type =
        String(
          formData.get(
            "type"
          ) ?? ""
        );

      const reasonValue =
        String(
          formData.get(
            "reason"
          ) ?? ""
        ).trim();

      if (!doctorId) {

        if (errorBox) {
          errorBox.textContent =
            "Please select a doctor.";

          errorBox.hidden =
            false;
        }

        return;
      }

      if (
        !startTime ||
        !endTime
      ) {

        if (errorBox) {
          errorBox.textContent =
            "Please select both start and end times.";

          errorBox.hidden =
            false;
        }

        return;
      }

      const start =
        new Date(
          startTime
        );

      const end =
        new Date(
          endTime
        );

      if (
        Number.isNaN(
          start.getTime()
        ) ||
        Number.isNaN(
          end.getTime()
        )
      ) {

        if (errorBox) {
          errorBox.textContent =
            "Please enter valid appointment times.";

          errorBox.hidden =
            false;
        }

        return;
      }

      if (
        start <= new Date()
      ) {

        if (errorBox) {
          errorBox.textContent =
            "Appointment must be scheduled in the future.";

          errorBox.hidden =
            false;
        }

        return;
      }

      if (
        start >= end
      ) {

        if (errorBox) {
          errorBox.textContent =
            "End time must be later than start time.";

          errorBox.hidden =
            false;
        }

        return;
      }

      if (
        submitButton
      ) {
        submitButton.disabled =
          true;

        submitButton.textContent =
          "Booking...";
      }

      try {

        const appointment =
          await createAppointment(
            {
              doctorId,

              /**
               * datetime-local gives a local
               * time. toISOString() converts it
               * to the offset-aware UTC format
               * required by the backend.
               */

              startTime:
                start.toISOString(),

              endTime:
                end.toISOString(),

              type,

              reason:
                reasonValue ||
                undefined
            }
          );

        if (
          successBox
        ) {

          successBox.textContent =
            `Appointment booked successfully for ${formatDate(
              appointment.startTime
            )} at ${formatTime(
              appointment.startTime
            )}.`;

          successBox.hidden =
            false;
        }

        form.reset();

        if (
          startInput
        ) {
          startInput.min =
            minimumDateTime;
        }

        if (
          endInput
        ) {
          endInput.min =
            minimumDateTime;
        }

        /**
         * Refresh dashboard after
         * successful booking.
         */

        await refreshDashboardData();

        /**
         * Give the user a moment to see
         * the success message.
         */

        window.setTimeout(
          () => {
            closeModal();
          },
          900
        );

      } catch (
        error
      ) {

        console.error(
          "Appointment booking failed:",
          error
        );

        if (
          errorBox
        ) {

          errorBox.textContent =
            getErrorMessage(
              error,
              "Unable to book the appointment. Please try again."
            );

          errorBox.hidden =
            false;
        }

      } finally {

        if (
          submitButton
        ) {

          submitButton.disabled =
            false;

          submitButton.textContent =
            "Book Appointment";
        }

      }

    }
  );
}
function renderCancelAppointmentModal(
  appointmentId: string
): void {

  const existing =
    document.querySelector(
      "#cancel-appointment-modal"
    );

  if (existing) {
    existing.remove();
  }

  const modal =
    document.createElement("div");

  modal.id =
    "cancel-appointment-modal";

  modal.innerHTML = `
    <div
      class="booking-modal-backdrop"
      data-close-cancel="true"
    >

      <div
        class="booking-modal-card"
        role="dialog"
        aria-modal="true"
      >

        <div class="booking-modal-header">

          <div>

            <p class="eyebrow">
              APPOINTMENT
            </p>

            <h2>
              Cancel appointment
            </h2>

            <p>
              Please provide a reason for cancellation.
            </p>

          </div>

          <button
            id="close-cancel-modal"
            class="modal-close-button"
            type="button"
          >
            ×
          </button>

        </div>

        <form
          id="cancel-appointment-form"
          class="booking-form"
        >

          <div class="form-group">

            <label
              for="cancellation-reason"
            >
              Cancellation reason
            </label>

            <textarea
              id="cancellation-reason"
              name="cancellationReason"
              rows="4"
              maxlength="500"
              minlength="3"
              required
              placeholder="Enter the reason for cancellation"
            ></textarea>

          </div>

          <div
            id="cancel-appointment-error"
            class="form-error"
            hidden
          ></div>

          <div class="booking-form-actions">

            <button
              id="cancel-modal-close-button"
              class="secondary-button"
              type="button"
            >
              Keep Appointment
            </button>

            <button
              id="confirm-cancellation-button"
              class="primary-button"
              type="submit"
            >
              Cancel Appointment
            </button>

          </div>

        </form>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  const closeModal =
    () => {
      modal.remove();
    };

  document
    .querySelector<HTMLButtonElement>(
      "#close-cancel-modal"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .querySelector<HTMLButtonElement>(
      "#cancel-modal-close-button"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .querySelector<HTMLElement>(
      '[data-close-cancel="true"]'
    )
    ?.addEventListener(
      "click",
      (event) => {

        if (
          event.target ===
          event.currentTarget
        ) {
          closeModal();
        }

      }
    );

  const form =
    document.querySelector<HTMLFormElement>(
      "#cancel-appointment-form"
    );

  form?.addEventListener(
    "submit",
    async (
      event
    ) => {

      event.preventDefault();

      const errorBox =
        document.querySelector<HTMLDivElement>(
          "#cancel-appointment-error"
        );

      const submitButton =
        document.querySelector<HTMLButtonElement>(
          "#confirm-cancellation-button"
        );

      const formData =
        new FormData(form);

      const cancellationReason =
        String(
          formData.get(
            "cancellationReason"
          ) ?? ""
        ).trim();

      if (
        cancellationReason.length < 3
      ) {

        if (errorBox) {
          errorBox.textContent =
            "Cancellation reason must be at least 3 characters.";

          errorBox.hidden =
            false;
        }

        return;
      }

      if (submitButton) {
        submitButton.disabled =
          true;

        submitButton.textContent =
          "Cancelling...";
      }

      try {

        await cancelAppointment(
          appointmentId,
          {
            cancellationReason
          }
        );

        closeModal();

        await refreshDashboardData();

        alert(
          "Appointment cancelled successfully."
        );

      } catch (
        error
      ) {

        console.error(
          "Appointment cancellation failed:",
          error
        );

        if (errorBox) {
          errorBox.textContent =
            getErrorMessage(
              error,
              "Unable to cancel appointment."
            );

          errorBox.hidden =
            false;
        }

      } finally {

        if (submitButton) {
          submitButton.disabled =
            false;

          submitButton.textContent =
            "Cancel Appointment";
        }

      }

    }
  );
}
/**
 * ---------------------------------------------------------
 * Follow-up creation modal
 * ---------------------------------------------------------
 */

function renderCreateFollowUpModal(
  appointmentId: string
): void {

  const existing =
    document.querySelector(
      "#create-follow-up-modal"
    );

  if (existing) {
    existing.remove();
  }

  const modal =
    document.createElement("div");

  modal.id =
    "create-follow-up-modal";

  modal.innerHTML = `
    <div
      class="booking-modal-backdrop"
      data-close-follow-up="true"
    >

      <div
        class="booking-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-up-modal-title"
      >

        <div class="booking-modal-header">

          <div>

            <p class="eyebrow">
              FOLLOW-UP
            </p>

            <h2 id="follow-up-modal-title">
              Create follow-up
            </h2>

            <p>
              Schedule a follow-up for this appointment.
            </p>

          </div>

          <button
            id="close-follow-up-modal"
            class="modal-close-button"
            type="button"
            aria-label="Close"
          >
            ×
          </button>

        </div>

        <form
          id="create-follow-up-form"
          class="booking-form"
        >

          <div class="form-group">

            <label
              for="follow-up-scheduled-at"
            >
              Scheduled date and time
            </label>

            <input
              id="follow-up-scheduled-at"
              name="scheduledAt"
              type="datetime-local"
            />

            <small>
              Leave empty if the follow-up date
              will be decided later.
            </small>

          </div>

          <div class="form-group">

            <label
              for="follow-up-instructions"
            >
              Instructions
            </label>

            <textarea
              id="follow-up-instructions"
              name="instructions"
              rows="5"
              maxlength="1000"
              placeholder="Enter follow-up instructions for the patient"
            ></textarea>

          </div>

          <div
            id="follow-up-error"
            class="form-error"
            hidden
          ></div>

          <div
            id="follow-up-success"
            class="form-success"
            hidden
          ></div>

          <div class="booking-form-actions">

            <button
              id="cancel-follow-up"
              class="secondary-button"
              type="button"
            >
              Cancel
            </button>

            <button
              id="submit-follow-up"
              class="primary-button"
              type="submit"
            >
              Create Follow-up
            </button>

          </div>

        </form>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  const closeModal =
    () => {
      modal.remove();
    };

  document
    .querySelector<HTMLButtonElement>(
      "#close-follow-up-modal"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .querySelector<HTMLButtonElement>(
      "#cancel-follow-up"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .querySelector<HTMLElement>(
      '[data-close-follow-up="true"]'
    )
    ?.addEventListener(
      "click",
      (event) => {

        if (
          event.target ===
          event.currentTarget
        ) {
          closeModal();
        }

      }
    );

  const form =
    document.querySelector<HTMLFormElement>(
      "#create-follow-up-form"
    );

  form?.addEventListener(
    "submit",
    async (
      event
    ) => {

      event.preventDefault();

      const scheduledInput =
        document.querySelector<HTMLInputElement>(
          "#follow-up-scheduled-at"
        );

      const instructionsInput =
        document.querySelector<HTMLTextAreaElement>(
          "#follow-up-instructions"
        );

      const errorBox =
        document.querySelector<HTMLElement>(
          "#follow-up-error"
        );

      const successBox =
        document.querySelector<HTMLElement>(
          "#follow-up-success"
        );

      const submitButton =
        document.querySelector<HTMLButtonElement>(
          "#submit-follow-up"
        );

      if (!scheduledInput ||
          !instructionsInput) {
        return;
      }

      const scheduledValue =
        scheduledInput.value.trim();

      const instructionsValue =
        instructionsInput.value.trim();

      if (
        scheduledValue
      ) {

        const scheduledDate =
          new Date(
            scheduledValue
          );

        if (
          Number.isNaN(
            scheduledDate.getTime()
          )
        ) {

          if (errorBox) {
            errorBox.textContent =
              "Please provide a valid follow-up date and time.";

            errorBox.hidden =
              false;
          }

          return;
        }

        if (
          scheduledDate <= new Date()
        ) {

          if (errorBox) {
            errorBox.textContent =
              "Follow-up must be scheduled in the future.";

            errorBox.hidden =
              false;
          }

          return;
        }
      }

      if (
        errorBox
      ) {
        errorBox.hidden =
          true;
      }

      if (
        successBox
      ) {
        successBox.hidden =
          true;
      }

      if (
        submitButton
      ) {
        submitButton.disabled =
          true;

        submitButton.textContent =
          "Creating...";
      }

      try {

        const followUp =
          await createFollowUp(
            appointmentId,
            {
              scheduledAt:
                scheduledValue
                  ? new Date(
                      scheduledValue
                    ).toISOString()
                  : undefined,

              instructions:
                instructionsValue ||
                undefined
            }
          );

        if (
          successBox
        ) {

          successBox.textContent =
            followUp.scheduledAt
              ? `Follow-up scheduled for ${formatDate(
                  followUp.scheduledAt
                )} at ${formatTime(
                  followUp.scheduledAt
                )}.`
              : "Follow-up created successfully.";

          successBox.hidden =
            false;
        }

        await refreshDashboardData();

        const followUpsPage =
          document.querySelector(
            "#full-follow-ups-container"
          );

        if (
          followUpsPage
        ) {
          await loadFollowUpsPage();
        }

        window.setTimeout(
          () => {
            closeModal();
          },
          900
        );

      } catch (
        error
      ) {

        console.error(
          "Follow-up creation failed:",
          error
        );

        if (
          errorBox
        ) {

          errorBox.textContent =
            getErrorMessage(
              error,
              "Unable to create follow-up."
            );

          errorBox.hidden =
            false;
        }

      } finally {

        if (
          submitButton
        ) {

          submitButton.disabled =
            false;

          submitButton.textContent =
            "Create Follow-up";
        }

      }

    }
  );
}
/**
 * ---------------------------------------------------------
 * Render full follow-up list
 * ---------------------------------------------------------
 */

function renderFullFollowUps(
  followUps: FollowUp[],
  appointments: Appointment[],
  
): string {

  if (
    followUps.length === 0
  ) {

    return `
      <div class="empty-state">

        <div class="empty-icon">
          🔄
        </div>

        <h3>
          No follow-ups found
        </h3>

        <p>
          Follow-ups associated with your
          appointments will appear here.
        </p>

      </div>
    `;
  }

  const appointmentMap =
    new Map<string, Appointment>();

  appointments.forEach(
    (appointment) => {
      appointmentMap.set(
        appointment.id,
        appointment
      );
    }
  );

  return `
    <div class="follow-up-list">

      ${followUps
        .map(
          (followUp) => {

            const appointment =
              appointmentMap.get(
                followUp.appointmentId
              );

            

            return `
              <div
                class="follow-up-row"
                data-follow-up-id="${escapeHtml(
                  followUp.id
                )}"
              >

                <div class="follow-up-icon">
                  🔄
                </div>

                <div class="follow-up-info">

                  <strong>
                    Follow-up evaluation
                  </strong>

                  ${
                    appointment
                      ? `
                        <span>
                          Appointment:
                          ${formatDate(
                            appointment.startTime
                          )}
                          ·
                          ${formatTime(
                            appointment.startTime
                          )}
                        </span>
                      `
                      : ""
                  }

                  <span>
                    ${
                      followUp.scheduledAt
                        ? `Scheduled:
                            ${formatDate(
                              followUp.scheduledAt
                            )}
                            ·
                            ${formatTime(
                              followUp.scheduledAt
                            )}`
                        : "Schedule pending"
                    }
                  </span>

                  ${
                    followUp.instructions
                      ? `
                        <p>
                          ${escapeHtml(
                            followUp.instructions
                          )}
                        </p>
                      `
                      : ""
                  }

                  ${
                    followUp.patientNotes
                      ? `
                        <p>
                          <strong>
                            Patient notes:
                          </strong>
                          ${escapeHtml(
                            followUp.patientNotes
                          )}
                        </p>
                      `
                      : ""
                  }

                  ${
                    followUp.doctorNotes
                      ? `
                        <p>
                          <strong>
                            Doctor notes:
                          </strong>
                          ${escapeHtml(
                            followUp.doctorNotes
                          )}
                        </p>
                      `
                      : ""
                  }

                </div>

                <div class="appointment-actions">

                  <span
                    class="status-badge status-${followUp.status.toLowerCase()}"
                  >
                    ${escapeHtml(
                      followUp.status
                    )}
                  </span>

                </div>

              </div>
            `;
          }
        )
        .join("")}

    </div>
  `;
}
async function changeAppointmentStatus(
  appointmentId: string,
  status:
    | "CONFIRMED"
    | "COMPLETED"
    | "NO_SHOW"
): Promise<void> {

  const statusLabel =
    status === "CONFIRMED"
      ? "confirm"
      : status === "COMPLETED"
        ? "complete"
        : "mark as no-show";

  const confirmed =
    window.confirm(
      `Are you sure you want to ${statusLabel} this appointment?`
    );

  if (!confirmed) {
    return;
  }

  try {

    await updateAppointmentStatus(
      appointmentId,
      {
        status
      }
    );

    await refreshDashboardData();

    alert(
      `Appointment status updated to ${status}.`
    );

  } catch (
    error
  ) {

    console.error(
      "Appointment status update failed:",
      error
    );

    alert(
      getErrorMessage(
        error,
        "Unable to update appointment status."
      )
    );

  }
}
function renderPreVisitSummaryModal(
  appointmentId: string
): void {

  const existingModal =
    document.querySelector(
      "#pre-visit-modal"
    );

  if (existingModal) {
    existingModal.remove();
  }

  const modal =
    document.createElement("div");

  modal.id =
    "pre-visit-modal";

  modal.innerHTML = `
    <div
      class="booking-modal-backdrop"
      data-close-pre-visit="true"
    >

      <div
        class="booking-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pre-visit-modal-title"
      >

        <div class="booking-modal-header">

          <div>

            <p class="eyebrow">
              AI PRE-VISIT
            </p>

            <h2 id="pre-visit-modal-title">
              Share your symptoms
            </h2>

            <p>
              Tell us about your symptoms before
              your appointment. This information
              helps prepare the doctor for your visit.
            </p>

          </div>

          <button
            id="close-pre-visit-modal"
            class="modal-close-button"
            type="button"
            aria-label="Close"
          >
            ×
          </button>

        </div>

        <form
          id="pre-visit-form"
          class="booking-form"
        >

          <div class="form-group">

            <label for="pre-visit-symptoms">
              Symptoms
            </label>

            <textarea
              id="pre-visit-symptoms"
              rows="5"
              maxlength="5000"
              required
              placeholder="Describe the symptoms you are experiencing..."
            ></textarea>

          </div>

          <div class="form-group">

            <label for="pre-visit-duration">
              How long have you had these symptoms?
            </label>

            <input
              id="pre-visit-duration"
              type="text"
              maxlength="200"
              placeholder="e.g. 3 days, 2 weeks"
            />

          </div>

          <div class="form-group">

            <label for="pre-visit-details">
              Additional details
            </label>

            <textarea
              id="pre-visit-details"
              rows="4"
              maxlength="5000"
              placeholder="Any additional information the doctor should know..."
            ></textarea>

          </div>

          <div
            id="pre-visit-error"
            class="form-error"
            hidden
          ></div>

          <div class="booking-form-actions">

            <button
              id="cancel-pre-visit"
              class="secondary-button"
              type="button"
            >
              Cancel
            </button>

            <button
              id="submit-pre-visit"
              class="primary-button"
              type="submit"
            >
              Generate AI Summary
            </button>

          </div>

        </form>

        <div
          id="pre-visit-result"
          hidden
        ></div>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  const closeModal =
    () => {
      modal.remove();
    };

  document
    .querySelector<HTMLButtonElement>(
      "#close-pre-visit-modal"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .querySelector<HTMLButtonElement>(
      "#cancel-pre-visit"
    )
    ?.addEventListener(
      "click",
      closeModal
    );

  document
    .querySelector<HTMLElement>(
      '[data-close-pre-visit="true"]'
    )
    ?.addEventListener(
      "click",
      (event) => {

        if (
          event.target ===
          event.currentTarget
        ) {
          closeModal();
        }

      }
    );

  document
    .querySelector<HTMLFormElement>(
      "#pre-visit-form"
    )
    ?.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        const symptoms =
          document
            .querySelector<HTMLTextAreaElement>(
              "#pre-visit-symptoms"
            )
            ?.value
            .trim() ?? "";

        const duration =
          document
            .querySelector<HTMLInputElement>(
              "#pre-visit-duration"
            )
            ?.value
            .trim() ?? "";

        const additionalDetails =
          document
            .querySelector<HTMLTextAreaElement>(
              "#pre-visit-details"
            )
            ?.value
            .trim() ?? "";

        const errorElement =
          document.querySelector<HTMLElement>(
            "#pre-visit-error"
          );

        const submitButton =
          document.querySelector<HTMLButtonElement>(
            "#submit-pre-visit"
          );

        if (!symptoms) {

          if (errorElement) {
            errorElement.textContent =
              "Please describe your symptoms.";
            errorElement.hidden = false;
          }

          return;
        }

        if (errorElement) {
          errorElement.hidden = true;
        }

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent =
            "Generating summary...";
        }

        try {

          const summary =
            await createPreVisitSummary({
              appointmentId,
              symptoms,
              duration:
                duration || undefined,
              additionalDetails:
                additionalDetails ||
                undefined
            });

          const form =
            document.querySelector<HTMLFormElement>(
              "#pre-visit-form"
            );

          const result =
            document.querySelector<HTMLElement>(
              "#pre-visit-result"
            );

          if (form) {
            form.hidden = true;
          }

          if (result) {

            const urgencyClass =
              summary.urgencyLevel.toLowerCase();

            result.innerHTML = `
              <div class="pre-visit-result">

                <div class="card-header">

                  <div>
                    <p class="eyebrow">
                      AI SUMMARY
                    </p>

                    <h3>
                      Pre-Visit Summary
                    </h3>
                  </div>

                  <span
                    class="status-badge status-${urgencyClass}"
                  >
                    ${escapeHtml(
                      summary.urgencyLevel
                    )}
                  </span>

                </div>

                <div class="appointment-info">

                  <strong>
                    Chief Complaint
                  </strong>

                  <p>
                    ${escapeHtml(
                      summary.chiefComplaint
                    )}
                  </p>

                </div>

                <div class="appointment-info">

                  <strong>
                    Suggested Questions
                  </strong>

                  <ol>
                    ${
                      summary
                        .suggestedQuestions
                        .map(
                          (question) => `
                            <li>
                              ${escapeHtml(
                                question
                              )}
                            </li>
                          `
                        )
                        .join("")
                    }
                  </ol>

                </div>

                <p>
                  <small>
                    Generated by:
                    ${escapeHtml(
                      summary.generatedBy
                    )}
                  </small>
                </p>

                <div
                  class="booking-form-actions"
                >

                  <button
                    id="close-pre-visit-result"
                    class="primary-button"
                    type="button"
                  >
                    Done
                  </button>

                </div>

              </div>
            `;

            result.hidden = false;

            document
              .querySelector<HTMLButtonElement>(
                "#close-pre-visit-result"
              )
              ?.addEventListener(
                "click",
                closeModal
              );
          }

        } catch (error) {

          console.error(
            "Pre-visit summary generation failed:",
            error
          );

          if (errorElement) {

            errorElement.textContent =
              getErrorMessage(
                error,
                "Unable to generate the AI summary. Please try again."
              );

            errorElement.hidden = false;
          }

          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
              "Generate AI Summary";
          }
        }

      }
    );
}
function renderExistingPreVisitSummary(
  summary: Awaited<
    ReturnType<typeof getPreVisitSummary>
  >
): void {

  const existingModal =
    document.querySelector(
      "#pre-visit-modal"
    );

  if (existingModal) {
    existingModal.remove();
  }

  const modal =
    document.createElement("div");

  modal.id =
    "pre-visit-modal";

  modal.innerHTML = `
    <div
      class="booking-modal-backdrop"
      data-close-existing-summary="true"
    >

      <div
        class="booking-modal-card"
        role="dialog"
        aria-modal="true"
      >

        <div class="booking-modal-header">

          <div>

            <p class="eyebrow">
              AI PRE-VISIT
            </p>

            <h2>
              Pre-Visit Summary
            </h2>

          </div>

          <button
            id="close-existing-summary"
            class="modal-close-button"
            type="button"
          >
            ×
          </button>

        </div>

        <div class="pre-visit-result">

          <div class="card-header">

            <h3>
              Urgency
            </h3>

            <span
              class="status-badge status-${summary.urgencyLevel.toLowerCase()}"
            >
              ${escapeHtml(
                summary.urgencyLevel
              )}
            </span>

          </div>

          <div class="appointment-info">

            <strong>
              Chief Complaint
            </strong>

            <p>
              ${escapeHtml(
                summary.chiefComplaint
              )}
            </p>

          </div>

          <div class="appointment-info">

            <strong>
              Suggested Questions
            </strong>

            <ol>
              ${
                summary.suggestedQuestions
                  .map(
                    (question) => `
                      <li>
                        ${escapeHtml(
                          question
                        )}
                      </li>
                    `
                  )
                  .join("")
              }
            </ol>

          </div>

          <div class="appointment-info">

            <strong>
              Submitted Symptoms
            </strong>

            <p>
              ${escapeHtml(
                summary.symptoms
              )}
            </p>

          </div>

          <button
            id="close-existing-summary"
            class="primary-button"
            type="button"
          >
            Close
          </button>

        </div>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  const closeModal =
    () => {
      modal.remove();
    };

  document
    .querySelectorAll<HTMLButtonElement>(
      "#close-existing-summary"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          closeModal
        );
      }
    );

  document
    .querySelector<HTMLElement>(
      '[data-close-existing-summary="true"]'
    )
    ?.addEventListener(
      "click",
      (event) => {

        if (
          event.target ===
          event.currentTarget
        ) {
          closeModal();
        }

      }
    );
}
function setupAppointmentActionListeners(): void {

  /*
   * -------------------------------------------------------
   * Cancel appointment
   * -------------------------------------------------------
   */

  document
    .querySelectorAll<HTMLButtonElement>(
      '[data-action="cancel"]'
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const appointmentId =
              button.dataset.appointmentId;

            if (!appointmentId) {
              return;
            }

            renderCancelAppointmentModal(
              appointmentId
            );

          }
        );

      }
    );

  /*
   * -------------------------------------------------------
   * Appointment status actions
   * -------------------------------------------------------
   */

  document
    .querySelectorAll<HTMLButtonElement>(
      '[data-action="status"]'
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const appointmentId =
              button.dataset.appointmentId;

            const status =
              button.dataset.status;

            if (
              !appointmentId ||
              !status
            ) {
              return;
            }

            if (
              status !== "CONFIRMED" &&
              status !== "COMPLETED" &&
              status !== "NO_SHOW"
            ) {
              return;
            }

            void changeAppointmentStatus(
              appointmentId,
              status
            );

          }
        );

      }
    );

  /*
   * -------------------------------------------------------
   * Create follow-up
   * -------------------------------------------------------
   */

  document
    .querySelectorAll<HTMLButtonElement>(
      '[data-action="create-follow-up"]'
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const appointmentId =
              button.dataset.appointmentId;

            if (!appointmentId) {
              return;
            }

            renderCreateFollowUpModal(
              appointmentId
            );

          }
        );

      }
    );
    /*
 * -------------------------------------------------------
 * AI Pre-Visit Summary
 * -------------------------------------------------------
 */

document
  .querySelectorAll<HTMLButtonElement>(
    '[data-action="pre-visit"]'
  )
  .forEach(
    (button) => {

      button.addEventListener(
        "click",
        async () => {

          const appointmentId =
            button.dataset.appointmentId;

          if (!appointmentId) {
            return;
          }

          try {

            const existing =
              await getPreVisitSummary(
                appointmentId
              );

            renderExistingPreVisitSummary(
              existing
            );

          } catch {

            renderPreVisitSummaryModal(
              appointmentId
            );
          }

        }
      );

    }
  );
}

/**
 * ---------------------------------------------------------
 * Error message helper
 * ---------------------------------------------------------
 */

function getErrorMessage(
  error: unknown,
  fallback: string
): string {

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

/**
 * ---------------------------------------------------------
 * Open booking modal
 * ---------------------------------------------------------
 */

async function openBookingModal(): Promise<void> {

  try {

    const doctors =
      await getDoctors();

    renderBookingModal(
      doctors
    );

  } catch (
    error
  ) {

    console.error(
      "Doctor loading failed:",
      error
    );

    alert(
      getErrorMessage(
        error,
        "Unable to load doctors. Please try again."
      )
    );
  }
}
async function showAppointmentsPage(): Promise<void> {

  const container =
    document.querySelector<HTMLElement>(
      "#main-page-content"
    );

  if (!container) {
    return;
  }

  const user =
    getStoredUser();

  if (!user) {
    return;
  }

  container.innerHTML = `
    <div class="page-header">

      <div>

        <p class="eyebrow">
          APPOINTMENTS
        </p>

        <h1>
          Appointment Management
        </h1>

        <p>
          View and manage your healthcare appointments.
        </p>

      </div>

      ${
        user.role === "PATIENT"
          ? `
            <button
              id="appointments-book-button"
              class="primary-button"
              type="button"
            >
              + Book Appointment
            </button>
          `
          : ""
      }

    </div>

    <section class="content-card">

      <div class="card-header">

        <div>

          <h2>
            ${
              user.role === "PATIENT"
                ? "My Appointments"
                : user.role === "DOCTOR"
                  ? "Assigned Appointments"
                  : "All Appointments"
            }
          </h2>

          <p>
            Appointment schedule and status management.
          </p>

        </div>

        <button
          id="refresh-appointments-button"
          class="secondary-button"
          type="button"
        >
          Refresh
        </button>

      </div>

      <div id="full-appointments-container">

        <div class="empty-state compact">
          <p>
            Loading appointments...
          </p>
        </div>

      </div>

    </section>
  `;

  document
    .querySelector<HTMLButtonElement>(
      "#appointments-book-button"
    )
    ?.addEventListener(
      "click",
      () => {
        void openBookingModal();
      }
    );

  document
    .querySelector<HTMLButtonElement>(
      "#refresh-appointments-button"
    )
    ?.addEventListener(
      "click",
      () => {
        void loadAppointmentsPage();
      }
    );

  await loadAppointmentsPage();
}
async function loadAppointmentsPage(): Promise<void> {

  const container =
    document.querySelector<HTMLElement>(
      "#full-appointments-container"
    );

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="empty-state compact">
      <p>
        Loading appointments...
      </p>
    </div>
  `;

  try {

    const appointments =
      await getAppointments();

    container.innerHTML =
      renderAppointments(
        appointments
      );

    setupAppointmentActionListeners();

  } catch (
    error
  ) {

    console.error(
      "Appointments loading failed:",
      error
    );

    container.innerHTML = `
      <div class="empty-state compact">

        <div class="empty-icon">
          ⚠️
        </div>

        <h3>
          Unable to load appointments
        </h3>

        <p>
          ${escapeHtml(
            getErrorMessage(
              error,
              "Please try again."
            )
          )}
        </p>

      </div>
    `;
  }
}
/**
 * ---------------------------------------------------------
 * Follow-ups page
 * ---------------------------------------------------------
 */

async function showFollowUpsPage(): Promise<void> {

  const container =
    document.querySelector<HTMLElement>(
      "#main-page-content"
    );

  if (!container) {
    return;
  }

  const user =
    getStoredUser();

  if (!user) {
    return;
  }

  container.innerHTML = `
    <div class="page-header">

      <div>

        <p class="eyebrow">
          FOLLOW-UPS
        </p>

        <h1>
          Follow-up Management
        </h1>

        <p>
          Review follow-up activities associated
          with your appointments.
        </p>

      </div>

    </div>

    <section class="content-card">

      <div class="card-header">

        <div>

          <h2>
            ${
              user.role === "PATIENT"
                ? "My Follow-ups"
                : user.role === "DOCTOR"
                  ? "Patient Follow-ups"
                  : "All Follow-ups"
            }
          </h2>

          <p>
            Follow-up schedules, instructions,
            and status.
          </p>

        </div>

        <button
          id="refresh-follow-ups-button"
          class="secondary-button"
          type="button"
        >
          Refresh
        </button>

      </div>

      <div
        id="full-follow-ups-container"
      >

        <div class="empty-state compact">
          <p>
            Loading follow-ups...
          </p>
        </div>

      </div>

    </section>
  `;

  document
    .querySelector<HTMLButtonElement>(
      "#refresh-follow-ups-button"
    )
    ?.addEventListener(
      "click",
      () => {
        void loadFollowUpsPage();
      }
    );

  await loadFollowUpsPage();
}
/**
 * ---------------------------------------------------------
 * Load follow-ups page
 * ---------------------------------------------------------
 */

async function loadFollowUpsPage(): Promise<void> {

  const container =
    document.querySelector<HTMLElement>(
      "#full-follow-ups-container"
    );

  if (!container) {
    return;
  }

  const user =
    getStoredUser();

  if (!user) {
    return;
  }

  container.innerHTML = `
    <div class="empty-state compact">
      <p>
        Loading follow-ups...
      </p>
    </div>
  `;

  try {

    const appointments =
      await getAppointments();

    const followUpResults =
      await Promise.all(
        appointments.map(
          async (
            appointment
          ) => {

            try {

              return await getAppointmentFollowUps(
                appointment.id
              );

            } catch (
              error
            ) {

              console.error(
                `Failed to load follow-ups for appointment ${appointment.id}:`,
                error
              );

              return [];
            }

          }
        )
      );

    const followUps =
      followUpResults.flat();

    followUps.sort(
      (a, b) => {

        const dateA =
          a.scheduledAt
            ? new Date(
                a.scheduledAt
              ).getTime()
            : Number.MAX_SAFE_INTEGER;

        const dateB =
          b.scheduledAt
            ? new Date(
                b.scheduledAt
              ).getTime()
            : Number.MAX_SAFE_INTEGER;

        return dateA - dateB;
      }
    );

    container.innerHTML =
      renderFullFollowUps(
        followUps,
        appointments,
        
      );

  } catch (
    error
  ) {

    console.error(
      "Follow-ups loading failed:",
      error
    );

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          ⚠️
        </div>

        <h3>
          Unable to load follow-ups
        </h3>

        <p>
          ${escapeHtml(
            getErrorMessage(
              error,
              "Please check that the backend server is running."
            )
          )}
        </p>

      </div>
    `;
  }
}
 
/****
 * ---------------------------------------------------------
 * Reminders page
 * ---------------------------------------------------------
 */

async function showRemindersPage(): Promise<void> {

  const container =
    document.querySelector<HTMLElement>(
      "#main-page-content"
    );

  if (!container) {
    return;
  }

  const user =
    getStoredUser();

  if (!user) {
    return;
  }

  container.innerHTML = `
    <div class="page-header">

      <div>

        <p class="eyebrow">
          REMINDERS
        </p>

        <h1>
          Reminder Management
        </h1>

        <p>
          View your scheduled healthcare reminders
          and notifications.
        </p>

      </div>

    </div>

    <section class="content-card">

      <div class="card-header">

        <div>

          <h2>
            ${
              user.role === "ADMIN"
                ? "All Reminders"
                : "My Reminders"
            }
          </h2>

          <p>
            Scheduled appointments, follow-ups,
            and other healthcare notifications.
          </p>

        </div>

        <button
          id="refresh-reminders-button"
          class="secondary-button"
          type="button"
        >
          Refresh
        </button>

      </div>

      <div
        id="full-reminders-container"
      >

        <div class="empty-state compact">

          <div class="empty-icon">
            🔔
          </div>

          <p>
            Loading reminders...
          </p>

        </div>

      </div>

    </section>
  `;

  document
    .querySelector<HTMLButtonElement>(
      "#refresh-reminders-button"
    )
    ?.addEventListener(
      "click",
      () => {
        void loadRemindersPage();
      }
    );

  await loadRemindersPage();
}


/****
 * ---------------------------------------------------------
 * Load reminders page
 * ---------------------------------------------------------
 */

async function loadRemindersPage(): Promise<void> {

  const container =
    document.querySelector<HTMLElement>(
      "#full-reminders-container"
    );

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="empty-state compact">

      <div class="empty-icon">
        🔔
      </div>

      <p>
        Loading reminders...
      </p>

    </div>
  `;

  try {

    const reminders =
      await getReminders();

    const sortedReminders =
      [...reminders].sort(
        (a, b) =>
          new Date(
            a.scheduledFor
          ).getTime() -
          new Date(
            b.scheduledFor
          ).getTime()
      );

    container.innerHTML =
      renderFullReminders(
        sortedReminders
      );

  } catch (
    error
  ) {

    console.error(
      "Reminders loading failed:",
      error
    );

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          ⚠️
        </div>

        <h3>
          Unable to load reminders
        </h3>

        <p>
          ${escapeHtml(
            getErrorMessage(
              error,
              "Please check that the backend server is running."
            )
          )}
        </p>

      </div>
    `;
  }
}


/****
 * ---------------------------------------------------------
 * Render full reminders list
 * ---------------------------------------------------------
 */

function renderFullReminders(
  reminders: Reminder[]
): string {

  if (reminders.length === 0) {

    return `
      <div class="empty-state">

        <div class="empty-icon">
          🔔
        </div>

        <h3>
          No reminders found
        </h3>

        <p>
          You currently have no scheduled reminders.
        </p>

      </div>
    `;
  }

  return `
    <div class="reminder-list">

      ${reminders
        .map(
          (reminder) => `

            <div
              class="reminder-row"
              data-reminder-id="${escapeHtml(
                reminder.id
              )}"
            >

              <div class="reminder-icon">
                🔔
              </div>

              <div class="reminder-info">

                <strong>
                  ${escapeHtml(
                    reminder.title
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    reminder.message
                  )}
                </span>

                <span>
                  Type:
                  ${escapeHtml(
                    formatReminderType(
                      reminder.type
                    )
                  )}
                </span>

                <small>
                  Scheduled:
                  ${formatDate(
                    reminder.scheduledFor
                  )}
                  ·
                  ${formatTime(
                    reminder.scheduledFor
                  )}
                </small>

                ${
                  reminder.sentAt
                    ? `
                      <small>
                        Sent:
                        ${formatDate(
                          reminder.sentAt
                        )}
                        ·
                        ${formatTime(
                          reminder.sentAt
                        )}
                      </small>
                    `
                    : ""
                }

              </div>

              <span
                class="status-badge status-${reminder.status.toLowerCase()}"
              >
                ${escapeHtml(
                  reminder.status
                )}
              </span>

            </div>

          `
        )
        .join("")}

    </div>
  `;
}


/****
 * ---------------------------------------------------------
 * Reminder type formatter
 * ---------------------------------------------------------
 */

function formatReminderType(
  type: Reminder["type"]
): string {

  switch (type) {

    case "APPOINTMENT":
      return "Appointment";

    case "FOLLOW_UP":
      return "Follow-up";

    case "MEDICATION":
      return "Medication";

    case "CUSTOM":
      return "Custom";

    default:
      return type;
  }
}
async function showDashboardPage(): Promise<void> {

  await renderDashboard();
}

/**
 * ---------------------------------------------------------
 * Render authenticated dashboard
 * ---------------------------------------------------------
 */

async function renderDashboard(): Promise<void> {

  const user =
    getStoredUser();

  if (!user) {

    renderLogin(
      initializeApplication
    );

    return;
  }

  const app =
    getApp();

  app.innerHTML = `
    <div class="app-shell">

      <header class="topbar">

        <div class="brand">

          <div class="brand-icon">
            🏥
          </div>

          <div>

            <strong>
              CarePoint
            </strong>

            <span>
              Healthcare Manager
            </span>

          </div>

        </div>

        <div class="user-area">

          <div class="user-info">

            <strong>
              ${escapeHtml(
                user.firstName
              )}
              ${escapeHtml(
                user.lastName
              )}
            </strong>

            <span>
              ${escapeHtml(
                user.role
              )}
            </span>

          </div>

          <button
            id="logout-button"
            class="logout-button"
            type="button"
          >
            Logout
          </button>

        </div>

      </header>

      <div class="app-body">

        <aside class="sidebar">

          <nav>

  <button
    class="nav-item active"
    type="button"
    data-nav="dashboard"
  >
    <span>📊</span>
    Dashboard
  </button>

  <button
    class="nav-item"
    type="button"
    data-nav="appointments"
  >
    <span>📅</span>
    Appointments
  </button>

  <button
    class="nav-item"
    type="button"
    data-nav="follow-ups"
  >
    <span>🔄</span>
    Follow-ups
  </button>

  <button
    class="nav-item"
    type="button"
    data-nav="reminders"
  >
    <span>🔔</span>
    Reminders
  </button>

  <button
    class="nav-item"
    type="button"
    data-nav="profile"
  >
    <span>👤</span>
    Profile
  </button>

</nav>

        </aside>

        <main
  id="main-page-content"
  class="main-content"
>

          <div class="page-header">

            <div>

              <p class="eyebrow">
                ${escapeHtml(
                  user.role
                )} PORTAL
              </p>

              <h1>
                Welcome back,
                ${escapeHtml(
                  user.firstName
                )}
              </h1>

              <p>
                Manage your healthcare
                appointments and follow-ups.
              </p>

            </div>

            ${
              user.role === "PATIENT"
                ? `
                  <button
                    id="book-appointment-button"
                    class="primary-button"
                    type="button"
                  >
                    + Book Appointment
                  </button>
                `
                : ""
            }

          </div>

          <section class="stats-grid">

            <div class="stat-card">

              <span class="stat-icon">
                📅
              </span>

              <div>

                <span class="stat-label">
                  Appointments
                </span>

                <strong id="appointment-count">
                  —
                </strong>

              </div>

            </div>

            <div class="stat-card">

              <span class="stat-icon">
                🔄
              </span>

              <div>

                <span class="stat-label">
                  Follow-ups
                </span>

                <strong id="follow-up-count">
                  —
                </strong>

              </div>

            </div>

            <div class="stat-card">

              <span class="stat-icon">
                🔔
              </span>

              <div>

                <span class="stat-label">
                  Reminders
                </span>

                <strong id="reminder-count">
                  —
                </strong>

              </div>

            </div>

            <div class="stat-card">

              <span class="stat-icon">
                ❤️
              </span>

              <div>

                <span class="stat-label">
                  Account
                </span>

                <strong>
                  Active
                </strong>

              </div>

            </div>

          </section>

          <section class="content-card">

            <div class="card-header">

              <div>

                <h2>
                  Upcoming appointments
                </h2>

                <p>
                  Your latest healthcare
                  appointments.
                </p>

              </div>

            </div>

            <div id="appointments-container">

              <div class="empty-state compact">

                <div class="empty-icon">
                  ⏳
                </div>

                <p>
                  Loading appointments...
                </p>

              </div>

            </div>

          </section>

          <div class="dashboard-columns">

            <section class="content-card">

              <div class="card-header">

                <div>

                  <h2>
                    Follow-ups
                  </h2>

                  <p>
                    Recent follow-up activities.
                  </p>

                </div>

              </div>

              <div id="follow-ups-container">

                <div class="empty-state compact">

                  <p>
                    Loading follow-ups...
                  </p>

                </div>

              </div>

            </section>

            <section class="content-card">

              <div class="card-header">

                <div>

                  <h2>
                    Reminders
                  </h2>

                  <p>
                    Your latest notifications.
                  </p>

                </div>

              </div>

              <div id="reminders-container">

                <div class="empty-state compact">

                  <p>
                    Loading reminders...
                  </p>

                </div>

              </div>

            </section>

          </div>

        </main>

      </div>

    </div>
  `;

  /**
   * -------------------------------------------------------
   * Logout
   * -------------------------------------------------------
   */

  document
    .querySelector<HTMLButtonElement>(
      "#logout-button"
    )
    ?.addEventListener(
      "click",
      () => {

        logout();

        initializeApplication();
      }
    );

  /**
   * -------------------------------------------------------
   * Book appointment
   * -------------------------------------------------------
   */

  document
    .querySelector<HTMLButtonElement>(
      "#book-appointment-button"
    )
    ?.addEventListener(
      "click",
      () => {
        void openBookingModal();
      }
    );

  /**
 * -------------------------------------------------------
 * Role-based navigation
 * -------------------------------------------------------
 */

document
  .querySelectorAll<HTMLButtonElement>(
    ".nav-item"
  )
  .forEach(
    (button) => {

      button.addEventListener(
        "click",
        async () => {

          const destination =
            button.dataset.nav;

          /**
           * Update active navigation item.
           */
          document
            .querySelectorAll<HTMLButtonElement>(
              ".nav-item"
            )
            .forEach(
              (item) => {
                item.classList.remove(
                  "active"
                );
              }
            );

          button.classList.add(
            "active"
          );

          /**
           * Dashboard
           */
          if (
            destination ===
            "dashboard"
          ) {

            await showDashboardPage();

            return;
          }

          /**
           * Appointments
           */
          if (
            destination ===
            "appointments"
          ) {

            await showAppointmentsPage();

            return;
          }

          /**
           * Follow-ups
           */
          if (
            destination ===
            "follow-ups"
          ) {

            await showFollowUpsPage();

            return;
          }

          /**
           * Reminders
           */
          if (
            destination ===
            "reminders"
          ) {

            await showRemindersPage();

            return;
          }

          /**
           * Profile
           *
           * Profile page is not part of the
           * current Phase 2D implementation.
           */
          if (
            destination ===
            "profile"
          ) {

            const mainContent =
              document.querySelector<HTMLElement>(
                "#main-page-content"
              );

            if (mainContent) {

              const user =
                getStoredUser();

              if (!user) {
                return;
              }

              mainContent.innerHTML = `
                <div class="page-header">

                  <div>

                    <p class="eyebrow">
                      PROFILE
                    </p>

                    <h1>
                      My Profile
                    </h1>

                    <p>
                      View your account information.
                    </p>

                  </div>

                </div>

                <section class="content-card">

                  <div class="card-header">

                    <div>

                      <h2>
                        Account Information
                      </h2>

                    </div>

                  </div>

                  <div class="profile-details">

                    <div class="detail-row">

                      <span>
                        First Name
                      </span>

                      <strong>
                        ${escapeHtml(
                          user.firstName
                        )}
                      </strong>

                    </div>

                    <div class="detail-row">

                      <span>
                        Last Name
                      </span>

                      <strong>
                        ${escapeHtml(
                          user.lastName
                        )}
                      </strong>

                    </div>

                    <div class="detail-row">

                      <span>
                        Email
                      </span>

                      <strong>
                        ${escapeHtml(
                          user.email
                        )}
                      </strong>

                    </div>

                    <div class="detail-row">

                      <span>
                        Role
                      </span>

                      <strong>
                        ${escapeHtml(
                          user.role
                        )}
                      </strong>

                    </div>

                    ${
                      user.phone
                        ? `
                          <div class="detail-row">

                            <span>
                              Phone
                            </span>

                            <strong>
                              ${escapeHtml(
                                user.phone
                              )}
                            </strong>

                          </div>
                        `
                        : ""
                    }

                  </div>

                </section>
              `;

            }

            return;
          }

        }
      );

    }
  );
  /**
   * -------------------------------------------------------
   * Initial dashboard data load
   * -------------------------------------------------------
   */

  await refreshDashboardData();
}

/**
 * ---------------------------------------------------------
 * Refresh dashboard data
 * ---------------------------------------------------------
 */

async function refreshDashboardData(): Promise<void> {

  try {

    const dashboardData =
      await loadDashboardData();

    const {
      appointments,
      followUps,
      reminders
    } =
      dashboardData;

    /**
     * Appointment count
     */

    const appointmentCount =
      document.querySelector(
        "#appointment-count"
      );

    if (
      appointmentCount
    ) {

      appointmentCount.textContent =
        String(
          appointments.length
        );
    }

    /**
     * Follow-up count
     */

    const followUpCount =
      document.querySelector(
        "#follow-up-count"
      );

    if (
      followUpCount
    ) {

      followUpCount.textContent =
        String(
          followUps.length
        );
    }

    /**
     * Reminder count
     */

    const reminderCount =
      document.querySelector(
        "#reminder-count"
      );

    if (
      reminderCount
    ) {

      reminderCount.textContent =
        String(
          reminders.length
        );
    }

    /**
     * Appointments
     */

    const appointmentsContainer =
      document.querySelector(
        "#appointments-container"
      );

    if (
      appointmentsContainer
    ) {

      appointmentsContainer.innerHTML =
        renderAppointments(
          appointments
        );
        setupAppointmentActionListeners();
    }

    /**
     * Follow-ups
     */

    const followUpsContainer =
      document.querySelector(
        "#follow-ups-container"
      );

    if (
      followUpsContainer
    ) {

      followUpsContainer.innerHTML =
        renderFollowUps(
          followUps
        );
    }

    /**
     * Reminders
     */

    const remindersContainer =
      document.querySelector(
        "#reminders-container"
      );

    if (
      remindersContainer
    ) {

      remindersContainer.innerHTML =
        renderReminders(
          reminders
        );
    }

  } catch (
    error
  ) {

    console.error(
      "Dashboard data loading failed:",
      error
    );

    const errorMessage = `
      <div class="empty-state compact">

        <div class="empty-icon">
          ⚠️
        </div>

        <h3>
          Unable to load dashboard data
        </h3>

        <p>
          Please check that the backend
          server is running and try again.
        </p>

      </div>
    `;

    const appointmentsContainer =
      document.querySelector(
        "#appointments-container"
      );

    if (
      appointmentsContainer
    ) {
      appointmentsContainer.innerHTML =
        errorMessage;
    }

    const followUpsContainer =
      document.querySelector(
        "#follow-ups-container"
      );

    if (
      followUpsContainer
    ) {
      followUpsContainer.innerHTML =
        errorMessage;
    }

    const remindersContainer =
      document.querySelector(
        "#reminders-container"
      );

    if (
      remindersContainer
    ) {
      remindersContainer.innerHTML =
        errorMessage;
    }
  }
}

/**
 * ---------------------------------------------------------
 * Application initialization
 * ---------------------------------------------------------
 */

async function initializeApplication(): Promise<void> {

  if (
    !isAuthenticated()
  ) {

    renderLogin(
      initializeApplication
    );

    return;
  }

  renderLoading();

  try {

    await getCurrentUser();

    await renderDashboard();

  } catch (
    error
  ) {

    console.error(
      "Authentication initialization failed:",
      error
    );

    logout();

    renderLogin(
      initializeApplication
    );
  }
}


/**
 * ---------------------------------------------------------
 * Application entry point
 * ---------------------------------------------------------
 */

initializeApplication();