"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOPUP_PACKAGES = void 0;
exports.getTopupPackage = getTopupPackage;
exports.listTopupPackages = listTopupPackages;
exports.TOPUP_PACKAGES = {
    starter: { packageId: "starter", paidPts: 50, bonusPts: 5, price: 3.99 },
    medium: { packageId: "medium", paidPts: 100, bonusPts: 15, price: 7.99 },
    value: { packageId: "value", paidPts: 200, bonusPts: 40, price: 14.99 },
    mega: { packageId: "mega", paidPts: 500, bonusPts: 120, price: 29.99 },
    premium: { packageId: "premium", paidPts: 300, bonusPts: 60, price: 19.99 },
};
function normalizePackage(input) {
    if (!input) {
        return null;
    }
    return {
        packageId: input.packageId || input.id,
        paidPts: Number(input.paidPts || 0),
        bonusPts: Number(input.bonusPts || 0),
        price: Number(input.price || 0),
        currency: input.currency || "USD",
        active: input.active !== false,
        label: input.label || "",
        tags: Array.isArray(input.tags) ? input.tags : [],
    };
}
async function ensureTopupPackages(prisma) {
    const count = await prisma.topupPackage.count();
    if (count > 0) {
        return;
    }
    const values = Object.values(exports.TOPUP_PACKAGES).map((item) => ({
        id: item.packageId,
        paidPts: item.paidPts,
        bonusPts: item.bonusPts,
        price: item.price,
        currency: "USD",
        active: true,
        label: "",
        tags: [],
    }));
    await prisma.topupPackage.createMany({ data: values, skipDuplicates: true });
}
async function getTopupPackage(prisma, packageId) {
    if (!packageId || !prisma) {
        return null;
    }
    await ensureTopupPackages(prisma);
    const found = await prisma.topupPackage.findUnique({ where: { id: packageId } });
    if (found) {
        return normalizePackage(found);
    }
    return normalizePackage(exports.TOPUP_PACKAGES[String(packageId)]);
}
async function listTopupPackages(prisma) {
    if (!prisma) {
        return Object.values(exports.TOPUP_PACKAGES).map(normalizePackage);
    }
    await ensureTopupPackages(prisma);
    const rows = await prisma.topupPackage.findMany({
        orderBy: { price: "asc" },
    });
    if (rows.length > 0) {
        return rows.map(normalizePackage);
    }
    return Object.values(exports.TOPUP_PACKAGES).map(normalizePackage);
}
