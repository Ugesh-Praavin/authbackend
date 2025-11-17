/*
  Warnings:

  - A unique constraint covering the columns `[sessionHash]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionHash_key" ON "Session"("sessionHash");
