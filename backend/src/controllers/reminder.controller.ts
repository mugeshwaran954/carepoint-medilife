import type {
  Response,
  NextFunction
} from "express";

import { z } from "zod";

import type {
  AuthenticatedRequest
} from "../middleware/auth.middleware.js";

import {
  createReminder,
  getRemindersForUser,
  getAllReminders,
  getReminderById,
  userCanAccessReminder
} from "../services/reminder.service.js";

const reminderIdSchema =
  z.string().uuid();

const reminderTypeSchema = z.enum([
  "APPOINTMENT",
  "FOLLOW_UP",
  "MEDICATION",
  "CUSTOM"
]);

const createReminderSchema = z.object({
  appointmentId: z
    .string()
    .uuid()
    .optional(),

  followUpId: z
    .string()
    .uuid()
    .optional(),

  recipientUserId: z
    .string()
    .uuid(),

  type: reminderTypeSchema,

  scheduledFor: z
    .string()
    .datetime({
      offset: true
    }),

  title: z
    .string()
    .trim()
    .min(1)
    .max(200),

  message: z
    .string()
    .trim()
    .min(1)
    .max(1000)
});

const roleSchema = z.enum([
  "PATIENT",
  "DOCTOR",
  "ADMIN"
]);

export const createNewReminder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (
      req.user.role !== "ADMIN" &&
      req.user.role !== "DOCTOR"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors and administrators can create reminders"
      });
    }

    const parsed =
      createReminderSchema.safeParse(
        req.body
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid reminder data",
        errors: parsed.error.flatten()
      });
    }

    const reminder =
      await createReminder({
        appointmentId:
          parsed.data.appointmentId,

        followUpId:
          parsed.data.followUpId,

        recipientUserId:
          parsed.data.recipientUserId,

        type:
          parsed.data.type,

        scheduledFor:
          new Date(
            parsed.data.scheduledFor
          ),

        title:
          parsed.data.title,

        message:
          parsed.data.message
      });

    return res.status(201).json({
      success: true,
      message:
        "Reminder created successfully",
      data: reminder
    });
  } catch (error) {
    next(error);
  }
};

export const getReminders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const roleResult =
      roleSchema.safeParse(
        req.user.role
      );

    if (!roleResult.success) {
      return res.status(403).json({
        success: false,
        message: "Invalid user role"
      });
    }

    const reminders =
      roleResult.data === "ADMIN"
        ? await getAllReminders()
        : await getRemindersForUser(
            req.user.userId
          );

    return res.status(200).json({
      success: true,
      data: reminders
    });
  } catch (error) {
    next(error);
  }
};

export const getReminder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const roleResult =
      roleSchema.safeParse(
        req.user.role
      );

    if (!roleResult.success) {
      return res.status(403).json({
        success: false,
        message: "Invalid user role"
      });
    }

    const reminderIdResult =
      reminderIdSchema.safeParse(
        req.params.id
      );

    if (!reminderIdResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid reminder ID"
      });
    }

    const reminder =
      await getReminderById(
        reminderIdResult.data
      );

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    const allowed =
      userCanAccessReminder(
        reminder,
        req.user.userId,
        roleResult.data
      );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this reminder"
      });
    }

    return res.status(200).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    next(error);
  }
};