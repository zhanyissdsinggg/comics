const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.regionConfig.upsert({
    where: { key: "default" },
    update: {},
    create: {
      key: "default",
      payload: {
        countryCodes: [
          { code: "+1", label: "US" },
          { code: "+82", label: "KR" },
          { code: "+86", label: "CN" },
          { code: "+81", label: "JP" },
          { code: "+65", label: "SG" },
        ],
        lengthRules: {
          "+1": [10],
          "+82": [9, 10, 11],
          "+86": [11],
          "+81": [9, 10, 11],
          "+65": [8],
        },
      },
    },
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
