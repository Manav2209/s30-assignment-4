/*
  Warnings:

  - Added the required column `dayOfWeek` to the `Availabilty` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Availabilty" ADD COLUMN     "dayOfWeek" TEXT NOT NULL;
