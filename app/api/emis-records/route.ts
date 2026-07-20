import { NextRequest, NextResponse } from "next/server";
import { getDbPool, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

// Seeder helper to populate database if schools are empty
async function seedDatabase(db: any) {
  try {
    console.log("Checking if seeding is required...");
    const [schoolsCount]: any = await db.query("SELECT COUNT(*) as count FROM schools");
    if (schoolsCount[0].count > 0) {
      console.log("Database already seeded with schools.");
      return;
    }

    console.log("Seeding EMIS Admin Demo Data...");

    // 1. Fetch valid reference options from reference_data
    const [schoolTypes]: any = await db.query("SELECT ref_id, value FROM reference_data WHERE category = 'school_type'");
    const [levels]: any = await db.query("SELECT ref_id, value FROM reference_data WHERE category = 'level'");
    const [regions]: any = await db.query("SELECT ref_id, value FROM reference_data WHERE category = 'region'");
    const [districts]: any = await db.query("SELECT ref_id, value FROM reference_data WHERE category = 'district'");
    const [subDistricts]: any = await db.query("SELECT ref_id, value FROM reference_data WHERE category = 'sub_district'");
    const [sexes]: any = await db.query("SELECT ref_id, value FROM reference_data WHERE category = 'sex'");
    const [enrolmentStatuses]: any = await db.query("SELECT ref_id, value FROM reference_data WHERE category = 'enrolment_status'");
    const [socialStatuses]: any = await db.query("SELECT ref_id, value FROM reference_data WHERE category = 'social_status'");
    const [contractTypes]: any = await db.query("SELECT ref_id, value FROM reference_data WHERE category = 'contract_type'");
    const [positions]: any = await db.query("SELECT ref_id, value FROM reference_data WHERE category = 'staff_position'");
    const [qualifications]: any = await db.query("SELECT ref_id, value FROM reference_data WHERE category = 'qualification'");
    const [grades]: any = await db.query("SELECT ref_id, value FROM reference_data WHERE category = 'grade'");

    // Fallbacks if tables are empty
    const tId = schoolTypes[0]?.ref_id || 1;
    const lId = levels[0]?.ref_id || 1;
    const gId = grades[0]?.ref_id || 1;
    const sexM = sexes.find((s: any) => s.value.toLowerCase().startsWith("m"))?.ref_id || 1;
    const sexF = sexes.find((s: any) => s.value.toLowerCase().startsWith("f"))?.ref_id || 2;
    const enId = enrolmentStatuses[0]?.ref_id || 1;
    const socId = socialStatuses[0]?.ref_id || 1;
    const conId = contractTypes[0]?.ref_id || 1;
    const posId = positions[0]?.ref_id || 1;
    const qualId = qualifications[0]?.ref_id || 1;

    // Create 10 demo schools, one for each region
    const demoSchools = [
      { name: "Gaborone Senior Secondary School", reg: "GSS-REG-101", region: "South East", type: "Government", level: "Senior", boarding: 1 },
      { name: "Maun Senior Secondary School", reg: "MSS-REG-202", region: "North West", type: "Government", level: "Senior", boarding: 1 },
      { name: "Francistown ECCE Centre", reg: "FEC-REG-303", region: "North East", type: "Private", level: "ECCE", boarding: 0 },
      { name: "Serowe Primary School", reg: "SPS-REG-404", region: "Central", type: "Government", level: "Primary", boarding: 0 },
      { name: "Kasane Junior Secondary School", reg: "KJS-REG-505", region: "Chobe", type: "Government", level: "Junior", boarding: 1 },
      { name: "Ghanzi Unified School", reg: "GUS-REG-606", region: "Gantsi", type: "Church", level: "Unified", boarding: 1 },
      { name: "Kang Boarding School", reg: "KBS-REG-707", region: "Kgalagadi", type: "Government", level: "Primary", boarding: 1 },
      { name: "Mochudi Primary School", reg: "MPS-REG-808", region: "Kgatleng", type: "Government", level: "Primary", boarding: 0 },
      { name: "Molepolole Junior Secondary School", reg: "MJS-REG-909", region: "Kweneng", type: "Government", level: "Junior", boarding: 0 },
      { name: "Lobatse Secondary School", reg: "LSS-REG-010", region: "South", type: "Private", level: "Senior", boarding: 0 }
    ];

    const insertedSchools: any[] = [];

    for (const sch of demoSchools) {
      // Find region_id
      const regionObj = regions.find((r: any) => r.value.toLowerCase() === sch.region.toLowerCase());
      const rId = regionObj?.ref_id || regions[0]?.ref_id || 1;

      // Find district_id
      const distObj = districts.find((d: any) => d.parent_ref_id === rId) || districts[0];
      const dId = distObj?.ref_id || 1;

      // Find sub_district_id
      const subDistObj = subDistricts.find((sd: any) => sd.parent_ref_id === dId) || subDistricts[0];
      const sdId = subDistObj?.ref_id || null;

      // Find type_id
      const typeObj = schoolTypes.find((t: any) => t.value.toLowerCase() === sch.type.toLowerCase());
      const typeId = typeObj?.ref_id || tId;

      // Find level_id
      const levelObj = levels.find((l: any) => l.value.toLowerCase() === sch.level.toLowerCase());
      const levelId = levelObj?.ref_id || lId;

      const [res]: any = await db.query(`
        INSERT INTO schools (name, registration_number, type_id, level_id, district_id, sub_district_id, region_id, boarding, shifting)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [sch.name, sch.reg, typeId, levelId, dId, sdId, rId, sch.boarding]);

      insertedSchools.push({
        id: res.insertId,
        name: sch.name,
        region_id: rId,
        regionName: sch.region,
        boarding: sch.boarding
      });
    }

    console.log(`Inserted ${insertedSchools.length} schools.`);

    // 2. Insert Staff members
    const firstNames = ["Kabo", "Lesedi", "Thabo", "Mpho", "Onkabetse", "Neo", "Boago", "Tshepo", "Dineo", "Olebile", "Gaone", "Puso"];
    const surnames = ["Letsholo", "Sebele", "Mokgosi", "Gaseitsiwe", "Kelegetse", "Molefe", "Tau", "Ntuane", "Gaborone", "Phiri", "Balopi"];

    for (let i = 0; i < 15; i++) {
      const schIdx = i % insertedSchools.length;
      const school = insertedSchools[schIdx];
      const fname = firstNames[i % firstNames.length];
      const sname = surnames[i % surnames.length];
      const isFemale = i % 2 === 0;

      await db.query(`
        INSERT INTO staff (school_id, national_id_passport, surname, first_names, other_names, date_of_birth, sex_id, nationality_id, staff_type, contract_type_id, staff_position_id, qualification_id, date_of_first_appointment, date_joined_school, on_study_leave, is_current_employee, academic_year_id)
        VALUES (?, ?, ?, ?, '', '1985-05-12', ?, 1, 'TEACHING', ?, ?, ?, '2010-01-10', '2018-06-01', 0, 1, 2)
      `, [
        school.id,
        `NID-${100000 + i}`,
        sname,
        fname,
        isFemale ? sexF : sexM,
        conId,
        posId,
        qualId
      ]);
    }

    console.log("Seeded staff records.");

    // 3. Insert Student records
    const sFirstNames = ["Ketsile", "Galeboe", "Lorato", "Oarabile", "Kelebogile", "Tebogo", "Modiri", "Keneilwe", "Amogelang", "Katlego", "Lefika"];
    const sSurnames = ["Pilane", "Tshosa", "Chibana", "Moruti", "Nthobelang", "Sekgoma", "Mosojane", "Raditladi", "Pheto", "Kgama"];

    for (let i = 0; i < 25; i++) {
      const schIdx = i % insertedSchools.length;
      const school = insertedSchools[schIdx];
      const fname = sFirstNames[i % sFirstNames.length];
      const sname = sSurnames[i % sSurnames.length];
      const isFemale = i % 2 === 0;

      await db.query(`
        INSERT INTO students (school_id, national_id_passport, surname, first_names, other_names, date_of_birth, sex_id, nationality_id, grade_level_id, enrolment_status_id, social_status_id, is_boarding, is_shifting, is_enrolled, academic_year_id)
        VALUES (?, ?, ?, ?, '', '2012-08-15', ?, 1, ?, ?, ?, ?, 0, 1, 2)
      `, [
        school.id,
        `STUD-${200000 + i}`,
        sname,
        fname,
        isFemale ? sexF : sexM,
        gId,
        enId,
        socId,
        school.boarding
      ]);
    }

    console.log("Seeded student records.");

    // 4. Seed school sections for progress monitoring (completion indicators)
    // We want some schools to have completed everything (100%), some 75%, some 50%, some 0%
    for (let idx = 0; idx < insertedSchools.length; idx++) {
      const school = insertedSchools[idx];
      
      // Let's seed based on school index to create visual completion diversity
      if (idx === 0 || idx === 1) {
        // 100% Completion: Facilities, Furniture, Equipment, Policies
        await db.query("INSERT INTO school_facilities (school_id, facility_type, quantity, academic_year_id) VALUES (?, 'Classroom', 12, 2)", [school.id]);
        await db.query("INSERT INTO school_furniture (school_id, furniture_type, quantity, academic_year_id) VALUES (?, 'Desk', 240, 2)", [school.id]);
        await db.query("INSERT INTO school_equipment (school_id, equipment_category, equipment_sub_type, quantity, academic_year_id) VALUES (?, 'ICT', 'Laptop', 15, 2)", [school.id]);
        await db.query("INSERT INTO school_policies (school_id, policy_category, policy_name, is_available, shared_with, academic_year_id) VALUES (?, 'Safety', 'Fire Safety Guideline', 1, 'All', 2)", [school.id]);
      } 
      else if (idx === 2 || idx === 3 || idx === 4) {
        // 75% Completion: Facilities, Furniture, Equipment
        await db.query("INSERT INTO school_facilities (school_id, facility_type, quantity, academic_year_id) VALUES (?, 'Classroom', 8, 2)", [school.id]);
        await db.query("INSERT INTO school_furniture (school_id, furniture_type, quantity, academic_year_id) VALUES (?, 'Chair', 180, 2)", [school.id]);
        await db.query("INSERT INTO school_equipment (school_id, equipment_category, equipment_sub_type, quantity, academic_year_id) VALUES (?, 'Laboratory', 'Microscope', 5, 2)", [school.id]);
      }
      else if (idx === 5 || idx === 6 || idx === 7) {
        // 50% Completion: Facilities, Furniture
        await db.query("INSERT INTO school_facilities (school_id, facility_type, quantity, academic_year_id) VALUES (?, 'Classroom', 6, 2)", [school.id]);
        await db.query("INSERT INTO school_furniture (school_id, furniture_type, quantity, academic_year_id) VALUES (?, 'Desk', 60, 2)", [school.id]);
      }
      // Schools 8 and 9 are at 0% - no records seeded in the sub-tables
    }

    console.log("Seeding of EMIS data completed successfully!");

  } catch (error) {
    console.error("Error in seeding database:", error);
  }
}

export async function GET(req: NextRequest) {
  try {
    await initializeDatabase();
    const db = getDbPool();

    // Trigger seeding if empty
    await seedDatabase(db);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // 'schools' | 'students' | 'staff' | 'progress'
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const regionFilter = searchParams.get("region") || "All";
    const subTypeFilter = searchParams.get("subType") || ""; // ECCE, Primary, etc.

    const offset = (page - 1) * limit;

    if (type === "students") {
      let query = `
        SELECT s.*, sch.name as school_name, r.value as region_name, g.value as grade_name, sex.value as sex_name
        FROM students s
        LEFT JOIN schools sch ON s.school_id = sch.school_id
        LEFT JOIN reference_data r ON sch.region_id = r.ref_id
        LEFT JOIN reference_data g ON s.grade_level_id = g.ref_id
        LEFT JOIN reference_data sex ON s.sex_id = sex.ref_id
        WHERE s.deleted_at IS NULL
      `;
      const params: any[] = [];

      if (search) {
        query += " AND (s.first_names LIKE ? OR s.surname LIKE ? OR s.national_id_passport LIKE ?)";
        const like = `%${search}%`;
        params.push(like, like, like);
      }

      if (regionFilter && regionFilter !== "All") {
        query += " AND r.value = ?";
        params.push(regionFilter);
      }

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) t`;
      const [countRows]: any = await db.query(countQuery, params);
      const total = countRows[0]?.total || 0;

      query += " ORDER BY s.surname ASC, s.first_names ASC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const [rows]: any = await db.query(query, params);

      return NextResponse.json({
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    if (type === "staff") {
      let query = `
        SELECT sf.*, sch.name as school_name, r.value as region_name, pos.value as position_name, sex.value as sex_name
        FROM staff sf
        LEFT JOIN schools sch ON sf.school_id = sch.school_id
        LEFT JOIN reference_data r ON sch.region_id = r.ref_id
        LEFT JOIN reference_data pos ON sf.staff_position_id = pos.ref_id
        LEFT JOIN reference_data sex ON sf.sex_id = sex.ref_id
        WHERE sf.deleted_at IS NULL
      `;
      const params: any[] = [];

      if (search) {
        query += " AND (sf.first_names LIKE ? OR sf.surname LIKE ? OR sf.national_id_passport LIKE ?)";
        const like = `%${search}%`;
        params.push(like, like, like);
      }

      if (regionFilter && regionFilter !== "All") {
        query += " AND r.value = ?";
        params.push(regionFilter);
      }

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM (${query}) t`;
      const [countRows]: any = await db.query(countQuery, params);
      const total = countRows[0]?.total || 0;

      query += " ORDER BY sf.surname ASC, sf.first_names ASC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const [rows]: any = await db.query(query, params);

      return NextResponse.json({
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    if (type === "schools") {
      let query = `
        SELECT sch.*, r.value as region_name, l.value as level_name, t.value as type_name,
               (SELECT COUNT(*) FROM students WHERE school_id = sch.school_id AND deleted_at IS NULL) as student_count,
               (SELECT COUNT(*) FROM staff WHERE school_id = sch.school_id AND deleted_at IS NULL) as staff_count
        FROM schools sch
        LEFT JOIN reference_data r ON sch.region_id = r.ref_id
        LEFT JOIN reference_data l ON sch.level_id = l.ref_id
        LEFT JOIN reference_data t ON sch.type_id = t.ref_id
        WHERE sch.deleted_at IS NULL
      `;
      const params: any[] = [];

      if (search) {
        query += " AND (sch.name LIKE ? OR sch.registration_number LIKE ?)";
        const like = `%${search}%`;
        params.push(like, like);
      }

      if (regionFilter && regionFilter !== "All") {
        query += " AND r.value = ?";
        params.push(regionFilter);
      }

      if (subTypeFilter) {
        query += " AND l.value = ?";
        params.push(subTypeFilter);
      }

      const countQuery = `SELECT COUNT(*) as total FROM (${query}) t`;
      const [countRows]: any = await db.query(countQuery, params);
      const total = countRows[0]?.total || 0;

      query += " ORDER BY sch.name ASC LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const [rows]: any = await db.query(query, params);

      return NextResponse.json({
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    if (type === "progress") {
      // Calculate data collection progress per school
      // Checked across 4 tables: school_facilities, school_furniture, school_equipment, school_policies
      // Each section is worth 25%
      const [schools]: any = await db.query(`
        SELECT sch.school_id, sch.name, r.value as region, l.value as level, t.value as type,
               IF((SELECT COUNT(*) FROM school_facilities WHERE school_id = sch.school_id) > 0, 25, 0) as facilities_pct,
               IF((SELECT COUNT(*) FROM school_furniture WHERE school_id = sch.school_id) > 0, 25, 0) as furniture_pct,
               IF((SELECT COUNT(*) FROM school_equipment WHERE school_id = sch.school_id) > 0, 25, 0) as equipment_pct,
               IF((SELECT COUNT(*) FROM school_policies WHERE school_id = sch.school_id) > 0, 25, 0) as policies_pct
        FROM schools sch
        LEFT JOIN reference_data r ON sch.region_id = r.ref_id
        LEFT JOIN reference_data l ON sch.level_id = l.ref_id
        LEFT JOIN reference_data t ON sch.type_id = t.ref_id
        WHERE sch.deleted_at IS NULL
      `);

      const schoolsWithProgress = schools.map((sch: any) => {
        const total = sch.facilities_pct + sch.furniture_pct + sch.equipment_pct + sch.policies_pct;
        return {
          ...sch,
          completion_percentage: total,
          status: total === 100 ? "Completed" : total > 0 ? "In Progress" : "Not Started"
        };
      });

      // Group by region to get region-wise percentages
      const regionMap: Record<string, { total: number, count: number }> = {};
      schoolsWithProgress.forEach((sch: any) => {
        const reg = sch.region || "Unknown";
        if (!regionMap[reg]) regionMap[reg] = { total: 0, count: 0 };
        regionMap[reg].total += sch.completion_percentage;
        regionMap[reg].count += 1;
      });

      const regionalProgress = Object.entries(regionMap).map(([name, val]) => ({
        region: name,
        completion_percentage: Math.round(val.total / val.count),
        school_count: val.count
      }));

      return NextResponse.json({
        success: true,
        schools: schoolsWithProgress,
        regions: regionalProgress
      });
    }

    return NextResponse.json({ success: false, error: "Invalid type parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("EMIS records GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
