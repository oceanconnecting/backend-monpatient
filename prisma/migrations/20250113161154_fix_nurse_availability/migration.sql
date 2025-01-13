/*
  Warnings:

  - You are about to drop the column `availabilityReason` on the `Nurse` table. All the data in the column will be lost.
  - The `availability` column on the `Nurse` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `scheduledDate` on the `NurseServiceRequest` table. All the data in the column will be lost.
  - The `status` column on the `NurseServiceRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `vitals` on the `NurseVisit` table. All the data in the column will be lost.
  - Made the column `rating` on table `Nurse` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `location` to the `NurseServiceRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preferredDate` to the `NurseServiceRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `urgency` to the `NurseServiceRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Nurse" DROP CONSTRAINT "Nurse_userId_fkey";

-- DropForeignKey
ALTER TABLE "NurseServiceRequest" DROP CONSTRAINT "NurseServiceRequest_nurseId_fkey";

-- DropForeignKey
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_userId_fkey";

-- AlterTable
ALTER TABLE "Nurse" DROP COLUMN "availabilityReason",
DROP COLUMN "availability",
ADD COLUMN     "availability" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "rating" SET NOT NULL,
ALTER COLUMN "rating" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "NurseServiceRequest" DROP COLUMN "scheduledDate",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "preferredDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "urgency" TEXT NOT NULL,
ALTER COLUMN "nurseId" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ServiceStatus" NOT NULL DEFAULT 'REQUESTED';

-- AlterTable
ALTER TABLE "NurseVisit" DROP COLUMN "vitals";

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nurse" ADD CONSTRAINT "Nurse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseServiceRequest" ADD CONSTRAINT "NurseServiceRequest_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "Nurse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
