/*
  Warnings:

  - You are about to drop the column `used` on the `RecoveryCode` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RecoveryCode" DROP COLUMN "used",
ADD COLUMN     "usedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RecoveryCode_userId_idx" ON "RecoveryCode"("userId");
