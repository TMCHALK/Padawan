-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('QUALIFIED', 'QUOTING', 'PROPOSED', 'WON', 'LOST', 'CIRCLE_BACK');

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "stage" "PipelineStage" NOT NULL DEFAULT 'QUALIFIED',
    "counterpartyEmailEnc" TEXT,
    "counterpartyEmailHash" TEXT,
    "gmailThreadId" TEXT,
    "lastActivityAt" TIMESTAMP(3),
    "lastSignal" TEXT,
    "suggestedStage" "PipelineStage",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deal_organizationId_idx" ON "Deal"("organizationId");

-- CreateIndex
CREATE INDEX "Deal_organizationId_stage_idx" ON "Deal"("organizationId", "stage");

-- CreateIndex
CREATE INDEX "Deal_counterpartyEmailHash_idx" ON "Deal"("counterpartyEmailHash");

-- CreateIndex
CREATE INDEX "Deal_gmailThreadId_idx" ON "Deal"("gmailThreadId");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

