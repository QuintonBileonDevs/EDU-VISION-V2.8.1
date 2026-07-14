import { NextRequest, NextResponse } from "next/server";
import { getDbPool, initializeDatabase, sha256, detectUsersSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "all";
    const sortBy = searchParams.get("sortBy") || "username";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    const offset = (page - 1) * limit;

    await initializeDatabase();
    const db = getDbPool();
    const schema = await detectUsersSchema();

    let query = "";
    let countQuery = "";
    const whereClauses: string[] = [];
    const params: any[] = [];

    // Search filter
    if (search) {
      if (schema === "legacy") {
        whereClauses.push("(u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)");
      } else {
        whereClauses.push("(username LIKE ? OR email LIKE ? OR full_name LIKE ?)");
      }
      const likeParam = `%${search}%`;
      params.push(likeParam, likeParam, likeParam);
    }

    // Role filter
    if (role && role !== "all") {
      if (schema === "legacy") {
        whereClauses.push("r.role_name = ?");
      } else {
        whereClauses.push("role = ?");
      }
      params.push(role);
    }

    // Status / Deleted filter
    if (status === "deleted") {
      if (schema === "legacy") {
        whereClauses.push("u.deleted_at IS NOT NULL");
      } else {
        whereClauses.push("deleted_at IS NOT NULL");
      }
    } else {
      // By default, exclude soft-deleted users
      if (schema === "legacy") {
        whereClauses.push("u.deleted_at IS NULL");
      } else {
        whereClauses.push("deleted_at IS NULL");
      }

      if (status === "active") {
        if (schema === "legacy") {
          whereClauses.push("u.is_active = 1");
        } else {
          whereClauses.push("status = 'Active'");
        }
      } else if (status === "inactive") {
        if (schema === "legacy") {
          whereClauses.push("u.is_active = 0");
        } else {
          whereClauses.push("status = 'Inactive'");
        }
      }
    }

    const whereStr = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

    // Validate and sanitize order by columns to prevent SQL injection
    const allowedSortCols = ["username", "email", "full_name", "role", "status", "id", "user_id"];
    const sortCol = allowedSortCols.includes(sortBy) ? sortBy : "username";
    const orderDir = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";

    let orderByStr = "";
    if (schema === "legacy") {
      const orderColMapped = sortCol === "id" ? "u.user_id" : (sortCol === "role" ? "r.role_name" : `u.${sortCol}`);
      orderByStr = `ORDER BY ${orderColMapped} ${orderDir}`;
    } else {
      orderByStr = `ORDER BY ${sortCol} ${orderDir}`;
    }

    if (schema === "legacy") {
      query = `
        SELECT u.user_id AS id, u.username, u.email, u.full_name, u.phone_number,
               r.role_name AS role, r.role_display_name, IF(u.is_active = 1, 'Active', 'Inactive') AS status,
               u.is_active, COALESCE(u.region, 'All') AS region, DATE_FORMAT(u.last_login_at, '%Y-%m-%d %H:%i:%s') as last_login,
               u.created_at, u.deleted_at
        FROM \`users\` u
        LEFT JOIN \`roles\` r ON u.role_id = r.role_id
        ${whereStr}
        ${orderByStr}
        LIMIT ? OFFSET ?
      `;
      countQuery = `
        SELECT COUNT(*) as count
        FROM \`users\` u
        LEFT JOIN \`roles\` r ON u.role_id = r.role_id
        ${whereStr}
      `;
    } else {
      query = `
        SELECT id, username, email, full_name, role, status, region, 
               DATE_FORMAT(last_login, '%Y-%m-%d %H:%i:%s') as last_login, created_at, deleted_at
        FROM \`users\`
        ${whereStr}
        ${orderByStr}
        LIMIT ? OFFSET ?
      `;
      countQuery = `
        SELECT COUNT(*) as count
        FROM \`users\`
        ${whereStr}
      `;
    }

    // Run queries
    const countParams = [...params];
    const selectParams = [...params, limit, offset];

    const [countRows]: any = await db.query(countQuery, countParams);
    const total = countRows[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    const [rows]: any = await db.query(query, selectParams);

    // Fetch all role permissions
    const rolePermsMap: Record<string, string[]> = {};
    try {
      let rolePermsQuery = "";
      if (schema === "legacy") {
        rolePermsQuery = `
          SELECT r.role_name AS role, p.permission_name
          FROM \`role_permissions\` rp
          JOIN \`permissions\` p ON rp.permission_id = p.permission_id
          JOIN \`roles\` r ON rp.role_id = r.role_id
          WHERE rp.deleted_at IS NULL AND p.deleted_at IS NULL
        `;
      } else {
        rolePermsQuery = `
          SELECT rp.role, p.permission_name
          FROM \`role_permissions\` rp
          JOIN \`permissions\` p ON rp.permission_id = p.permission_id
          WHERE rp.deleted_at IS NULL AND p.deleted_at IS NULL
        `;
      }
      const [rolePermRows]: any = await db.query(rolePermsQuery);
      rolePermRows.forEach((rp: any) => {
        const rName = rp.role;
        if (!rolePermsMap[rName]) {
          rolePermsMap[rName] = [];
        }
        rolePermsMap[rName].push(rp.permission_name);
      });
    } catch (rpErr) {
      console.error("Error fetching all role permissions:", rpErr);
    }

    // Fetch overrides for the returned users
    const userOverridesMap: Record<number, { allow: string[], deny: string[] }> = {};
    if (rows.length > 0) {
      try {
        const userIds = rows.map((r: any) => r.id);
        const [overrideRows]: any = await db.query(`
          SELECT up.user_id, p.permission_name, up.override_type
          FROM \`user_permissions\` up
          JOIN \`permissions\` p ON up.permission_id = p.permission_id
          WHERE up.user_id IN (?) AND up.deleted_at IS NULL AND p.deleted_at IS NULL
        `, [userIds]);

        overrideRows.forEach((row: any) => {
          const uId = row.user_id;
          if (!userOverridesMap[uId]) {
            userOverridesMap[uId] = { allow: [], deny: [] };
          }
          if (row.override_type === "allow") {
            userOverridesMap[uId].allow.push(row.permission_name);
          } else if (row.override_type === "deny") {
            userOverridesMap[uId].deny.push(row.permission_name);
          }
        });
      } catch (overErr) {
        console.error("Error fetching user permissions overrides in bulk:", overErr);
      }
    }

    // Attach active permissions to each user
    const usersWithPermissions = rows.map((user: any) => {
      const uId = user.id;
      const roleName = user.role || "";
      const basePerms = rolePermsMap[roleName] || [];
      const overrides = userOverridesMap[uId] || { allow: [], deny: [] };

      // combine
      const activePermSet = new Set<string>(basePerms);
      overrides.allow.forEach(p => activePermSet.add(p));
      overrides.deny.forEach(p => activePermSet.delete(p));

      // sensible fallback for super admin
      if (activePermSet.size === 0 && user.username === "super_admin") {
        const defaultSuperPerms = [
          "LOCK_USER", "UNLOCK_USER", "DELETE_USER", "RESTORE_USER",
          "EXPORT_USERS", "IMPORT_USERS", "RESET_PASSWORD",
          "VIEW_USER_DETAILS", "UPDATE_USER", "FORCE_PASSWORD_CHANGE", "VIEW_USER_LIST"
        ];
        defaultSuperPerms.forEach(p => activePermSet.add(p));
      }

      return {
        ...user,
        permissions: Array.from(activePermSet)
      };
    });

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

    return NextResponse.json({
      success: true,
      db_status: "online",
      users: usersWithPermissions,
      regions,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
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
    const { username, email, full_name, role, region, password, status, permissions } = await req.json();

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
      
      // Look up role_id dynamically, with static fallback mapping
      let roleId = 8; // fallback to school_admin
      let cleanRoleName = role;
      let isNewRole = false;
      try {
        const [roleRows]: any = await db.query("SELECT role_id FROM `roles` WHERE `role_name` = ? AND `deleted_at` IS NULL", [role]);
        if (roleRows && roleRows.length > 0) {
          roleId = roleRows[0].role_id;
        } else {
          const roleIdMap: Record<string, number> = {
            super_admin: 1,
            region_admin: 2,
            subregion_admin: 3,
            school_head: 4,
            data_entry_clerk: 5,
            education_officer: 6,
            report_viewer: 7,
            school_admin: 8
          };
          if (roleIdMap[role]) {
            roleId = roleIdMap[role];
          } else {
            // It is a custom role name and not in the database roles table.
            // Let's dynamically insert it into the roles table to support custom roles in legacy schema!
            const cleanRole = role.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
            cleanRoleName = cleanRole;
            if (cleanRole) {
              const displayName = cleanRole
                .replace(/[_-]/g, " ")
                .split(" ")
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
              try {
                const [insertRes]: any = await db.query(
                  "INSERT INTO `roles` (`role_name`, `role_display_name`, `role_description`, `is_system`) VALUES (?, ?, ?, 0)",
                  [cleanRole, displayName, `Custom role for ${displayName}`]
                );
                roleId = insertRes.insertId;
                isNewRole = true;
              } catch (insErr) {
                console.error("Failed to insert custom role into legacy roles table, falling back to 8:", insErr);
                roleId = 8;
              }
            }
          }
        }
      } catch (roleErr) {
        console.error("Error looking up role_id in user creation:", roleErr);
      }

      [result] = await db.query(
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role_id`, `is_active`, `region`) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [username.trim(), hashed, email.trim(), full_name.trim(), roleId, isActiveVal, userRegion]
      );
      
      if (isNewRole && permissions && Array.isArray(permissions) && permissions.length > 0) {
        try {
          for (const p of permissions) {
            const [pRows]: any = await db.query("SELECT permission_id FROM `permissions` WHERE permission_name = ?", [p]);
            if (pRows && pRows.length > 0) {
              await db.query(
                "INSERT INTO `role_permissions` (`role`, `permission_id`, `role_id`) VALUES (?, ?, ?)",
                [cleanRoleName, pRows[0].permission_id, roleId]
              );
            }
          }
        } catch (permErr) {
          console.error("Error inserting role permissions for new role:", permErr);
        }
      }
    } else {
      [result] = await db.query(
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role`, `status`, `region`) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [username.trim(), hashed, email.trim(), full_name.trim(), role, userStatus, userRegion]
      );
      
      if (permissions && Array.isArray(permissions) && permissions.length > 0) {
        try {
          const [rolePerms]: any = await db.query("SELECT role_permission_id FROM `role_permissions` WHERE `role` = ?", [role]);
          if (!rolePerms || rolePerms.length === 0) {
            for (const p of permissions) {
              const [pRows]: any = await db.query("SELECT permission_id FROM `permissions` WHERE permission_name = ?", [p]);
              if (pRows && pRows.length > 0) {
                await db.query(
                  "INSERT INTO `role_permissions` (`role`, `permission_id`) VALUES (?, ?)",
                  [role, pRows[0].permission_id]
                );
              }
            }
          }
        } catch (permErr) {
          console.error("Error inserting role permissions for non-legacy schema:", permErr);
        }
      }
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
      if (schema === "legacy") {
        let roleId = 8; // fallback to school_admin
        try {
          const [roleRows]: any = await db.query("SELECT role_id FROM `roles` WHERE `role_name` = ? AND `deleted_at` IS NULL", [role]);
          if (roleRows && roleRows.length > 0) {
            roleId = roleRows[0].role_id;
          } else {
            const roleIdMap: Record<string, number> = {
              super_admin: 1,
              region_admin: 2,
              subregion_admin: 3,
              school_head: 4,
              data_entry_clerk: 5,
              education_officer: 6,
              report_viewer: 7,
              school_admin: 8
            };
            if (roleIdMap[role]) {
              roleId = roleIdMap[role];
            }
          }
        } catch (roleErr) {
          console.error("Error looking up role_id in user update:", roleErr);
        }
        updates.push("`role_id` = ?");
        params.push(roleId);
      } else {
        updates.push("`role` = ?");
        params.push(role);
      }
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
