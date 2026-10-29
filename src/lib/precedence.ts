import { ISafeUser, IUser } from "@/types";

/**
 * Checks whether an actor can assign a task to a target user.
 * Rules:
 * 1. Admin can assign to anyone.
 * 2. Any user can assign to themselves.
 * 3. Any user with level > target.level can assign to the target.
 * 4. Peers (equal level) and superiors (higher level) cannot be assigned tasks by this actor.
 */
export function canAssignTask(
  actor: { _id: string; level: number; role?: string },
  target: { _id: string; level: number }
): boolean {
  if (!actor || !target) return false;

  const actorId = actor._id.toString();
  const targetId = target._id.toString();

  // Self assignment is always allowed
  if (actorId === targetId) {
    return true;
  }

  // Admin has universal authority
  if (actor.role === "ADMIN") {
    return true;
  }

  // Precedence rule: actor level must be strictly greater than target level
  return Number(actor.level) > Number(target.level);
}

/**
 * Checks whether an actor can view/track a task assigned to target user.
 * Rules:
 * 1. Admin can view all tasks.
 * 2. User can view their own tasks.
 * 3. User can view tasks assigned to any subordinate (level < actor.level).
 */
export function canViewTask(
  actor: { _id: string; level: number; role?: string },
  target: { _id: string; level: number }
): boolean {
  if (!actor || !target) return false;

  const actorId = actor._id.toString();
  const targetId = target._id.toString();

  if (actor.role === "ADMIN" || actorId === targetId) {
    return true;
  }

  return Number(actor.level) > Number(target.level);
}

/**
 * Filters a list of all users down to only those eligible to be assigned a task by the actor.
 */
export function getEligibleAssignees<T extends { _id: string | any; level: number; role?: string; name: string }>(
  actor: { _id: string; level: number; role?: string },
  allUsers: T[]
): T[] {
  return allUsers
    .filter((user) =>
      canAssignTask(actor, {
        _id: user._id.toString(),
        level: user.level,
      })
    )
    .sort((a, b) => {
      // Sort by level descending, then name ascending
      if (b.level !== a.level) {
        return b.level - a.level;
      }
      return a.name.localeCompare(b.name);
    });
}
