import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_TICKETS = [
  {
    id: "t1",
    subject: "Points missing after purchase",
    message: "I bought a package but did not receive POINTS.",
    status: "OPEN",
    userId: "user_001",
  },
  {
    id: "t2",
    subject: "Refund status",
    message: "Please confirm refund status for order #A10023.",
    status: "PENDING",
    userId: "user_023",
  },
];

export async function GET() {
  return NextResponse.json({ tickets: DEFAULT_TICKETS });
}
