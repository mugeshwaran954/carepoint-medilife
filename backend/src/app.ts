import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import testRoutes from "./routes/test.routes.js";
import userRoutes from "./routes/user.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
import availabilityRoutes from "./routes/availability.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import followUpRoutes from "./routes/followUp.routes.js";
import reminderRoutes from "./routes/reminder.routes.js";
import preVisitRoutes from "./routes/preVisit.routes.js";
const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Healthcare Appointment Manager API"
  });
});

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/test", testRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/doctors", doctorRoutes);
app.use("/api/v1/doctors", availabilityRoutes);
app.use(
  "/api/v1/appointments",
  appointmentRoutes
);
app.use(
  "/api/v1",
  followUpRoutes
);
app.use(
  "/api/v1/reminders",
  reminderRoutes
);
app.use(
  "/api/v1/pre-visit-summaries",
  preVisitRoutes
);

export default app;