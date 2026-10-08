import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
}

/**
 * Generate Google OAuth2 consent URL.
 */
export function getGoogleAuthUrl(userId: string): string | null {
  if (!env.googleClientId) {
    return null;
  }

  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email"
  ];

  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: userId
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange OAuth authorization code for access & refresh tokens and save connection.
 */
export async function handleGoogleOAuthCallback(userId: string, code: string) {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new Error("Google OAuth client credentials not configured");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: env.googleRedirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to exchange Google OAuth code: ${errText}`);
  }

  const tokenData = await tokenRes.json() as any;
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || "";
  const expiresIn = tokenData.expires_in || 3600;
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

  const connection = await prisma.calendarConnection.upsert({
    where: { userId },
    create: {
      userId,
      provider: "GOOGLE",
      accessToken,
      refreshToken,
      tokenExpiresAt,
      calendarId: "primary"
    },
    update: {
      provider: "GOOGLE",
      accessToken,
      ...(refreshToken ? { refreshToken } : {}),
      tokenExpiresAt
    }
  });

  return connection;
}

/**
 * Refresh access token using refreshToken if expired.
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const connection = await prisma.calendarConnection.findUnique({
    where: { userId }
  });

  if (!connection || !connection.accessToken) {
    return null;
  }

  // Check if token is still valid (buffer of 5 mins)
  if (connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return connection.accessToken;
  }

  // Attempt refresh if refresh token exists
  if (connection.refreshToken && env.googleClientId && env.googleClientSecret) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: connection.refreshToken,
          client_id: env.googleClientId,
          client_secret: env.googleClientSecret,
          grant_type: "refresh_token"
        })
      });

      if (res.ok) {
        const data = await res.json() as any;
        const newAccessToken = data.access_token;
        const expiresIn = data.expires_in || 3600;
        const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

        await prisma.calendarConnection.update({
          where: { userId },
          data: {
            accessToken: newAccessToken,
            tokenExpiresAt: newExpiresAt
          }
        });

        return newAccessToken;
      }
    } catch (err) {
      console.warn("Failed to refresh Google OAuth token:", err);
    }
  }

  return connection.accessToken;
}

/**
 * Safely create Google Calendar event for user.
 * Logs and returns null if unconfigured or API fails.
 */
export async function createCalendarEvent(userId: string, details: CalendarEventInput): Promise<string | null> {
  try {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      console.log(`[GOOGLE CALENDAR SYNC SKIPPED] User ${userId} has no connected Google Calendar.`);
      return null;
    }

    const eventBody = {
      summary: details.summary,
      description: details.description || "",
      start: { dateTime: details.startTime.toISOString() },
      end: { dateTime: details.endTime.toISOString() }
    };

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(eventBody)
    });

    if (!res.ok) {
      console.warn(`[GOOGLE CALENDAR API ERROR] Status: ${res.status}`);
      return null;
    }

    const data = await res.json() as any;
    console.log(`[GOOGLE CALENDAR EVENT CREATED] Event ID: ${data.id}`);
    return data.id || null;
  } catch (err) {
    console.warn("[GOOGLE CALENDAR EVENT CREATION FAILED]", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Safely update Google Calendar event.
 */
export async function updateCalendarEvent(userId: string, googleEventId: string, details: CalendarEventInput): Promise<boolean> {
  try {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken || !googleEventId) return false;

    const eventBody = {
      summary: details.summary,
      description: details.description || "",
      start: { dateTime: details.startTime.toISOString() },
      end: { dateTime: details.endTime.toISOString() }
    };

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(eventBody)
    });

    return res.ok;
  } catch (err) {
    console.warn("[GOOGLE CALENDAR EVENT UPDATE FAILED]", err);
    return false;
  }
}

/**
 * Safely delete Google Calendar event.
 */
export async function deleteCalendarEvent(userId: string, googleEventId: string): Promise<boolean> {
  try {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken || !googleEventId) return false;

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    return res.ok || res.status === 404;
  } catch (err) {
    console.warn("[GOOGLE CALENDAR EVENT DELETE FAILED]", err);
    return false;
  }
}
