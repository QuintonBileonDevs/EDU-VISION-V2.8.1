import { NextRequest, NextResponse } from "next/server";
import { getDbPool, initializeDatabase, sha256, detectUsersSchema } from "@/lib/db";

export async function GET() {
  try {
    await initializeDatabase();
    const db = getDbPool();
    const schema = await detectUsersSchema();

    let query = "";
    if (schema === "legacy") {
      query = "SELECT user_id AS id, username, email, full_name, role, IF(is_active = 1, 'Active', 'Inactive') AS status, 'All' AS region, DATE_FORMAT(last_login_at, '%Y-%m-%d %H:%i:%s') as last_login FROM `users` ORDER BY user_id DESC";
    } else {
      query = "SELECT id, username, email, full_name, role, status, region, DATE_FORMAT(last_login, '%Y-%m-%d %H:%i:%s') as last_login FROM `users` ORDER BY id DESC";
    }

    const [rows]: any = await db.query(query);

    // Fetch actual regions from reference_data table in the database
    let regions: string[] = ["Central", "Chobe", "Gantsi", "Kgalagadi", "Kgatleng", "Kweneng", "North East", "North West", "South", "South East"];
    try {
      const [refRows]: any = await db.query("SELECT DISTINCT value FROM `reference_data` WHERE `category` = 'region' ORDER BY value ASC");
      if (refRows && refRows.length > 0) {
        regions = refRows.map((r: any) => r.value);
      }
    } catch (refErr) {
      console.error("Error fetching regions from reference_data:", refErr);
    }

    return NextResponse.json({ success: true, db_status: "online", users: rows, regions });
  } catch (error: any) {
    console.error("GET users error:", error);
    return NextResponse.json(
      { 
        error: "Database Connection Failure: " + (error.message || "Unknown error"),
        code: error.code,
        details: "Ensure 0.0.0.0/0 is added to your Aiven MySQL 'Allowed IP Addresses' list."
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, email, full_name, role, region, password, status } = await req.json();

    if (!username || !email || !full_name || !role || !password) {
      return NextResponse.json(
        { error: "Username, email, full name, role, and password are required" },
        { status: 400 }
      );
    }

    const hashed = sha256(password);
    const userStatus = status || "Active";
    const userRegion = region || "All";

    await initializeDatabase();
    const db = getDbPool();
    const schema = await detectUsersSchema();

    const [existing]: any = await db.query(
      schema === "legacy" 
        ? "SELECT user_id AS id FROM `users` WHERE LOWER(username) = ? OR LOWER(email) = ?" 
        : "SELECT id FROM `users` WHERE LOWER(username) = ? OR LOWER(email) = ?",
      [username.trim().toLowerCase(), email.trim().toLowerCase()]
    );

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "User with this username or email already exists." },
        { status: 409 }
      );
    }

    let result: any;
    if (schema === "legacy") {
      const isActiveVal = userStatus === "Active" ? 1 : 0;
      [result] = await db.query(
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role`, `is_active`) VALUES (?, ?, ?, ?, ?, ?)",
        [username.trim(), hashed, email.trim(), full_name.trim(), role, isActiveVal]
      );
    } else {
      [result] = await db.query(
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role`, `status`, `region`) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [username.trim(), hashed, email.trim(), full_name.trim(), role, userStatus, userRegion]
      );
    }

    return NextResponse.json({
      success: true,
      db_status: "online",
      message: "User provisioned successfully",
      userId: result.insertId
    });

  } catch (error: any) {
    console.error("POST users error:", error);
    return NextResponse.json(
      { 
        error: "Database Connection Failure: " + (error.message || "Unknown error"),
        code: error.code
      },
      { status: 500 }
    );
  }
}

// PUT: Update a system user (role, status, full name, region, password)
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { full_name, role, region, status, password } = await req.json();

    await initializeDatabase();
    const db = getDbPool();
    const schema = await detectUsersSchema();

    const updates: string[] = [];
    const params: any[] = [];

    if (full_name !== undefined) {
      updates.push("`full_name` = ?");
      params.push(full_name.trim());
    }
    if (role !== undefined) {
      updates.push("`role` = ?");
      params.push(role);
    }
    if (region !== undefined) {
      updates.push("`region` = ?");
      params.push(region);
    }
    if (status !== undefined) {
      if (schema === "legacy") {
        updates.push("`is_active` = ?");
        params.push(status === "Active" ? 1 : 0);
      } else {
        updates.push("`status` = ?");
        params.push(status);
      }
    }
    if (password) {
      updates.push("`password_hash` = ?");
      params.push(sha256(password));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update provided" }, { status: 400 });
    }

    let query = "";
    if (schema === "legacy") {
      query = `UPDATE \`users\` SET ${updates.join(", ")} WHERE \`user_id\` = ?`;
    } else {
      query = `UPDATE \`users\` SET ${updates.join(", ")} WHERE \`id\` = ?`;
    }
    params.push(id);

    await db.query(query, params);

    return NextResponse.json({
      success: true,
      message: "User updated successfully"
    });

  } catch (error: any) {
    console.error("PUT users error:", error);
    return NextResponse.json(
      { 
        error: "Database Connection Failure: " + (error.message || "Unknown error"),
        code: error.code
      },
      { status: 500 }
    );
  }
}

// DELETE: Terminate or delete a system user
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await initializeDatabase();
    const db = getDbPool();
    const schema = await detectUsersSchema();

    // Prevent deleting the default super_admin account for system safety
    let checkQuery = schema === "legacy" 
      ? "SELECT username FROM `users` WHERE `user_id` = ?"
      : "SELECT username FROM `users` WHERE `id` = ?";
    
    const [rows]: any = await db.query(checkQuery, [id]);
    if (rows && rows.length > 0 && rows[0].username === "super_admin") {
      return NextResponse.json(
        { error: "Action Forbidden: Cannot delete default super_admin account." },
        { status: 403 }
      );
    }

    let deleteQuery = schema === "legacy"
      ? "DELETE FROM `users` WHERE `user_id` = ?"
      : "DELETE FROM `users` WHERE `id` = ?";

    await db.query(deleteQuery, [id]);

    return NextResponse.json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (error: any) {
    console.error("DELETE users error:", error);
    return NextResponse.json(
      { 
        error: "Database Connection Failure: " + (error.message || "Unknown error"),
        code: error.code
      },
      { status: 500 }
    );
  }
}
