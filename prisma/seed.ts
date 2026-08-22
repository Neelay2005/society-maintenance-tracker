import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@society.com";
  const hashedPassword = await bcrypt.hash("Admin@123456", 10);

  // Seed Admin user
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
    },
    create: {
      name: "Society Admin",
      email: adminEmail,
      password: hashedPassword,
      role: Role.ADMIN,
      unitNumber: "ADMIN-01",
      phone: "+1234567890",
    },
  });

  console.log(`Seeded admin user: ${admin.email} (ID: ${admin.id})`);

  // Seed default settings
  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    const settings = await prisma.settings.create({
      data: {
        overdueThresholdDays: 3,
        updatedById: admin.id,
      },
    });
    console.log(`Seeded default settings (Overdue threshold: ${settings.overdueThresholdDays} days)`);
  } else {
    console.log("Settings record already exists.");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error during seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
