import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// PATCH /api/admin/users/[id] - Update user level, title, name, or role
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updateFields: any = { updatedAt: new Date() };

    if (body.level !== undefined) {
      const numLevel = Number(body.level);
      if (isNaN(numLevel) || numLevel < 1) {
        return NextResponse.json(
          { success: false, error: "Level must be a positive number" },
          { status: 400 }
        );
      }
      updateFields.level = numLevel;
    }

    if (body.title !== undefined) updateFields.title = body.title.trim();
    if (body.name !== undefined) updateFields.name = body.name.trim();
    if (body.role !== undefined && ["ADMIN", "MEMBER"].includes(body.role)) {
      updateFields.role = body.role;
    }

    const db = await getDb();
    const result = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: "after", projection: { passwordHash: 0 } }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        _id: result._id.toString(),
      },
      message: "User updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete a user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid user ID" },
        { status: 400 }
      );
    }

    if (session.userId === id) {
      return NextResponse.json(
        { success: false, error: "Cannot delete the active administrator account" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User removed successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
