/*
  Warnings:

  - You are about to drop the column `lastMessageAt` on the `ChatRoom` table. All the data in the column will be lost.
  - You are about to drop the column `nurseId` on the `ChatRoom` table. All the data in the column will be lost.
  - You are about to drop the column `read` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `roomId` on the `Message` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[patientId,doctorId]` on the table `ChatRoom` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `status` to the `ChatRoom` table without a default value. This is not possible if the table is not empty.
  - Made the column `doctorId` on table `ChatRoom` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `chatRoomId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ChatRoom" DROP CONSTRAINT "ChatRoom_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "ChatRoom" DROP CONSTRAINT "ChatRoom_nurseId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_roomId_fkey";

-- AlterTable
ALTER TABLE "ChatRoom" DROP COLUMN "lastMessageAt",
DROP COLUMN "nurseId",
ADD COLUMN     "status" TEXT NOT NULL,
ALTER COLUMN "doctorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "read",
DROP COLUMN "roomId",
ADD COLUMN     "chatRoomId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoom_patientId_doctorId_key" ON "ChatRoom"("patientId", "doctorId");

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
