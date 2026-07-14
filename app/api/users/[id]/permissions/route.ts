import { NextRequest, NextResponse } from "next/server";
import { getDbPool, initializeDatabase, detectUsersSchema } from "@/lib/db";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    await initializeDatabase();
    const db = getDbPool();
    const schema = await detectUsersSchema();

    let query = "";
    if (schema === "legacy") {
      query = `
        SELECT DISTINCT p.permission_name
        FROM \`role_permissions\` rp
        JOIN \`permissions\` p ON rp.permission_id = p.permission_id
        JOIN \`users\` u ON u.role_id = rp.role_id
        WHERE u.user_id = ? AND rp.deleted_at IS NULL AND p.deleted_at IS NULL
      `;
    } else {
      query = `
        SELECT DISTINCT p.permission_name
        FROM \`role_permissions\` rp
        JOIN \`permissions\` p ON rp.permission_id = p.permission_id
        JOIN \`users\` u ON u.role = rp.role
        WHERE u.id = ? AND rp.deleted_at IS NULL AND p.deleted_at IS NULL
      `;
    }

    const [rows]: any = await db.query(query, [id]);
    const permissions: Record<string, boolean> = {};
    rows.forEach((row: any) => {
      permissions[row.permission_name] = true;
    });

    // Fetch user-specific overrides from user_permissions table
    try {
      const overrideQuery = `
        SELECT p.permission_name, up.override_type
        FROM \`user_permissions\` up
        JOIN \`permissions\` p ON up.permission_id = p.permission_id
        WHERE up.user_id = ? AND up.deleted_at IS NULL AND p.deleted_at IS NULL
      `;
      const [overrides]: any = await db.query(overrideQuery, [id]);
      overrides.forEach((row: any) => {
        if (row.override_type === "allow") {
          permissions[row.permission_name] = true;
        } else if (row.override_type === "deny") {
          delete permissions[row.permission_name];
        }
      });
    } catch (overrideErr) {
      console.error("Error loading user-specific overrides:", overrideErr);
    }

    // Also include some sensible defaults if there are none, for robustness
    if (Object.keys(permissions).length === 0 && id === "1") {
      // Fallback for super_admin user_id = 1
      const defaultSuperPerms = [
        "LOCK_USER", "UNLOCK_USER", "DELETE_USER", "RESTORE_USER",
        "EXPORT_USERS", "IMPORT_USERS", "RESET_PASSWORD",
        "VIEW_USER_DETAILS", "UPDATE_USER", "FORCE_PASSWORD_CHANGE", "VIEW_USER_LIST"
      ];
      defaultSuperPerms.forEach(p => {
        permissions[p] = true;
      });
    }

    const responsePayload: any = {
      success: true,
      permissions: Object.keys(permissions)
    };
    
    // Add flat properties for compatibility
    Object.keys(permissions).forEach(pName => {
      responsePayload[pName] = true;
    });

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error("GET user permissions error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
