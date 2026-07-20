import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import crypto from "crypto";

let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool {
  if (!pool) {
    const host = process.env.DB_HOST;
    const port = parseInt(process.env.DB_PORT || "12720", 10);
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME || "school_data_collection";
    const caFile = process.env.DB_SSL_CA || "ca.pem";

    if (!host || !user || !password) {
      throw new Error("Missing MySQL database connection configuration in environment variables");
    }

    let sslOptions: any = null;
    try {
      const caPath = path.resolve(process.cwd(), caFile);
      if (fs.existsSync(caPath)) {
        sslOptions = {
          ca: fs.readFileSync(caPath),
          rejectUnauthorized: false // Necessary for self-signed or internal Aiven certificates
        };
      } else {
        sslOptions = { rejectUnauthorized: false };
      }
    } catch (e) {
      console.error("Error reading SSL certificate ca.pem:", e);
      sslOptions = { rejectUnauthorized: false };
    }

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      ssl: sslOptions,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 10000 // 10 seconds TCP handshake timeout
    });
  }
  return pool;
}

// Compute SHA-256 hash for secure password verification
export function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

let usersTableSchema: "new" | "legacy" | null = null;

export async function detectUsersSchema(): Promise<"new" | "legacy"> {
  if (usersTableSchema) return usersTableSchema;
  try {
    const db = getDbPool();
    const [columns]: any = await db.query("DESCRIBE `users`");
    const hasUserId = columns.some((col: any) => col.Field === "user_id");
    usersTableSchema = hasUserId ? "legacy" : "new";
    return usersTableSchema;
  } catch (e) {
    console.error("Error detecting users schema:", e);
    return "new"; // fallback
  }
}

// Automatically create tables if they do not exist
export async function initializeDatabase() {
  const db = getDbPool();
  
  // Create users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`username\` VARCHAR(255) NOT NULL UNIQUE,
      \`password_hash\` VARCHAR(255) NOT NULL,
      \`email\` VARCHAR(255) NOT NULL UNIQUE,
      \`full_name\` VARCHAR(255) NOT NULL,
      \`role\` VARCHAR(100) NOT NULL,
      \`status\` VARCHAR(50) DEFAULT 'Active',
      \`region\` VARCHAR(100) DEFAULT 'All',
      \`last_login\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create school registries table (students, teachers, dropouts, etc.)
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`registries\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`type\` VARCHAR(100) NOT NULL, -- 'students', 'teachers', 'dropouts', 'transfers'
      \`school_name\` VARCHAR(255) NOT NULL,
      \`region\` VARCHAR(100) NOT NULL,
      \`record_data\` JSON NOT NULL, -- holds form fields like name, age, reason, etc.
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create permissions table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`permissions\` (
      \`permission_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`permission_name\` VARCHAR(100) UNIQUE NOT NULL,
      \`permission_description\` VARCHAR(255),
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`deleted_at\` TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create role_permissions table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`role_permissions\` (
      \`role_permission_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`role\` VARCHAR(100) NOT NULL,
      \`permission_id\` INT NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`deleted_at\` TIMESTAMP NULL,
      FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\` (\`permission_id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create user_permissions table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`user_permissions\` (
      \`user_permission_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`user_id\` INT NOT NULL,
      \`permission_id\` INT NOT NULL,
      \`override_type\` VARCHAR(20) NOT NULL, -- 'allow', 'deny'
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`deleted_at\` TIMESTAMP NULL,
      FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\` (\`permission_id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Seed default permissions if table is empty
  const [permCountRows]: any = await db.query("SELECT COUNT(*) as count FROM `permissions` WHERE deleted_at IS NULL");
  const permCount = permCountRows[0]?.count || 0;
  if (permCount === 0) {
    const defaultPermissions = [
      ["view_all_schools", "View all schools information across all regions"],
      ["manage_all_schools", "Create, edit, or delete any school profile"],
      ["view_region_schools", "View schools within assigned region"],
      ["manage_region_schools", "Manage school profiles within assigned region"],
      ["view_subregion_schools", "View schools within assigned sub-region"],
      ["manage_subregion_schools", "Manage school profiles within assigned sub-region"],
      ["view_own_school", "View profile and data for your own school"],
      ["manage_own_school", "Manage profile and data for your own school"],
      ["view_students", "View student records and information"],
      ["manage_students", "Create, update, or remove student records"],
      ["view_staff", "View teacher and staff records"],
      ["manage_staff", "Manage teacher and staff profiles"],
      ["view_inventory", "View school inventory and assets list"],
      ["manage_inventory", "Update school inventory and assets list"],
      ["view_reports", "Access, filter, and export data reports"],
      ["manage_users", "Provision and manage system users and roles"],
      ["view_audit_log", "View administrative audit trail and system activity logs"],
      ["manage_policies", "Configure global education policies and rules"]
    ];
    await db.query("INSERT INTO `permissions` (`permission_name`, `permission_description`) VALUES ?", [defaultPermissions]);
  }

  // Seed default role_permissions if empty
  const [rolePermCountRows]: any = await db.query("SELECT COUNT(*) as count FROM `role_permissions` WHERE deleted_at IS NULL");
  const rolePermCount = rolePermCountRows[0]?.count || 0;
  if (rolePermCount === 0) {
    const [allPerms]: any = await db.query("SELECT permission_id, permission_name FROM `permissions` WHERE deleted_at IS NULL");
    const permIdMap: Record<string, number> = {};
    allPerms.forEach((p: any) => {
      permIdMap[p.permission_name] = p.permission_id;
    });

    const defaultRolePerms: Record<string, string[]> = {
      super_admin: ["view_all_schools", "manage_all_schools", "view_region_schools", "manage_region_schools", "view_subregion_schools", "manage_subregion_schools", "view_own_school", "manage_own_school", "view_students", "manage_students", "view_staff", "manage_staff", "view_inventory", "manage_inventory", "view_reports", "manage_users", "view_audit_log", "manage_policies"],
      emis_admin: ["view_all_schools", "manage_all_schools", "view_region_schools", "manage_region_schools", "view_subregion_schools", "manage_subregion_schools", "view_own_school", "manage_own_school", "view_students", "manage_students", "view_staff", "manage_staff", "view_inventory", "manage_inventory", "view_reports", "manage_users", "manage_policies"],
      region_admin: ["view_region_schools", "manage_region_schools", "view_students", "manage_students", "view_staff", "manage_staff", "view_inventory", "manage_inventory", "view_reports"],
      subregion_admin: ["view_subregion_schools", "manage_subregion_schools", "view_students", "manage_students", "view_staff", "manage_staff", "view_inventory", "manage_inventory"],
      school_head: ["view_own_school", "manage_own_school", "view_students", "manage_students", "view_staff", "manage_staff", "view_inventory", "manage_inventory"],
      school_admin: ["view_own_school", "view_students", "manage_students", "view_staff", "manage_staff", "view_inventory", "view_reports"],
      data_entry_clerk: ["view_students", "manage_students", "view_staff", "manage_staff", "view_inventory"],
      education_officer: ["view_all_schools", "view_students", "view_staff", "view_inventory", "view_reports"],
      report_viewer: ["view_reports"]
    };

    // Fetch existing roles to map role_name to role_id
    const [rolesRes]: any = await db.query("SELECT `role_id`, `role_name` FROM `roles` WHERE `deleted_at` IS NULL");
    const roleIdMap: Record<string, number> = {};
    rolesRes.forEach((r: any) => {
      roleIdMap[r.role_name] = r.role_id;
    });

    const insertValues: any[] = [];
    Object.entries(defaultRolePerms).forEach(([role, perms]) => {
      const rId = roleIdMap[role];
      if (rId) {
        perms.forEach((pName) => {
          const id = permIdMap[pName];
          if (id) {
            insertValues.push([role, id, rId]);
          }
        });
      }
    });

    if (insertValues.length > 0) {
      await db.query("INSERT INTO `role_permissions` (`role`, `permission_id`, `role_id`) VALUES ?", [insertValues]);
    }
  }

  const schema = await detectUsersSchema();

  // Handle super_admin upsert/update
  const [superAdminRows]: any = await db.query(
    schema === "legacy"
      ? "SELECT user_id AS id FROM `users` WHERE username = 'super_admin'"
      : "SELECT id FROM `users` WHERE username = 'super_admin'"
  );

  if (superAdminRows && superAdminRows.length > 0) {
    console.log("Updating existing super_admin password to match admin123...");
    await db.query(
      "UPDATE `users` SET `password_hash` = ? WHERE `username` = 'super_admin'",
      [sha256("admin123")]
    );
  } else {
    console.log("Inserting super_admin...");
    if (schema === "legacy") {
      await db.query(
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role_id`, `is_active`) VALUES (?, ?, ?, ?, ?, ?)",
        ["super_admin", sha256("admin123"), "admin@schoolgov.com", "System Super Administrator", 1, 1]
      );
    } else {
      await db.query(
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role`, `status`, `region`) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["super_admin", sha256("admin123"), "admin@schoolgov.com", "System Super Administrator", "super_admin", "Active", "All"]
      );
    }
  }

  // Handle school_head upsert/update
  const [schoolHeadRows]: any = await db.query(
    schema === "legacy"
      ? "SELECT user_id AS id FROM `users` WHERE username = 'school_head'"
      : "SELECT id FROM `users` WHERE username = 'school_head'"
  );

  if (schoolHeadRows && schoolHeadRows.length > 0) {
    console.log("Updating existing school_head password to match school123...");
    await db.query(
      "UPDATE `users` SET `password_hash` = ? WHERE `username` = 'school_head'",
      [sha256("school123")]
    );
  } else {
    console.log("Inserting school_head...");
    if (schema === "legacy") {
      await db.query(
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role_id`, `is_active`) VALUES (?, ?, ?, ?, ?, ?)",
        ["school_head", sha256("school123"), "schoolhead@schoolgov.com", "School Head (Mogoditshane)", 4, 1]
      );
    } else {
      await db.query(
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role`, `status`, `region`) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["school_head", sha256("school123"), "schoolhead@schoolgov.com", "School Head (Mogoditshane)", "school_head", "Active", "South"]
      );
    }
  }

  // Handle emis_admin upsert/update
  const [emisAdminRows]: any = await db.query(
    schema === "legacy"
      ? "SELECT user_id AS id FROM `users` WHERE username = 'emis_admin'"
      : "SELECT id FROM `users` WHERE username = 'emis_admin'"
  );

  if (emisAdminRows && emisAdminRows.length > 0) {
    console.log("Updating existing emis_admin password to match emis123...");
    await db.query(
      "UPDATE `users` SET `password_hash` = ? WHERE `username` = 'emis_admin'",
      [sha256("emis123")]
    );
  } else {
    console.log("Inserting emis_admin...");
    if (schema === "legacy") {
      await db.query(
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role_id`, `is_active`) VALUES (?, ?, ?, ?, ?, ?)",
        ["emis_admin", sha256("emis123"), "emisadmin@schoolgov.com", "EMIS System Administrator", 2, 1]
      );
    } else {
      await db.query(
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role`, `status`, `region`) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["emis_admin", sha256("emis123"), "emisadmin@schoolgov.com", "EMIS System Administrator", "emis_admin", "Active", "All"]
      );
    }
  }

  // Create ip_whitelist table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`ip_whitelist\` (
      \`whitelist_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`ip_address\` VARCHAR(50) NOT NULL,
      \`description\` VARCHAR(255),
      \`created_by_user_id\` INT,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`deleted_at\` TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create user_sessions table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`user_sessions\` (
      \`session_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`user_id\` INT NOT NULL,
      \`ip_address\` VARCHAR(50),
      \`user_agent\` TEXT,
      \`login_time\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`expiry_time\` TIMESTAMP,
      \`last_activity_time\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`is_active\` TINYINT(1) DEFAULT 1,
      \`deleted_at\` TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create security_alerts table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`security_alerts\` (
      \`alert_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`alert_type\` VARCHAR(100) NOT NULL,
      \`alert_message\` TEXT,
      \`severity\` VARCHAR(20) DEFAULT 'MEDIUM',
      \`ip_address\` VARCHAR(50),
      \`user_id\` INT,
      \`is_resolved\` TINYINT(1) DEFAULT 0,
      \`resolved_at\` TIMESTAMP NULL,
      \`resolved_by_user_id\` INT,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`deleted_at\` TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create system_config table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`system_config\` (
      \`config_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`config_key\` VARCHAR(100) UNIQUE NOT NULL,
      \`config_value\` TEXT,
      \`config_group\` VARCHAR(50) DEFAULT 'general',
      \`description\` TEXT,
      \`is_editable\` TINYINT(1) DEFAULT 1,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`deleted_at\` TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create system_error_logs table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`system_error_logs\` (
      \`error_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`error_message\` TEXT NOT NULL,
      \`error_stack\` TEXT,
      \`severity\` VARCHAR(20) DEFAULT 'ERROR',
      \`user_id\` INT,
      \`request_url\` VARCHAR(255),
      \`request_method\` VARCHAR(10),
      \`error_file\` VARCHAR(255),
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`resolved_at\` TIMESTAMP NULL,
      \`deleted_at\` TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create system_health_metrics table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`system_health_metrics\` (
      \`metric_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`metric_name\` VARCHAR(100) NOT NULL,
      \`metric_value\` VARCHAR(255),
      \`recorded_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`deleted_at\` TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create system_backups table
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`system_backups\` (
      \`backup_id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`backup_name\` VARCHAR(255) NOT NULL,
      \`backup_type\` VARCHAR(50) DEFAULT 'FULL',
      \`backup_file_path\` VARCHAR(255),
      \`backup_status\` VARCHAR(50) DEFAULT 'PENDING',
      \`created_by_user_id\` INT,
      \`backup_started_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`backup_completed_at\` TIMESTAMP NULL,
      \`deleted_at\` TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Seed system_config if empty
  const [configCountRows]: any = await db.query("SELECT COUNT(*) as count FROM `system_config` WHERE deleted_at IS NULL");
  const configCount = configCountRows[0]?.count || 0;
  if (configCount === 0) {
    const defaultConfig = [
      ['MAINTENANCE_MODE', 'FALSE', 'general', 'Enable or disable maintenance mode', 1],
      ['MAX_LOGIN_ATTEMPTS', '5', 'security', 'Maximum failed logins', 1],
      ['SESSION_TIMEOUT_MINS', '60', 'security', 'Session timeout in minutes', 1],
      ['SYSTEM_TIMEZONE', 'Africa/Gaborone', 'general', 'System default timezone', 0],
      ['ALLOW_SELF_REGISTRATION', 'FALSE', 'general', 'Enable school self registration', 1]
    ];
    await db.query("INSERT INTO `system_config` (`config_key`, `config_value`, `config_group`, \`description\`, \`is_editable\`) VALUES ?", [defaultConfig]);
  }

  // Seed system_health_metrics if empty
  const [healthCountRows]: any = await db.query("SELECT COUNT(*) as count FROM \`system_health_metrics\` WHERE deleted_at IS NULL");
  if (healthCountRows[0]?.count === 0) {
    const defaultMetrics = [
      ['uptime', '99.95'],
      ['db_latency', '12'],
      ['storage_used', '45.2'],
      ['api_response_avg', '156']
    ];
    await db.query("INSERT INTO \`system_health_metrics\` (\`metric_name\`, \`metric_value\`) VALUES ?", [defaultMetrics]);
  }

  // Ensure granular user management permissions exist and are mapped to super_admin
  const requiredPermissions = [
    ["LOCK_USER", "Lock or suspend system user accounts"],
    ["UNLOCK_USER", "Unlock or reactivate suspended user accounts"],
    ["DELETE_USER", "Soft delete system user accounts"],
    ["RESTORE_USER", "Restore soft-deleted user accounts"],
    ["EXPORT_USERS", "Export system user data"],
    ["IMPORT_USERS", "Import system users from files"],
    ["RESET_PASSWORD", "Reset password for system user accounts"],
    ["VIEW_USER_DETAILS", "View detailed user profile and information"],
    ["UPDATE_USER", "Edit or update system user details"],
    ["FORCE_PASSWORD_CHANGE", "Force system users to change password on next login"],
    ["VIEW_USER_LIST", "View list of system administrative users"]
  ];

  for (const [pName, pDesc] of requiredPermissions) {
    const [exists]: any = await db.query("SELECT permission_id FROM `permissions` WHERE `permission_name` = ?", [pName]);
    let pId: number;
    if (!exists || exists.length === 0) {
      const [insertRes]: any = await db.query(
        "INSERT INTO `permissions` (`permission_name`, `permission_description`) VALUES (?, ?)",
        [pName, pDesc]
      );
      pId = insertRes.insertId;
    } else {
      pId = exists[0].permission_id;
    }

    // Map to super_admin if not already mapped
    const [mapExists]: any = await db.query(
      "SELECT role_permission_id FROM `role_permissions` WHERE `role` = 'super_admin' AND `permission_id` = ?",
      [pId]
    );
    if (!mapExists || mapExists.length === 0) {
      const [superRole]: any = await db.query("SELECT role_id FROM `roles` WHERE `role_name` = 'super_admin' AND `deleted_at` IS NULL");
      const rId = superRole && superRole.length > 0 ? superRole[0].role_id : 1;
      await db.query(
        "INSERT INTO `role_permissions` (`role`, `permission_id`, `role_id`) VALUES (?, ?, ?)",
        ["super_admin", pId, rId]
      );
    }
  }

  console.log("Seeding and validation of default accounts complete.");
}
