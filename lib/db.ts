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
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role`, `is_active`) VALUES (?, ?, ?, ?, ?, ?)",
        ["super_admin", sha256("admin123"), "admin@schoolgov.com", "System Super Administrator", "super_admin", 1]
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
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role`, `is_active`) VALUES (?, ?, ?, ?, ?, ?)",
        ["school_head", sha256("school123"), "schoolhead@schoolgov.com", "School Head (Mogoditshane)", "school_head", 1]
      );
    } else {
      await db.query(
        "INSERT INTO `users` (`username`, `password_hash`, `email`, `full_name`, `role`, `status`, `region`) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ["school_head", sha256("school123"), "schoolhead@schoolgov.com", "School Head (Mogoditshane)", "school_head", "Active", "South"]
      );
    }
  }
  console.log("Seeding and validation of default accounts complete.");
}
