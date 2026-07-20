import { NextRequest, NextResponse } from "next/server";
import { getDbPool, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await initializeDatabase();
    const db = getDbPool();

    const [years]: any = await db.query(
      "SELECT * FROM academic_years WHERE deleted_at IS NULL ORDER BY year DESC"
    );

    const [terms]: any = await db.query(
      "SELECT t.*, y.year as academic_year FROM academic_terms t JOIN academic_years y ON t.year_id = y.year_id WHERE t.deleted_at IS NULL AND y.deleted_at IS NULL ORDER BY y.year DESC, t.term_number ASC"
    );

    return NextResponse.json({
      success: true,
      years,
      terms
    });
  } catch (error: any) {
    console.error("Academic calendar GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDbPool();
    const body = await req.json();
    const { type, year, start_date, end_date, is_current, year_id, term_number, term_name } = body;

    if (type === "year") {
      if (!year || !start_date || !end_date) {
        return NextResponse.json({ success: false, error: "Year, start date, and end date are required" }, { status: 400 });
      }

      // Check if year already exists
      const [existing]: any = await db.query("SELECT year_id FROM academic_years WHERE year = ? AND deleted_at IS NULL", [year]);
      if (existing && existing.length > 0) {
        return NextResponse.json({ success: false, error: `Academic year ${year} already exists.` }, { status: 409 });
      }

      // Check for overlapping dates among non-deleted years
      const [overlap]: any = await db.query(
        "SELECT year FROM academic_years WHERE deleted_at IS NULL AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?) OR (start_date >= ? AND end_date <= ?))",
        [end_date, start_date, start_date, start_date, start_date, end_date]
      );
      if (overlap && overlap.length > 0) {
        return NextResponse.json({ success: false, error: `Dates overlap with another academic year: ${overlap[0].year}` }, { status: 400 });
      }

      const isCurrentVal = is_current ? 1 : 0;
      
      if (isCurrentVal === 1) {
        await db.query("UPDATE academic_years SET is_current = 0");
      }

      const [result]: any = await db.query(
        "INSERT INTO academic_years (year, start_date, end_date, is_current) VALUES (?, ?, ?, ?)",
        [year, start_date, end_date, isCurrentVal]
      );

      await db.query(
        "INSERT INTO audit_log (username, action, details, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)",
        ["super_admin", "ACADEMIC_YEAR_CREATE", `Created academic year ${year} (${start_date} to ${end_date})`, "ACADEMIC_YEAR", result.insertId.toString()]
      );

      return NextResponse.json({ success: true, insertId: result.insertId });

    } else if (type === "term") {
      if (!year_id || !term_number || !term_name || !start_date || !end_date) {
        return NextResponse.json({ success: false, error: "Missing required term parameters" }, { status: 400 });
      }

      // Check if term number already exists for that year
      const [existingTerm]: any = await db.query(
        "SELECT term_id FROM academic_terms WHERE year_id = ? AND term_number = ? AND deleted_at IS NULL",
        [year_id, term_number]
      );
      if (existingTerm && existingTerm.length > 0) {
        return NextResponse.json({ success: false, error: `Term number ${term_number} already exists for this academic year.` }, { status: 409 });
      }

      // Ensure term dates are within the year's bounds
      const [yearRow]: any = await db.query("SELECT * FROM academic_years WHERE year_id = ?", [year_id]);
      if (yearRow.length === 0) {
        return NextResponse.json({ success: false, error: "Invalid academic year selected" }, { status: 400 });
      }
      
      const yearStart = new Date(yearRow[0].start_date);
      const yearEnd = new Date(yearRow[0].end_date);
      const termStart = new Date(start_date);
      const termEnd = new Date(end_date);

      if (termStart < yearStart || termEnd > yearEnd) {
        return NextResponse.json({ 
          success: false, 
          error: `Term dates must fall within academic year range: ${yearRow[0].start_date.substring(0,10)} to ${yearRow[0].end_date.substring(0,10)}` 
        }, { status: 400 });
      }

      const isCurrentVal = is_current ? 1 : 0;
      if (isCurrentVal === 1) {
        await db.query("UPDATE academic_terms SET is_current = 0 WHERE year_id = ?", [year_id]);
      }

      const [result]: any = await db.query(
        "INSERT INTO academic_terms (year_id, term_number, term_name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?, ?)",
        [year_id, term_number, term_name, start_date, end_date, isCurrentVal]
      );

      await db.query(
        "INSERT INTO audit_log (username, action, details, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)",
        ["super_admin", "ACADEMIC_TERM_CREATE", `Created term '${term_name}' under year ID ${year_id}`, "ACADEMIC_TERM", result.insertId.toString()]
      );

      return NextResponse.json({ success: true, insertId: result.insertId });
    }

    return NextResponse.json({ success: false, error: "Invalid type parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("Academic calendar POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDbPool();
    const body = await req.json();
    const { type, year_id, year, start_date, end_date, is_current, term_id, term_number, term_name } = body;

    if (type === "year") {
      if (!year_id || !year || !start_date || !end_date) {
        return NextResponse.json({ success: false, error: "Missing required year parameters" }, { status: 400 });
      }

      const isCurrentVal = is_current ? 1 : 0;
      
      if (isCurrentVal === 1) {
        await db.query("UPDATE academic_years SET is_current = 0");
      }

      await db.query(
        "UPDATE academic_years SET year = ?, start_date = ?, end_date = ?, is_current = ?, updated_at = CURRENT_TIMESTAMP WHERE year_id = ?",
        [year, start_date, end_date, isCurrentVal, year_id]
      );

      await db.query(
        "INSERT INTO audit_log (username, action, details, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)",
        ["super_admin", "ACADEMIC_YEAR_UPDATE", `Updated academic year ${year} (${start_date} to ${end_date})`, "ACADEMIC_YEAR", year_id.toString()]
      );

      return NextResponse.json({ success: true });

    } else if (type === "term") {
      if (!term_id || !year_id || !term_number || !term_name || !start_date || !end_date) {
        return NextResponse.json({ success: false, error: "Missing required term parameters" }, { status: 400 });
      }

      const isCurrentVal = is_current ? 1 : 0;
      if (isCurrentVal === 1) {
        await db.query("UPDATE academic_terms SET is_current = 0 WHERE year_id = ?", [year_id]);
      }

      await db.query(
        "UPDATE academic_terms SET year_id = ?, term_number = ?, term_name = ?, start_date = ?, end_date = ?, is_current = ?, updated_at = CURRENT_TIMESTAMP WHERE term_id = ?",
        [year_id, term_number, term_name, start_date, end_date, isCurrentVal, term_id]
      );

      await db.query(
        "INSERT INTO audit_log (username, action, details, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)",
        ["super_admin", "ACADEMIC_TERM_UPDATE", `Updated term '${term_name}' (ID: ${term_id}) under year ID ${year_id}`, "ACADEMIC_TERM", term_id.toString()]
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid type parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("Academic calendar PUT error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDbPool();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return NextResponse.json({ success: false, error: "Type and ID parameters are required" }, { status: 400 });
    }

    if (type === "year") {
      await db.query("UPDATE academic_years SET deleted_at = CURRENT_TIMESTAMP WHERE year_id = ?", [id]);
      // Also delete terms under that year
      await db.query("UPDATE academic_terms SET deleted_at = CURRENT_TIMESTAMP WHERE year_id = ?", [id]);

      await db.query(
        "INSERT INTO audit_log (username, action, details, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)",
        ["super_admin", "ACADEMIC_YEAR_DELETE", `Soft-deleted academic year ID ${id} and its terms`, "ACADEMIC_YEAR", id]
      );
    } else if (type === "term") {
      await db.query("UPDATE academic_terms SET deleted_at = CURRENT_TIMESTAMP WHERE term_id = ?", [id]);

      await db.query(
        "INSERT INTO audit_log (username, action, details, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)",
        ["super_admin", "ACADEMIC_TERM_DELETE", `Soft-deleted academic term ID ${id}`, "ACADEMIC_TERM", id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Academic calendar DELETE error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
