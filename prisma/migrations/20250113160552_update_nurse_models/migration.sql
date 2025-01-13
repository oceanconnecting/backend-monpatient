/*
  Warnings:

  - You are about to drop the column `completedAt` on the `NurseServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `feedback` on the `NurseServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `NurseServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `preferredDate` on the `NurseServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `NurseServiceRequest` table. All the data in the column will be lost.
  - You are about to drop the column `urgency` on the `NurseServiceRequest` table. All the data in the column will be lost.
  - Added the required column `scheduledDate` to the `NurseServiceRequest` table without a default value. This is not possible if the table is not empty.
  - Made the column `nurseId` on table `NurseServiceRequest` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `status` on the `NurseServiceRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Nurse" DROP CONSTRAINT "Nurse_userId_fkey";

-- DropForeignKey
ALTER TABLE "NurseServiceRequest" DROP CONSTRAINT "NurseServiceRequest_nurseId_fkey";

-- DropForeignKey
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_userId_fkey";

-- AlterTable
ALTER TABLE "Nurse" ADD COLUMN     "availabilityReason" TEXT,
ALTER COLUMN "availability" SET DEFAULT 'AVAILABLE',
ALTER COLUMN "availability" SET DATA TYPE TEXT,
ALTER COLUMN "rating" DROP NOT NULL,
ALTER COLUMN "rating" DROP DEFAULT;

-- AlterTable
ALTER TABLE "NurseServiceRequest" DROP COLUMN "completedAt",
DROP COLUMN "feedback",
DROP COLUMN "location",
DROP COLUMN "preferredDate",
DROP COLUMN "rating",
DROP COLUMN "urgency",
ADD COLUMN     "scheduledDate" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "nurseId" SET NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "NurseVisit" ADD COLUMN     "vitals" JSONB;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nurse" ADD CONSTRAINT "Nurse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseServiceRequest" ADD CONSTRAINT "NurseServiceRequest_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "Nurse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
