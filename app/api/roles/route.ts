import { NextRequest, NextResponse } from "next/server";
import { getDbPool, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/roles - Fetch all permissions and role mappings
export async function GET() {
  try {
    await initializeDatabase();
    const db = getDbPool();

    // 1. Fetch all permissions from database
    const [perms]: any = await db.query(
      "SELECT permission_id, permission_name, permission_description FROM `permissions` WHERE deleted_at IS NULL ORDER BY permission_id"
    );

    // 2. Fetch all role permissions from database
    const [rolePerms]: any = await db.query(
      "SELECT rp.role, p.permission_name FROM `role_permissions` rp " +
      "JOIN `permissions` p ON rp.permission_id = p.permission_id " +
      "WHERE rp.deleted_at IS NULL AND p.deleted_at IS NULL"
    );

    // 3. Construct map of roles to their list of permission names
    const rolePermissionsMap: Record<string, string[]> = {};
    rolePerms.forEach((rp: any) => {
      const { role, permission_name } = rp;
      if (!rolePermissionsMap[role]) {
        rolePermissionsMap[role] = [];
      }
      rolePermissionsMap[role].push(permission_name);
    });

    // 4. Fetch roles from the roles table
    const [rolesRes]: any = await db.query(
      "SELECT DISTINCT `role_name` FROM `roles` WHERE `deleted_at` IS NULL ORDER BY `role_name`"
    );
    const uniqueRoles = rolesRes.map((r: any) => r.role_name);

    // 5. Ensure we have fallback mappings if empty, but otherwise use database
    return NextResponse.json({
      success: true,
      permissions: perms,
      role_permissions: rolePermissionsMap,
      roles: uniqueRoles.length > 0 ? uniqueRoles : Object.keys(rolePermissionsMap)
    });
  } catch (error: any) {
    console.error("GET roles error:", error);
    return NextResponse.json(
      { error: "Database error: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

// POST /api/roles - Save or update permissions for a specific role
export async function POST(req: NextRequest) {
  try {
    const { role, permissions } = await req.json();

    if (!role) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const targetRole = role.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!targetRole) {
      return NextResponse.json({ error: "Invalid role identifier" }, { status: 400 });
    }

    await initializeDatabase();
    const db = getDbPool();

    // 1. Resolve permission_names to permission_ids
    const [perms]: any = await db.query(
      "SELECT permission_id, permission_name FROM `permissions` WHERE deleted_at IS NULL"
    );

    const permissionIdMap: Record<string, number> = {};
    perms.forEach((p: any) => {
      permissionIdMap[p.permission_name] = p.permission_id;
    });

    const targetPermissionIds: number[] = [];
    if (Array.isArray(permissions)) {
      permissions.forEach((pName: string) => {
        const id = permissionIdMap[pName];
        if (id) {
          targetPermissionIds.push(id);
        }
      });
    }

    // 1.5 Ensure role exists in roles table
    const [existingRole]: any = await db.query(
      "SELECT `role_id` FROM `roles` WHERE `role_name` = ? AND `deleted_at` IS NULL",
      [targetRole]
    );
    let roleId: number;
    if (!existingRole || existingRole.length === 0) {
      const displayName = targetRole
        .replace(/[_-]/g, " ")
        .split(" ")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      const [insertRes]: any = await db.query(
        "INSERT INTO `roles` (`role_name`, `role_display_name`, `role_description`, `is_system`) VALUES (?, ?, ?, 0)",
        [targetRole, displayName, `Custom role for ${displayName}`]
      );
      roleId = insertRes.insertId;
    } else {
      roleId = existingRole[0].role_id;
    }

    // 2. Perform updates in a clean sequence
    // First, delete existing role permissions for this role to avoid duplicate primary keys or duplicates
    await db.query("DELETE FROM `role_permissions` WHERE `role` = ?", [targetRole]);

    // Insert new permission maps if any are selected
    if (targetPermissionIds.length > 0) {
      const insertValues = targetPermissionIds.map((id) => [targetRole, id, roleId]);
      await db.query(
        "INSERT INTO `role_permissions` (`role`, `permission_id`, `role_id`) VALUES ?",
        [insertValues]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Permissions updated successfully for role ${targetRole}`
    });

  } catch (error: any) {
    console.error("POST roles error:", error);
    return NextResponse.json(
      { error: "Database error: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
