import { NextRequest, NextResponse } from "next/server";
import { getDbPool, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await initializeDatabase();
    const db = getDbPool();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search") || "";

    if (category) {
      // Get all items in a single category
      let query = "SELECT * FROM reference_data WHERE category = ? AND deleted_at IS NULL";
      const params: any[] = [category];

      if (search) {
        query += " AND (value LIKE ? OR code LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }
      query += " ORDER BY sort_order ASC, value ASC";
      
      const [rows]: any = await db.query(query, params);
      return NextResponse.json({ success: true, data: rows });
    } else {
      // Get summary counts of all categories
      const [rows]: any = await db.query(`
        SELECT category, COUNT(*) as count 
        FROM reference_data 
        WHERE deleted_at IS NULL 
        GROUP BY category 
        ORDER BY category ASC
      `);
      
      // Also fetch a quick lookup map of ID to Value for parent references
      const [allItems]: any = await db.query(`
        SELECT ref_id, category, code, value, parent_ref_id, sort_order, is_active 
        FROM reference_data 
        WHERE deleted_at IS NULL
        ORDER BY category ASC, sort_order ASC, value ASC
      `);

      return NextResponse.json({ 
        success: true, 
        categories: rows,
        allItems: allItems
      });
    }
  } catch (error: any) {
    console.error("Reference Data GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDbPool();
    const body = await req.json();
    const { category, code, value, parent_ref_id, sort_order, is_active } = body;

    if (!category || !code || !value) {
      return NextResponse.json({ success: false, error: "Category, code, and value are required" }, { status: 400 });
    }

    const [result]: any = await db.query(
      `INSERT INTO reference_data (category, code, value, parent_ref_id, sort_order, is_active) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        category.trim(),
        code.trim(),
        value.trim(),
        parent_ref_id ? parseInt(parent_ref_id, 10) : null,
        sort_order ? parseInt(sort_order, 10) : 0,
        is_active === false ? 0 : 1
      ]
    );

    // Audit log
    await db.query(
      "INSERT INTO audit_log (username, action, details, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)",
      ["super_admin", "REFERENCE_DATA_CREATE", `Created reference data item '${value}' in category '${category}'`, "REFERENCE_DATA", result.insertId.toString()]
    );

    return NextResponse.json({ success: true, insertId: result.insertId });
  } catch (error: any) {
    console.error("Reference Data POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDbPool();
    const body = await req.json();
    const { ref_id, category, code, value, parent_ref_id, sort_order, is_active } = body;

    if (!ref_id || !category || !code || !value) {
      return NextResponse.json({ success: false, error: "ref_id, category, code, and value are required" }, { status: 400 });
    }

    await db.query(
      `UPDATE reference_data 
       SET category = ?, code = ?, value = ?, parent_ref_id = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE ref_id = ?`,
      [
        category.trim(),
        code.trim(),
        value.trim(),
        parent_ref_id ? parseInt(parent_ref_id, 10) : null,
        sort_order ? parseInt(sort_order, 10) : 0,
        is_active === false ? 0 : 1,
        parseInt(ref_id, 10)
      ]
    );

    // Audit log
    await db.query(
      "INSERT INTO audit_log (username, action, details, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)",
      ["super_admin", "REFERENCE_DATA_UPDATE", `Updated reference data item '${value}' (ID: ${ref_id}) in category '${category}'`, "REFERENCE_DATA", ref_id.toString()]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reference Data PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDbPool();
    const { searchParams } = new URL(req.url);
    const ref_id = searchParams.get("ref_id");

    if (!ref_id) {
      return NextResponse.json({ success: false, error: "ref_id parameter is required" }, { status: 400 });
    }

    // Get item value for logging before deletion
    const [existing]: any = await db.query("SELECT category, value FROM reference_data WHERE ref_id = ?", [ref_id]);
    const item = existing[0];

    await db.query("UPDATE reference_data SET deleted_at = CURRENT_TIMESTAMP WHERE ref_id = ?", [ref_id]);

    if (item) {
      await db.query(
        "INSERT INTO audit_log (username, action, details, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)",
        ["super_admin", "REFERENCE_DATA_DELETE", `Soft-deleted reference data item '${item.value}' (ID: ${ref_id}) from category '${item.category}'`, "REFERENCE_DATA", ref_id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reference Data DELETE Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
