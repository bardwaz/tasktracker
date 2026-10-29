import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { canAssignTask } from "@/lib/precedence";
import { ObjectId } from "mongodb";

// GET /api/tasks - List tasks visible to current user
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter"); // 'my' | 'subordinates' | 'all'
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    const db = await getDb();
    const usersCol = db.collection("users");
    const tasksCol = db.collection("tasks");

    // Fetch all users to lookup user levels and names
    const allUsers = await usersCol
      .find({}, { projection: { passwordHash: 0 } })
      .toArray();

    const userMap = new Map<string, any>();
    allUsers.forEach((u) => {
      userMap.set(u._id.toString(), {
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        level: u.level,
        title: u.title,
      });
    });

    let targetUserIds: string[] = [];

    if (session.role === "ADMIN") {
      if (filterType === "my") {
        targetUserIds = [session.userId];
      } else if (filterType === "subordinates") {
        targetUserIds = allUsers
          .filter((u) => u._id.toString() !== session.userId)
          .map((u) => u._id.toString());
      } else {
        // all
        targetUserIds = allUsers.map((u) => u._id.toString());
      }
    } else {
      // Member can see self + strictly lower levels
      const lowerLevelUsers = allUsers.filter(
        (u) => Number(u.level) < Number(session.level)
      );
      const lowerLevelIds = lowerLevelUsers.map((u) => u._id.toString());

      if (filterType === "my") {
        targetUserIds = [session.userId];
      } else if (filterType === "subordinates") {
        targetUserIds = lowerLevelIds;
      } else {
        targetUserIds = [session.userId, ...lowerLevelIds];
      }
    }

    const query: any = {
      assignedTo: { $in: targetUserIds },
    };

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (priority && priority !== "ALL") {
      query.priority = priority;
    }

    const rawTasks = await tasksCol
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const populatedTasks = rawTasks.map((t) => ({
      ...t,
      _id: t._id.toString(),
      assignedToUser: userMap.get(t.assignedTo) || {
        _id: t.assignedTo,
        name: "Unknown User",
        level: 0,
      },
      assignedByUser: userMap.get(t.assignedBy) || {
        _id: t.assignedBy,
        name: "Unknown User",
        level: 0,
      },
    }));

    return NextResponse.json({
      success: true,
      data: populatedTasks,
    });
  } catch (error: any) {
    console.error("Fetch tasks error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task with level precedence check
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, description, assignedTo, priority = "MEDIUM", dueDate } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Task title is required" },
        { status: 400 }
      );
    }

    const targetUserId = (assignedTo || session.userId).toString();
    if (!ObjectId.isValid(targetUserId)) {
      return NextResponse.json(
        { success: false, error: "Invalid assignedTo user ID" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const targetUser = await db.collection("users").findOne({
      _id: new ObjectId(targetUserId),
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Assigned user does not exist" },
        { status: 404 }
      );
    }

    // Verify level precedence rule:
    // Any person with a level > the level of X can assign tasks for X (or self-assign).
    const isAllowed = canAssignTask(
      {
        _id: session.userId,
        level: session.level,
        role: session.role,
      },
      {
        _id: targetUser._id.toString(),
        level: targetUser.level,
      }
    );

    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Precedence Violation: Your level (${session.level}) is not strictly higher than ${targetUser.name}'s level (${targetUser.level}). You can only assign tasks to yourself or people with a lower level.`,
        },
        { status: 403 }
      );
    }

    const newTask = {
      title: title.trim(),
      description: description ? description.trim() : "",
      status: "TODO",
      priority: ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)
        ? priority
        : "MEDIUM",
      assignedTo: targetUserId,
      assignedBy: session.userId,
      dueDate: dueDate || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("tasks").insertOne(newTask);

    return NextResponse.json({
      success: true,
      data: {
        ...newTask,
        _id: result.insertedId.toString(),
      },
      message: "Task assigned successfully",
    });
  } catch (error: any) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create task" },
      { status: 500 }
    );
  }
}
