import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDbPool();
    
    // Attempt a direct quick query with a short timeout
    const [testRows]: any = await db.query("SELECT 1");
    
    // Diagnostic query to see columns of users table
    let userColumns: any[] = [];
    try {
      const [columns]: any = await db.query("DESCRIBE `users`");
      userColumns = columns.map((c: any) => ({ field: c.Field, type: c.Type }));
    } catch (err: any) {
      console.error("Diagnostic DESCRIBE users failed:", err);
    }

    return NextResponse.json({
      success: true,
      status: "online",
      details: "Successfully connected to Aiven MySQL (school_data_collection)",
      user_columns: userColumns
    });
  } catch (error: any) {
    console.error("Database status check failed:", error);
    return NextResponse.json({
      success: true,
      status: "offline",
      details: error.message || "Failed to establish TCP handshake with Aiven MySQL",
      code: error.code || "CONNECTION_TIMEOUT",
      diagnostic: "This is usually caused by an IP Allowlist restriction on Aiven. Please ensure that you have added '0.0.0.0/0' to the 'Allowed IP Addresses' list in your Aiven Console. Google Cloud Run containers use dynamic, changing IPs, which requires this wildcard to connect directly."
    });
  }
}
