-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "amount" DECIMAL(12,2),
ADD COLUMN     "nextAction" TEXT,
ADD COLUMN     "probability" INTEGER;

