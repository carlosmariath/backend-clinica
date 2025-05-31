-- AlterTable
ALTER TABLE "SubscriptionConsumption" ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "wasRefunded" BOOLEAN NOT NULL DEFAULT false;
