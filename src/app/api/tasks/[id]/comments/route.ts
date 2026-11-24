import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { ITaskComment } from "@/types";

// GET /api/tasks/[id]/comments - Get all comments for a task
export async function GET(
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

    return NextResponse.json({
      success: true,
      data: task.comments || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/comments - Add a new comment to a task
export async function POST(
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

    const body = await req.json();
    const text = (body.text || "").trim();
    const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];

    if (!text && rawAttachments.length === 0) {
      return NextResponse.json(
        { success: false, error: "Comment text or file attachment is required" },
        { status: 400 }
      );
    }

    if (text.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Comment exceeds maximum limit of 2,000 characters" },
        { status: 400 }
      );
    }

    // Limit maximum attachments per comment to 5
    if (rawAttachments.length > 5) {
      return NextResponse.json(
        { success: false, error: "Maximum 5 attachments allowed per comment" },
        { status: 400 }
      );
    }

    const sanitizedAttachments = rawAttachments.map((a: any) => ({
      name: String(a.name || "attachment").slice(0, 120),
      size: Number(a.size) || 0,
      type: String(a.type || "application/octet-stream"),
      dataUrl: String(a.dataUrl || ""),
    })).filter((a: any) => Boolean(a.dataUrl));

    const db = await getDb();
    const task = await db.collection("tasks").findOne({ _id: new ObjectId(id) });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const newComment: ITaskComment = {
      _id: new ObjectId().toString(),
      userId: session.userId,
      userName: session.name || "User",
      userLevel: Number(session.level) || 0,
      text,
      attachments: sanitizedAttachments.length > 0 ? sanitizedAttachments : undefined,
      createdAt: new Date().toISOString(),
    };

    await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { comments: newComment } as any,
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      success: true,
      data: newComment,
      message: "Comment posted",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add comment" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id]/comments?commentId=xxx - Remove comment
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
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid task ID" },
        { status: 400 }
      );
    }

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: "commentId query param required" },
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

    const existingComment = (task.comments || []).find(
      (c: any) => c._id === commentId
    );

    if (!existingComment) {
      return NextResponse.json(
        { success: false, error: "Comment not found" },
        { status: 404 }
      );
    }

    // Permission: Only author or ADMIN can delete
    if (session.role !== "ADMIN" && existingComment.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You can only delete your own comments" },
        { status: 403 }
      );
    }

    await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { comments: { _id: commentId } } as any,
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Comment deleted",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete comment" },
      { status: 500 }
    );
  }
}
