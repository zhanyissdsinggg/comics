const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function run() {
  const cutoffMin = Number(process.env.COMPENSATE_CUTOFF_MIN || 30);
  const dryRun = process.env.DRY_RUN === "1";
  const cutoff = new Date(Date.now() - cutoffMin * 60 * 1000);

  const pendingOrders = await prisma.order.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
  });

  const authorizedPayments = await prisma.paymentIntent.findMany({
    where: { status: "AUTHORIZED", createdAt: { lt: cutoff } },
  });

  const paidOrders = await prisma.order.findMany({
    where: { status: "PAID" },
  });

  const paidOrderIds = new Set(paidOrders.map((order) => order.id));
  const updates = {
    pendingOrders: pendingOrders.length,
    authorizedPayments: authorizedPayments.length,
    markedFailedOrders: 0,
    markedFailedPayments: 0,
    markedCapturedPayments: 0,
  };

  if (!dryRun) {
    for (const order of pendingOrders) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      });
      updates.markedFailedOrders += 1;
    }
    for (const payment of authorizedPayments) {
      const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
      if (!order || order.status === "FAILED" || order.status === "PENDING") {
        await prisma.paymentIntent.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
        updates.markedFailedPayments += 1;
      }
    }
    for (const payment of authorizedPayments) {
      if (paidOrderIds.has(payment.orderId)) {
        await prisma.paymentIntent.update({
          where: { id: payment.id },
          data: { status: "CAPTURED" },
        });
        updates.markedCapturedPayments += 1;
      }
    }
  }

  console.log("[compensate] cutoffMin=", cutoffMin, "dryRun=", dryRun);
  console.log("[compensate]", updates);
}

run()
  .catch((err) => {
    console.error("[compensate] failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
