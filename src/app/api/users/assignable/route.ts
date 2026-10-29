import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getEligibleAssignees } from "@/lib/precedence";

// GET /api/users/assignable - Returns users the current user can assign tasks to
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const db = await getDb();
    const allUsers = await db
      .collection("users")
      .find({}, { projection: { passwordHash: 0 } })
      .toArray();

    const formattedUsers = allUsers.map((u) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      level: u.level,
      title: u.title,
    }));

    const eligible = getEligibleAssignees(
      {
        _id: session.userId,
        level: session.level,
        role: session.role,
      },
      formattedUsers
    );

    return NextResponse.json({
      success: true,
      data: eligible,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load assignable users" },
      { status: 500 }
    );
  }
}
