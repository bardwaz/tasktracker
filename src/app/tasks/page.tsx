"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ISafeUser, ITask, TaskPriority, TaskStatus } from "@/types";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  Calendar,
  User as UserIcon,
  Layers,
  ArrowRight,
  Trash2,
  CheckSquare,
  Shield,
} from "lucide-react";

export default function TasksPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<ISafeUser | null>(null);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<ISafeUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [tab, setTab] = useState<"all" | "my" | "subordinates">("all");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Task Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSessionAndData = async () => {
    try {
      setLoading(true);

      // 1. Session check
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();

      if (!meRes.ok || !meData.success) {
        router.push("/login");
        return;
      }

      const user = meData.data.user;
      setCurrentUser(user);

      // 2. Load Assignable Users (level < user.level or self)
      const assignableRes = await fetch("/api/users/assignable");
      const assignableData = await assignableRes.json();
      if (assignableRes.ok && assignableData.success) {
        setAssignableUsers(assignableData.data);
        if (!assignedTo && assignableData.data.length > 0) {
          setAssignedTo(user._id); // default to self
        }
      }

      // 3. Load Tasks
      await fetchTasks(tab, statusFilter, priorityFilter);
    } catch (err) {
      console.error("Failed to load page data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (
    currentTab: string,
    currentStatus: string,
    currentPriority: string
  ) => {
    try {
      const params = new URLSearchParams();
      if (currentTab !== "all") params.append("filter", currentTab);
      if (currentStatus !== "ALL") params.append("status", currentStatus);
      if (currentPriority !== "ALL") params.append("priority", currentPriority);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTasks(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  };

  useEffect(() => {
    fetchSessionAndData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTasks(tab, statusFilter, priorityFilter);
    }
  }, [tab, statusFilter, priorityFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          assignedTo: assignedTo || currentUser?._id,
          priority,
          dueDate: dueDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create task");
      }

      // Reset
      setTaskTitle("");
      setTaskDesc("");
      setDueDate("");
      setPriority("MEDIUM");
      setShowCreateModal(false);

      // Refresh tasks
      fetchTasks(tab, statusFilter, priorityFilter);
    } catch (err: any) {
      setFormError(err.message || "Failed to assign task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter tasks by keyword search
  const filteredTasks = tasks.filter((task) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = task.title.toLowerCase().includes(query);
    const descMatch = (task.description || "").toLowerCase().includes(query);
    const assigneeMatch = (task.assignedToUser?.name || "").toLowerCase().includes(query);
    const assignerMatch = (task.assignedByUser?.name || "").toLowerCase().includes(query);
    return titleMatch || descMatch || assigneeMatch || assignerMatch;
  });

  const myTasksCount = tasks.filter((t) => t.assignedTo === currentUser._id).length;
  const subordinateTasksCount = tasks.filter((t) => t.assignedTo !== currentUser._id).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar user={currentUser} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header and Quick Stats */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Task Management</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                Level {currentUser.level}
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track tasks assigned to you and delegate work to your subordinates (members with Level &lt; {currentUser.level}).
            </p>
          </div>

          <button
            onClick={() => {
              setAssignedTo(currentUser._id);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Assign New Task</span>
          </button>
        </div>

        {/* View Tabs & Search Bar */}
        <div className="my-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center space-x-2 bg-slate-200/70 p-1 rounded-xl w-fit">
            <button
              onClick={() => setTab("all")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === "all"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Visible ({tasks.length})
            </button>
            <button
              onClick={() => setTab("my")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === "my"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              My Tasks ({myTasksCount})
            </button>
            <button
              onClick={() => setTab("subordinates")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                tab === "subordinates"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Subordinates' Tasks ({subordinateTasksCount})
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks or assignees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center my-6">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No tasks found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {tasks.length === 0
                ? "No tasks have been assigned yet. Use the 'Assign New Task' button to delegate work."
                : "No tasks match your selected filter criteria."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTasks.map((task) => {
              const isAssignedToMe = task.assignedTo === currentUser._id;
              const isAssignedByMe = task.assignedBy === currentUser._id;
              const canDelete = currentUser.role === "ADMIN" || isAssignedByMe;

              return (
                <div
                  key={task._id}
                  className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-5">
                    {/* Priority & Status Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            task.priority === "URGENT"
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : task.priority === "HIGH"
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : task.priority === "MEDIUM"
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {task.priority}
                        </span>

                        {task.whatsappNotified && (
                          <span
                            title="WhatsApp alert dispatched"
                            className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center space-x-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>WhatsApp</span>
                          </span>
                        )}
                      </div>

                      {/* Status Dropdown/Selector */}
                      <select
                        value={task.status}
                        onChange={(e) =>
                          handleUpdateStatus(task._id!, e.target.value as TaskStatus)
                        }
                        className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-colors cursor-pointer ${
                          task.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : task.status === "IN_PROGRESS"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-900 leading-snug mb-2">
                      {task.title}
                    </h3>

                    {/* Description */}
                    {task.description && (
                      <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Due Date if present */}
                    {task.dueDate && (
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 mb-4">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Assignee & Assigner Info */}
                  <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-1.5 font-medium text-slate-800">
                        <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>
                          {isAssignedToMe
                            ? "Assigned to You"
                            : task.assignedToUser?.name || "Unassigned"}
                        </span>
                        {task.assignedToUser?.level !== undefined && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                            L{task.assignedToUser.level}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        By: {isAssignedByMe ? "You" : task.assignedByUser?.name || "Admin"}
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDeleteTask(task._id!)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Plus className="w-4 h-4" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Assign New Task</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              {formError && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Implement user authentication flow"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assignee (Strict Precedence) *
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                  >
                    {assignableUsers.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user._id === currentUser._id
                          ? `Assign to Myself (Level ${user.level})`
                          : `${user.name} — Level ${user.level} (${user.title || "Member"})`}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    By precedence rule, only members with Level &lt; {currentUser.level} (or yourself) can be selected.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Provide details, acceptance criteria, or context..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {submitting ? "Assigning..." : "Assign Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
