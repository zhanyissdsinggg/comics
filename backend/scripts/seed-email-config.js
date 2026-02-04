const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.emailConfig.upsert({
    where: { key: "default" },
    update: { payload: {} },
    create: { key: "default", payload: {} },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
