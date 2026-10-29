import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// PATCH /api/tasks/[id] - Update task status or details
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid task ID" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const existingTask = await db.collection("tasks").findOne({
      _id: new ObjectId(id),
    });

    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Permission check:
    // Can edit if:
    // 1. Admin
    // 2. Assigned to current user
    // 3. Assigned by current user
    // 4. Current user has higher level than the assigned user
    const targetUser = await db.collection("users").findOne({
      _id: new ObjectId(existingTask.assignedTo),
    });

    const isAssignedToMe = existingTask.assignedTo === session.userId;
    const isAssignedByMe = existingTask.assignedBy === session.userId;
    const isAdmin = session.role === "ADMIN";
    const isSuperior =
      targetUser && Number(session.level) > Number(targetUser.level);

    if (!isAdmin && !isAssignedToMe && !isAssignedByMe && !isSuperior) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to update this task" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updateFields: any = { updatedAt: new Date() };

    if (body.status && ["TODO", "IN_PROGRESS", "COMPLETED"].includes(body.status)) {
      updateFields.status = body.status;
    }

    if (body.priority && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(body.priority)) {
      updateFields.priority = body.priority;
    }

    if (body.title) updateFields.title = body.title.trim();
    if (body.description !== undefined) updateFields.description = body.description.trim();
    if (body.dueDate !== undefined) updateFields.dueDate = body.dueDate;

    const result = await db.collection("tasks").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        _id: result?._id.toString(),
      },
      message: "Task updated",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Remove task
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid task ID" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const task = await db.collection("tasks").findOne({ _id: new ObjectId(id) });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Only Admin or the creator can delete
    if (session.role !== "ADMIN" && task.assignedBy !== session.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only creator or Admin can delete tasks" },
        { status: 403 }
      );
    }

    await db.collection("tasks").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete task" },
      { status: 500 }
    );
  }
}
