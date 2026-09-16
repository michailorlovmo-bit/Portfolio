import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const name = process.env.SEED_MANAGER_NAME || "Admin";
  const email = process.env.SEED_MANAGER_EMAIL || "admin@example.com";
  const password = process.env.SEED_MANAGER_PASSWORD || "change-me-now";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Manager account already exists for ${email}, skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "MANAGER", canViewStats: true },
  });

  console.log(`Created manager account: ${user.email} (password: ${password})`);
  console.log("Log in and change this password from the account page.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
