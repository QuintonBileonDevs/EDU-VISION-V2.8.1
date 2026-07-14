import { NextRequest, NextResponse } from "next/server";
import { getDbPool, initializeDatabase, detectUsersSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await initializeDatabase();
    const db = getDbPool();
    const schema = await detectUsersSchema();
    const userCol = schema === "legacy" ? "user_id" : "id";
    
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const fromDate = searchParams.get("from_date");
    const toDate = searchParams.get("to_date");
    const action = searchParams.get("action");

    let query = `
      SELECT 
        mh.history_id,
        mh.action,
        COALESCE(mh.performed_by, u.username, 'super_admin') AS triggered_by,
        COALESCE(u.full_name, 'System Super Administrator') AS triggered_by_full_name,
        mh.triggered_by_ip,
        mh.triggered_by_user_agent,
        mh.duration_minutes,
        mh.blocked_attempts,
        mh.admin_logins,
        mh.message_used,
        mh.whitelist_used,
        COALESCE(mh.notes, mh.reason, '') AS notes,
        mh.created_at
      FROM maintenance_history mh
      LEFT JOIN users u ON mh.triggered_by_user_id = u.${userCol}
      WHERE 1=1
    `;
    const params: any[] = [];

    if (fromDate) {
      query += " AND mh.created_at >= ?";
      params.push(fromDate);
    }
    if (toDate) {
      query += " AND mh.created_at <= ?";
      params.push(toDate);
    }
    if (action) {
      query += " AND mh.action = ?";
      params.push(action);
    }

    // Clone query for count
    const countQuery = `SELECT COUNT(*) as count FROM (${query}) as t`;
    
    query += " ORDER BY mh.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [records]: any = await db.query(query, params);
    const [countRows]: any = await db.query(countQuery, params.slice(0, params.length - 2));
    const total = countRows[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: {
          total,
          limit,
          offset
        }
      }
    });

  } catch (error: any) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
