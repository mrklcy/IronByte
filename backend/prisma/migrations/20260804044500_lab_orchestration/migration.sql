ALTER TABLE "Lab" ADD COLUMN "dockerImage" TEXT;
ALTER TABLE "Lab" ADD COLUMN "servicePort" INTEGER NOT NULL DEFAULT 80;

ALTER TABLE "LabAttempt" ADD COLUMN "accessUrl" TEXT;
ALTER TABLE "LabAttempt" ADD COLUMN "provider" TEXT;
ALTER TABLE "LabAttempt" ADD COLUMN "providerInstanceId" TEXT;
ALTER TABLE "LabAttempt" ADD COLUMN "targetMetadata" JSONB;

CREATE INDEX "LabAttempt_providerInstanceId_idx" ON "LabAttempt"("providerInstanceId");
