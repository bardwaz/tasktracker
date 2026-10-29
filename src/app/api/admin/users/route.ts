import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

// GET /api/admin/users - Admin only: List all users sorted by level descending
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const db = await getDb();
    const users = await db
      .collection("users")
      .find({}, { projection: { passwordHash: 0 } })
      .sort({ level: -1, name: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: users.map((u: any) => ({
        ...u,
        _id: u._id.toString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Admin only: Create a new user account
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Only Admin can create accounts" },
        { status: 403 }
      );
    }

    const { name, email, password, level, role = "MEMBER", title } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const numericLevel = Number(level);
    if (isNaN(numericLevel) || numericLevel < 1) {
      return NextResponse.json(
        { success: false, error: "Level must be a positive number" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.collection("users").findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: role === "ADMIN" ? "ADMIN" : "MEMBER",
      level: numericLevel,
      title: title ? title.trim() : `Level ${numericLevel} Contributor`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);

    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        level: newUser.level,
        title: newUser.title,
        createdAt: newUser.createdAt,
      },
      message: "User created successfully",
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
