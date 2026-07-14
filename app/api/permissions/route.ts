import { NextResponse } from "next/server";
import { getDbPool, initializeDatabase } from "@/lib/db";

export async function GET() {
  try {
    await initializeDatabase();
    const db = getDbPool();
    const [rows]: any = await db.query(
      "SELECT permission_id, permission_name, permission_description FROM `permissions` WHERE deleted_at IS NULL ORDER BY permission_name"
    );
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("GET permissions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
