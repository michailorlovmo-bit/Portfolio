-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "totalFloors" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "telekomApprovedAt" DATETIME,
    "telekomApprovedById" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    CONSTRAINT "Building_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Building_telekomApprovedById_fkey" FOREIGN KEY ("telekomApprovedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Building" ("address", "createdAt", "createdById", "id", "name", "telekomApprovedAt", "telekomApprovedById", "totalFloors") SELECT "address", "createdAt", "createdById", "id", "name", "telekomApprovedAt", "telekomApprovedById", "totalFloors" FROM "Building";
DROP TABLE "Building";
ALTER TABLE "new_Building" RENAME TO "Building";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
