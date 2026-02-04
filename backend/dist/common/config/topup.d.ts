export declare const TOPUP_PACKAGES: Record<string, any>;
export declare function getTopupPackage(prisma: any, packageId: string): Promise<{
    packageId: any;
    paidPts: number;
    bonusPts: number;
    price: number;
    currency: any;
    active: boolean;
    label: any;
    tags: any;
}>;
export declare function listTopupPackages(prisma: any): Promise<any>;
