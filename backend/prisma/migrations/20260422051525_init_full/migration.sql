/*
  Warnings:

  - A unique constraint covering the columns `[organizationId]` on the table `Config` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,organizationId]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationId` to the `Config` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Department` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- DropIndex
DROP INDEX "Department_name_key";

-- AlterTable
CREATE SEQUENCE config_id_seq;
ALTER TABLE "Config" ADD COLUMN     "organizationId" INTEGER NOT NULL,
ALTER COLUMN "id" SET DEFAULT nextval('config_id_seq');
ALTER SEQUENCE config_id_seq OWNED BY "Config"."id";

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "organizationId" INTEGER,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Config_organizationId_key" ON "Config"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_organizationId_key" ON "Department"("name", "organizationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Config" ADD CONSTRAINT "Config_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
