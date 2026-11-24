"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ISafeUser, ITask, ITaskComment, ITaskAttachment, TaskPriority, TaskStatus } from "@/types";
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
  MessageSquare,
  Send,
  X,
  MessageCircle,
  Paperclip,
  FileText,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { showPWANotification } from "@/lib/notifications";

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

  // Task Discussion & Comments States
  const [activeDiscussionTask, setActiveDiscussionTask] = useState<ITask | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [selectedAttachments, setSelectedAttachments] = useState<ITaskAttachment[]>([]);
  const [postingComment, setPostingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Scroll to bottom of comments when discussion task changes or comments update
  useEffect(() => {
    if (activeDiscussionTask && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeDiscussionTask?.comments]);

  const openDiscussion = async (task: ITask) => {
    setActiveDiscussionTask(task);
    setCommentInput("");
    setSelectedAttachments([]);
    setCommentError(null);
    setLoadingComments(true);

    try {
      const res = await fetch(`/api/tasks/${task._id}/comments`);
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedTask = { ...task, comments: data.data };
        setActiveDiscussionTask(updatedTask);
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? { ...t, comments: data.data } : t))
        );
      }
    } catch (err) {
      console.error("Failed to refresh comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (selectedAttachments.length + files.length > 5) {
      setCommentError("Maximum 5 file attachments allowed per comment.");
      return;
    }

    setCommentError(null);

    Array.from(files).forEach((file) => {
      // 3MB per file limit to ensure high performance
      if (file.size > 3 * 1024 * 1024) {
        setCommentError(`File "${file.name}" exceeds the 3MB upload limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setSelectedAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            dataUrl,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setSelectedAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePostComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = commentInput.trim();
    if ((!trimmed && selectedAttachments.length === 0) || !activeDiscussionTask || postingComment) return;

    setPostingComment(true);
    setCommentError(null);

    try {
      const res = await fetch(`/api/tasks/${activeDiscussionTask._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          attachments: selectedAttachments,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to post comment");
      }

      const newComment: ITaskComment = data.data;
      const updatedComments = [...(activeDiscussionTask.comments || []), newComment];

      setActiveDiscussionTask((prev) =>
        prev ? { ...prev, comments: updatedComments } : null
      );

      setTasks((prev) =>
        prev.map((t) =>
          t._id === activeDiscussionTask._id
            ? { ...t, comments: updatedComments }
            : t
        )
      );

      setCommentInput("");
      setSelectedAttachments([]);

      // PWA Notification trigger
      showPWANotification(`💬 Comment on: ${activeDiscussionTask.title}`, {
        body: `${currentUser?.name}: ${trimmed || (selectedAttachments.length + " attachment(s)")}`,
      });
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!activeDiscussionTask || !confirm("Delete this comment?")) return;

    try {
      const res = await fetch(
        `/api/tasks/${activeDiscussionTask._id}/comments?commentId=${commentId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedComments = (activeDiscussionTask.comments || []).filter(
          (c) => c._id !== commentId
        );

        setActiveDiscussionTask((prev) =>
          prev ? { ...prev, comments: updatedComments } : null
        );

        setTasks((prev) =>
          prev.map((t) =>
            t._id === activeDiscussionTask._id
              ? { ...t, comments: updatedComments }
              : t
          )
        );
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

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

      // PWA Notification trigger
      showPWANotification("📋 Task Assigned Successfully!", {
        body: `"${taskTitle}" has been dispatched with priority ${priority}.`,
      });
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
        if (activeDiscussionTask?._id === taskId) {
          setActiveDiscussionTask((prev) =>
            prev ? { ...prev, status: newStatus } : null
          );
        }
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
        if (activeDiscussionTask?._id === taskId) {
          setActiveDiscussionTask(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const formatCommentTime = (dateInput?: string | Date) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 30) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
              const commentCount = task.comments?.length || 0;

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

                  {/* Card Footer: Assignee & Assigner Info + Comments Button */}
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

                    <div className="flex items-center space-x-2">
                      {/* Comment Window Trigger */}
                      <button
                        onClick={() => openDiscussion(task)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          commentCount > 0
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                        title="Open task comments & discussion"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                        {commentCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                            {commentCount}
                          </span>
                        )}
                      </button>

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
                </div>
              );
            })}
          </div>
        )}

        {/* Task Discussion & Comments Window Modal */}
        {activeDiscussionTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col h-[85vh] max-h-[720px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex flex-col gap-2 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5">
                      <MessageSquare className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            activeDiscussionTask.priority === "URGENT"
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : activeDiscussionTask.priority === "HIGH"
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : activeDiscussionTask.priority === "MEDIUM"
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {activeDiscussionTask.priority}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            activeDiscussionTask.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : activeDiscussionTask.status === "IN_PROGRESS"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {activeDiscussionTask.status === "IN_PROGRESS"
                            ? "In Progress"
                            : activeDiscussionTask.status === "COMPLETED"
                            ? "Completed"
                            : "To Do"}
                        </span>
                        {activeDiscussionTask.dueDate && (
                          <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Due {new Date(activeDiscussionTask.dueDate).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
                        {activeDiscussionTask.title}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveDiscussionTask(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    title="Close discussion"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Task Context Banner */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-600 flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-400">Assignee:</span>
                      <strong className="text-slate-800">
                        {activeDiscussionTask.assignedToUser?.name || "Unassigned"}
                      </strong>
                      {activeDiscussionTask.assignedToUser?.level !== undefined && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          L{activeDiscussionTask.assignedToUser.level}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-400">Created by:</span>
                      <strong className="text-slate-800">
                        {activeDiscussionTask.assignedByUser?.name || "Admin"}
                      </strong>
                      {activeDiscussionTask.assignedByUser?.level !== undefined && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          L{activeDiscussionTask.assignedByUser.level}
                        </span>
                      )}
                    </div>
                  </div>

                  {activeDiscussionTask.description && (
                    <div className="pt-1.5 border-t border-slate-200/60 text-slate-600 line-clamp-2">
                      <span className="text-slate-400 font-medium">Details: </span>
                      {activeDiscussionTask.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Discussion Thread Feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/70">
                {loadingComments ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2" />
                    <span>Loading discussion thread...</span>
                  </div>
                ) : !activeDiscussionTask.comments || activeDiscussionTask.comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <MessageCircle className="w-12 h-12 text-slate-300 mb-2 stroke-1" />
                    <h4 className="text-sm font-semibold text-slate-700">No comments yet</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Start the conversation here to post status updates, ask questions, or coordinate with the team.
                    </p>
                  </div>
                ) : (
                  activeDiscussionTask.comments.map((comment) => {
                    const isMe = comment.userId === currentUser._id;
                    const canDelete = isMe || currentUser.role === "ADMIN";

                    return (
                      <div
                        key={comment._id}
                        className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${
                            isMe
                              ? "bg-indigo-600 text-white"
                              : "bg-white text-slate-700 border border-slate-200"
                          }`}
                          title={comment.userName}
                        >
                          {getInitials(comment.userName)}
                        </div>

                        {/* Comment Bubble */}
                        <div
                          className={`max-w-[80%] rounded-2xl p-3 shadow-2xs group relative ${
                            isMe
                              ? "bg-indigo-600 text-white rounded-tr-xs"
                              : "bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs"
                          }`}
                        >
                          {/* Author Header */}
                          <div
                            className={`flex items-center space-x-2 text-[11px] mb-1 font-medium ${
                              isMe ? "text-indigo-100 justify-end" : "text-slate-500"
                            }`}
                          >
                            <span className="font-semibold">{isMe ? "You" : comment.userName}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                isMe
                                  ? "bg-indigo-700 text-indigo-100"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              L{comment.userLevel}
                            </span>
                            <span className="text-[10px] opacity-75">
                              {formatCommentTime(comment.createdAt)}
                            </span>

                            {canDelete && (
                              <button
                                onClick={() => handleDeleteComment(comment._id)}
                                className={`opacity-0 group-hover:opacity-100 transition p-0.5 rounded ${
                                  isMe
                                    ? "hover:bg-indigo-700 text-indigo-200 hover:text-white"
                                    : "hover:bg-slate-100 text-slate-400 hover:text-rose-600"
                                }`}
                                title="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Message Body */}
                          {comment.text && (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                              {comment.text}
                            </p>
                          )}

                          {/* File Attachments */}
                          {comment.attachments && comment.attachments.length > 0 && (
                            <div className="mt-2.5 space-y-2">
                              {comment.attachments.map((att, attIdx) => {
                                const isImg = att.type?.startsWith("image/");
                                return (
                                  <div key={attIdx} className="overflow-hidden rounded-lg">
                                    {isImg ? (
                                      <div className="flex flex-col gap-1">
                                        <a
                                          href={att.dataUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="block overflow-hidden rounded-lg border border-black/10 bg-black/5"
                                        >
                                          <img
                                            src={att.dataUrl}
                                            alt={att.name}
                                            className="max-h-56 max-w-full rounded-lg object-contain hover:opacity-95 transition"
                                          />
                                        </a>
                                        <div className="flex items-center justify-between text-[10px] px-1 opacity-80">
                                          <span className="truncate max-w-[160px]">{att.name}</span>
                                          <a
                                            href={att.dataUrl}
                                            download={att.name}
                                            className="flex items-center space-x-0.5 hover:underline font-semibold"
                                          >
                                            <Download className="w-3 h-3" />
                                            <span>{formatFileSize(att.size)}</span>
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <a
                                        href={att.dataUrl}
                                        download={att.name}
                                        className={`flex items-center space-x-2.5 p-2 rounded-lg text-xs font-medium border transition ${
                                          isMe
                                            ? "bg-indigo-700/60 hover:bg-indigo-700 text-white border-indigo-500"
                                            : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                                        }`}
                                      >
                                        <FileText className="w-4 h-4 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="truncate font-semibold text-[11px]">{att.name}</div>
                                          <div className="text-[10px] opacity-75">{formatFileSize(att.size)}</div>
                                        </div>
                                        <Download className="w-3.5 h-3.5 shrink-0" />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Modal Footer: Comment Input Box */}
              <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
                {commentError && (
                  <div className="mb-2 p-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{commentError}</span>
                  </div>
                )}

                {/* Selected Attachments Preview Chips */}
                {selectedAttachments.length > 0 && (
                  <div className="mb-2.5 flex items-center flex-wrap gap-1.5">
                    {selectedAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-xs shadow-2xs"
                      >
                        {att.type.startsWith("image/") ? (
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                        <span className="truncate max-w-[130px] font-medium">{att.name}</span>
                        <span className="text-[10px] text-indigo-500 font-bold">({formatFileSize(att.size)})</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="text-indigo-400 hover:text-indigo-700 p-0.5 rounded transition"
                          title="Remove attachment"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handlePostComment} className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      rows={2}
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handlePostComment();
                        }
                      }}
                      placeholder="Write a comment or update... (Press Enter to send, Shift+Enter for new line)"
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none bg-slate-50 focus:bg-white transition"
                    />
                  </div>

                  {/* Attachment Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition shrink-0 h-10 flex items-center justify-center"
                    title="Attach files (images, PDFs, documents up to 3MB)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <button
                    type="submit"
                    disabled={postingComment || (!commentInput.trim() && selectedAttachments.length === 0)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1.5 shrink-0 h-10"
                  >
                    {postingComment ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
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
