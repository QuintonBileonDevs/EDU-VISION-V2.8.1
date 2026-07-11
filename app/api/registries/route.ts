import { NextRequest, NextResponse } from "next/server";
import { getDbPool, initializeDatabase } from "@/lib/db";

// GET: Fetch records
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // e.g. 'students', 'teachers'

    await initializeDatabase();
    const db = getDbPool();

    let query = "SELECT id, type, school_name, region, record_data, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at FROM `registries`";
    const params: any[] = [];

    if (type) {
      query += " WHERE `type` = ?";
      params.push(type);
    }
    query += " ORDER BY id DESC";

    const [rows]: any = await db.query(query, params);

    // Parse JSON string field from database if needed (mysql2 sometimes parses JSON automatically, sometimes not depending on driver/setup)
    const formatted = rows.map((row: any) => {
      let data = row.record_data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse record_data JSON string:", e);
        }
      }
      return {
        ...row,
        record_data: data
      };
    });

    return NextResponse.json({ success: true, db_status: "online", records: formatted });
  } catch (error: any) {
    console.error("GET registries error:", error);
    return NextResponse.json(
      { 
        error: "Database Connection Failure: " + (error.message || "Unknown error"),
        code: error.code
      },
      { status: 500 }
    );
  }
}

// POST: Add a new record
export async function POST(req: NextRequest) {
  try {
    const { type, school_name, region, record_data } = await req.json();

    if (!type || !school_name || !region || !record_data) {
      return NextResponse.json(
        { error: "Type, school name, region, and record data are required" },
        { status: 400 }
      );
    }

    await initializeDatabase();
    const db = getDbPool();

    const recordDataString = JSON.stringify(record_data);

    const [result]: any = await db.query(
      "INSERT INTO `registries` (`type`, `school_name`, `region`, `record_data`) VALUES (?, ?, ?, ?)",
      [type, school_name, region, recordDataString]
    );

    return NextResponse.json({
      success: true,
      db_status: "online",
      message: "Record created successfully",
      recordId: result.insertId
    });

  } catch (error: any) {
    console.error("POST registries error:", error);
    return NextResponse.json(
      { 
        error: "Database Connection Failure: " + (error.message || "Unknown error"),
        code: error.code
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete a record
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    await initializeDatabase();
    const db = getDbPool();

    await db.query("DELETE FROM `registries` WHERE `id` = ?", [id]);

    return NextResponse.json({
      success: true,
      db_status: "online",
      message: "Record deleted successfully"
    });

  } catch (error: any) {
    console.error("DELETE registries error:", error);
    return NextResponse.json(
      { 
        error: "Database Connection Failure: " + (error.message || "Unknown error"),
        code: error.code
      },
      { status: 500 }
    );
  }
}
