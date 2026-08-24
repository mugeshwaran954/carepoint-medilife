import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../backend/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in the environment.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Starting database seed...");

  const passwordHash = await bcrypt.hash("Password@123", 12);

  // --------------------------------------------------
  // ADMIN
  // --------------------------------------------------

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@healthcare.local"
    },
    update: {},
    create: {
      email: "admin@healthcare.local",
      passwordHash,
      firstName: "System",
      lastName: "Administrator",
      phone: "+910000000001",
      role: "ADMIN",
      status: "ACTIVE"
    }
  });

  // --------------------------------------------------
  // DOCTORS
  // --------------------------------------------------

  const doctorUser1 = await prisma.user.upsert({
    where: {
      email: "doctor1@healthcare.local"
    },
    update: {},
    create: {
      email: "doctor1@healthcare.local",
      passwordHash,
      firstName: "Arun",
      lastName: "Kumar",
      phone: "+910000000002",
      role: "DOCTOR",
      status: "ACTIVE"
    }
  });

  const doctorUser2 = await prisma.user.upsert({
    where: {
      email: "doctor2@healthcare.local"
    },
    update: {},
    create: {
      email: "doctor2@healthcare.local",
      passwordHash,
      firstName: "Priya",
      lastName: "Sharma",
      phone: "+910000000003",
      role: "DOCTOR",
      status: "ACTIVE"
    }
  });

  const doctor1 = await prisma.doctorProfile.upsert({
    where: {
      userId: doctorUser1.id
    },
    update: {},
    create: {
      userId: doctorUser1.id,
      specialization: "General Medicine",
      licenseNumber: "MED-DEMO-001",
      qualification: "MBBS, MD",
      experienceYears: 8,
      consultationFee: 500,
      bio: "General physician specializing in preventive and primary healthcare."
    }
  });

  const doctor2 = await prisma.doctorProfile.upsert({
    where: {
      userId: doctorUser2.id
    },
    update: {},
    create: {
      userId: doctorUser2.id,
      specialization: "Cardiology",
      licenseNumber: "MED-DEMO-002",
      qualification: "MBBS, MD, DM",
      experienceYears: 12,
      consultationFee: 800,
      bio: "Cardiologist specializing in cardiovascular health and preventive care."
    }
  });

  // --------------------------------------------------
  // PATIENTS
  // --------------------------------------------------

  const patientUser1 = await prisma.user.upsert({
    where: {
      email: "patient1@healthcare.local"
    },
    update: {},
    create: {
      email: "patient1@healthcare.local",
      passwordHash,
      firstName: "Rahul",
      lastName: "Menon",
      phone: "+910000000004",
      role: "PATIENT",
      status: "ACTIVE"
    }
  });

  const patientUser2 = await prisma.user.upsert({
    where: {
      email: "patient2@healthcare.local"
    },
    update: {},
    create: {
      email: "patient2@healthcare.local",
      passwordHash,
      firstName: "Ananya",
      lastName: "Rao",
      phone: "+910000000005",
      role: "PATIENT",
      status: "ACTIVE"
    }
  });

  const patientUser3 = await prisma.user.upsert({
    where: {
      email: "patient3@healthcare.local"
    },
    update: {},
    create: {
      email: "patient3@healthcare.local",
      passwordHash,
      firstName: "Vikram",
      lastName: "Das",
      phone: "+910000000006",
      role: "PATIENT",
      status: "ACTIVE"
    }
  });

  const patient1 = await prisma.patientProfile.upsert({
    where: {
      userId: patientUser1.id
    },
    update: {},
    create: {
      userId: patientUser1.id,
      dateOfBirth: new Date("2002-05-15"),
      gender: "MALE",
      bloodGroup: "O+",
      emergencyContactName: "Meera Menon",
      emergencyContactPhone: "+910000000007",
      address: "Chennai, Tamil Nadu"
    }
  });

  const patient2 = await prisma.patientProfile.upsert({
    where: {
      userId: patientUser2.id
    },
    update: {},
    create: {
      userId: patientUser2.id,
      dateOfBirth: new Date("2001-09-21"),
      gender: "FEMALE",
      bloodGroup: "A+",
      emergencyContactName: "Raj Rao",
      emergencyContactPhone: "+910000000008",
      address: "Bengaluru, Karnataka"
    }
  });

  const patient3 = await prisma.patientProfile.upsert({
    where: {
      userId: patientUser3.id
    },
    update: {},
    create: {
      userId: patientUser3.id,
      dateOfBirth: new Date("1999-12-03"),
      gender: "MALE",
      bloodGroup: "B+",
      emergencyContactName: "Sita Das",
      emergencyContactPhone: "+910000000009",
      address: "Hyderabad, Telangana"
    }
  });

  // --------------------------------------------------
  // DOCTOR AVAILABILITY
  // --------------------------------------------------

  const availability = [
    {
      doctorId: doctor1.id,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "13:00"
    },
    {
      doctorId: doctor1.id,
      dayOfWeek: 3,
      startTime: "09:00",
      endTime: "13:00"
    },
    {
      doctorId: doctor1.id,
      dayOfWeek: 5,
      startTime: "09:00",
      endTime: "13:00"
    },
    {
      doctorId: doctor2.id,
      dayOfWeek: 2,
      startTime: "14:00",
      endTime: "18:00"
    },
    {
      doctorId: doctor2.id,
      dayOfWeek: 4,
      startTime: "14:00",
      endTime: "18:00"
    },
    {
      doctorId: doctor2.id,
      dayOfWeek: 6,
      startTime: "10:00",
      endTime: "14:00"
    }
  ];

  for (const slot of availability) {
    await prisma.doctorAvailability.upsert({
      where: {
        doctorId_dayOfWeek_startTime_endTime: {
          doctorId: slot.doctorId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime
        }
      },
      update: {
        isActive: true
      },
      create: {
        ...slot,
        isActive: true
      }
    });
  }

  // --------------------------------------------------
  // SAMPLE APPOINTMENTS
  // --------------------------------------------------

  const appointmentDate = new Date();
  appointmentDate.setDate(appointmentDate.getDate() + 2);
  appointmentDate.setHours(10, 0, 0, 0);

  const appointment1 = await prisma.appointment.upsert({
    where: {
      doctorId_startTime: {
        doctorId: doctor1.id,
        startTime: appointmentDate
      }
    },
    update: {},
    create: {
      patientId: patient1.id,
      doctorId: doctor1.id,
      createdById: patientUser1.id,
      startTime: appointmentDate,
      endTime: new Date(appointmentDate.getTime() + 30 * 60 * 1000),
      type: "CONSULTATION",
      status: "CONFIRMED",
      reason: "Routine health consultation",
      notes: "Initial consultation."
    }
  });

  const appointmentDate2 = new Date();
  appointmentDate2.setDate(appointmentDate2.getDate() + 3);
  appointmentDate2.setHours(15, 0, 0, 0);

  const appointment2 = await prisma.appointment.upsert({
    where: {
      doctorId_startTime: {
        doctorId: doctor2.id,
        startTime: appointmentDate2
      }
    },
    update: {},
    create: {
      patientId: patient2.id,
      doctorId: doctor2.id,
      createdById: patientUser2.id,
      startTime: appointmentDate2,
      endTime: new Date(appointmentDate2.getTime() + 30 * 60 * 1000),
      type: "CONSULTATION",
      status: "SCHEDULED",
      reason: "Cardiology consultation"
    }
  });

    // --------------------------------------------------
  // FOLLOW-UP
  // --------------------------------------------------

  let followUp = await prisma.followUp.findFirst({
    where: {
      appointmentId: appointment1.id
    }
  });

  if (!followUp) {
    followUp = await prisma.followUp.create({
      data: {
        appointmentId: appointment1.id,
        scheduledAt: new Date(
          appointmentDate.getTime() +
            14 * 24 * 60 * 60 * 1000
        ),
        status: "PENDING",
        instructions:
          "Follow up after two weeks.",
        doctorNotes:
          "Review symptoms and progress."
      }
    });
  }

  // --------------------------------------------------
  // REMINDERS
  // --------------------------------------------------

  const appointmentReminder =
    await prisma.reminder.findFirst({
      where: {
        appointmentId: appointment1.id,
        recipientUserId: patientUser1.id,
        type: "APPOINTMENT"
      }
    });

  if (!appointmentReminder) {
    await prisma.reminder.create({
      data: {
        appointmentId: appointment1.id,
        recipientUserId: patientUser1.id,
        type: "APPOINTMENT",
        status: "PENDING",
        scheduledFor: new Date(
          appointmentDate.getTime() -
            24 * 60 * 60 * 1000
        ),
        title: "Upcoming appointment",
        message:
          "You have an upcoming appointment with Dr. Arun Kumar."
      }
    });
  }

  const followUpReminder =
    await prisma.reminder.findFirst({
      where: {
        followUpId: followUp.id,
        recipientUserId: patientUser1.id,
        type: "FOLLOW_UP"
      }
    });

  if (!followUpReminder) {
    await prisma.reminder.create({
      data: {
        followUpId: followUp.id,
        recipientUserId: patientUser1.id,
        type: "FOLLOW_UP",
        status: "PENDING",
        scheduledFor:
          followUp.scheduledAt ??
          new Date(
            appointmentDate.getTime() +
              14 * 24 * 60 * 60 * 1000
          ),
        title: "Follow-up reminder",
        message:
          "You have a scheduled follow-up. Please review your doctor's instructions."
      }
    });
  }

  // --------------------------------------------------
  // AUDIT LOG
  // --------------------------------------------------

  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: "SEED_DATA_CREATED",
      entityType: "SYSTEM",
      metadata: {
        source: "development-seed"
      }
    }
  });

  console.log("Database seed completed successfully.");
  console.log("");
  console.log("Development accounts:");
  console.log("Admin:   admin@healthcare.local");
  console.log("Doctor:  doctor1@healthcare.local");
  console.log("Doctor:  doctor2@healthcare.local");
  console.log("Patient: patient1@healthcare.local");
  console.log("Patient: patient2@healthcare.local");
  console.log("Patient: patient3@healthcare.local");
  console.log("");
  console.log("Password for all accounts: Password@123");
}

main()
  .catch((error) => {
    console.error("Database seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });