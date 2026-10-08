import app from "./app.js";
import { env } from "./config/env.js";
import { startReminderRunner, stopReminderRunner } from "./services/reminderRunner.service.js";

const server = app.listen(env.port, () => {
  console.log(
    `Healthcare Appointment API running on http://localhost:${env.port}`
  );
  startReminderRunner();
});

const shutdown = (signal: string) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  stopReminderRunner();

  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));