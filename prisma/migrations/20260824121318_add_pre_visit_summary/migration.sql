-- CreateTable
CREATE TABLE "PreVisitSummary" (
    "id" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "symptoms" TEXT NOT NULL,
    "duration" TEXT,
    "additionalDetails" TEXT,
    "urgencyLevel" TEXT NOT NULL,
    "chiefComplaint" TEXT NOT NULL,
    "suggestedQuestions" JSONB NOT NULL,
    "generatedBy" TEXT NOT NULL DEFAULT 'LLM',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PreVisitSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreVisitSummary_appointmentId_key" ON "PreVisitSummary"("appointmentId");

-- CreateIndex
CREATE INDEX "PreVisitSummary_urgencyLevel_idx" ON "PreVisitSummary"("urgencyLevel");

-- CreateIndex
CREATE INDEX "PreVisitSummary_createdAt_idx" ON "PreVisitSummary"("createdAt");

-- AddForeignKey
ALTER TABLE "PreVisitSummary" ADD CONSTRAINT "PreVisitSummary_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
