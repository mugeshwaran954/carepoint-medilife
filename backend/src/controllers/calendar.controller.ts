import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  getGoogleAuthUrl,
  handleGoogleOAuthCallback
} from "../services/calendar.service.js";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

export const getConnectUrl = async (
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

    const url = getGoogleAuthUrl(req.user.userId);
    if (!url) {
      return res.status(400).json({
        success: false,
        message: "Google Calendar OAuth is not configured on the server"
      });
    }

    return res.status(200).json({
      success: true,
      data: { url }
    });
  } catch (error) {
    next(error);
  }
};

export const googleCallbackHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const rawCode = req.query.code;
    const rawState = req.query.state;

    const code = Array.isArray(rawCode) ? String(rawCode[0]) : String(rawCode || "");
    const userId = Array.isArray(rawState) ? String(rawState[0]) : String(rawState || req.user?.userId || "");

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing OAuth authorization code or state"
      });
    }

    await handleGoogleOAuthCallback(userId, code);

    if (req.accepts("html")) {
      return res.redirect(`${env.frontendUrl}?calendar=connected`);
    }

    return res.status(200).json({
      success: true,
      message: "Google Calendar successfully connected"
    });
  } catch (error) {
    if (req.accepts("html")) {
      return res.redirect(`${env.frontendUrl}?calendar=error`);
    }
    next(error);
  }
};

export const getConnectionStatus = async (
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

    const connection = await prisma.calendarConnection.findUnique({
      where: { userId: req.user.userId },
      select: {
        id: true,
        provider: true,
        calendarId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        isConnected: !!connection,
        connection
      }
    });
  } catch (error) {
    next(error);
  }
};
