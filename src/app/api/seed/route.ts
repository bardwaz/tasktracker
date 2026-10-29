import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const db = await getDb();
    const userCount = await db.collection("users").countDocuments();

    return NextResponse.json({
      success: true,
      hasAdmin: userCount > 0,
      userCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check database" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const db = await getDb();
    const usersCol = db.collection("users");

    const existingAdmin = await usersCol.findOne({ role: "ADMIN" });
    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: "Admin account already exists",
        adminEmail: existingAdmin.email,
      });
    }

    const email = process.env.ADMIN_EMAIL || "admin@tasktracker.local";
    const password = process.env.ADMIN_PASSWORD || "AdminPassword123!";
    const name = process.env.ADMIN_NAME || "Root Administrator";
    const level = Number(process.env.ADMIN_LEVEL) || 100;

    const passwordHash = await hashPassword(password);

    const result = await usersCol.insertOne({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "ADMIN",
      level,
      title: "Root Administrator",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Root Admin created successfully",
      adminEmail: email,
      level,
      id: result.insertedId,
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to seed admin" },
      { status: 500 }
    );
  }
}
