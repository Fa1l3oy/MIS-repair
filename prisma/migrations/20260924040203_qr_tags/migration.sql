-- AlterTable
ALTER TABLE "RepairRequest" ADD COLUMN     "qrTagId" TEXT;

-- CreateTable
CREATE TABLE "QrTag" (
    "id" TEXT NOT NULL,
    "equipment" TEXT,
    "assetNumber" TEXT,
    "floor" TEXT,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "buildingId" TEXT NOT NULL,
    "categoryId" TEXT,

    CONSTRAINT "QrTag_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QrTag" ADD CONSTRAINT "QrTag_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrTag" ADD CONSTRAINT "QrTag_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRequest" ADD CONSTRAINT "RepairRequest_qrTagId_fkey" FOREIGN KEY ("qrTagId") REFERENCES "QrTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
