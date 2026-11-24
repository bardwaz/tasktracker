export type UserRole = 'ADMIN' | 'MEMBER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  level: number;
  title?: string;
  phone?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IUserTaskStats {
  assigned: number;
  completed: number;
  inProgress: number;
  todo: number;
}

export interface ISafeUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  level: number;
  title?: string;
  phone?: string;
  taskStats?: IUserTaskStats;
  createdAt?: string | Date;
}

export interface ITaskAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface ITaskComment {
  _id: string;
  userId: string;
  userName: string;
  userLevel: number;
  text: string;
  attachments?: ITaskAttachment[];
  createdAt: string | Date;
}

export interface ITask {
  _id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string; // User ID
  assignedBy: string; // User ID
  dueDate?: string;
  whatsappNotified?: boolean;
  comments?: ITaskComment[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  // Populated fields for UI
  assignedToUser?: ISafeUser;
  assignedByUser?: ISafeUser;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  level: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
