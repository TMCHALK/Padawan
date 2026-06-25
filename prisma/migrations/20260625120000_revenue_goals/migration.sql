-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "annualRevenueGoal" DECIMAL(12,2),
ADD COLUMN     "monthlyRevenueGoal" DECIMAL(12,2),
ADD COLUMN     "quarterlyRevenueGoal" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "wonAt" TIMESTAMP(3);

