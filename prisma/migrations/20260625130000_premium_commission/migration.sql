-- Rename the generic deal value to the premium it always represented, and add the
-- broker commission rate. Revenue (premium × commissionRate%) is derived in the app.
ALTER TABLE "Deal" RENAME COLUMN "amount" TO "premium";
ALTER TABLE "Deal" ADD COLUMN "commissionRate" DECIMAL(5,2);
