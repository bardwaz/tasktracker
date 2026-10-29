import test from "node:test";
import assert from "node:assert";

// Simplified logic mirror or dynamic import
function canAssignTask(actor, target) {
  if (!actor || !target) return false;
  const actorId = actor._id.toString();
  const targetId = target._id.toString();
  if (actorId === targetId) return true;
  if (actor.role === "ADMIN") return true;
  return Number(actor.level) > Number(target.level);
}

function canViewTask(actor, target) {
  if (!actor || !target) return false;
  const actorId = actor._id.toString();
  const targetId = target._id.toString();
  if (actor.role === "ADMIN" || actorId === targetId) return true;
  return Number(actor.level) > Number(target.level);
}

test("Level precedence rules for task assignment", () => {
  const admin = { _id: "1", level: 100, role: "ADMIN" };
  const manager = { _id: "2", level: 50, role: "MEMBER" };
  const senior = { _id: "3", level: 30, role: "MEMBER" };
  const peer = { _id: "4", level: 30, role: "MEMBER" };
  const junior = { _id: "5", level: 10, role: "MEMBER" };

  // 1. Admin can assign to anyone
  assert.strictEqual(canAssignTask(admin, manager), true);
  assert.strictEqual(canAssignTask(admin, junior), true);

  // 2. Manager (50) can assign to Senior (30) and Junior (10)
  assert.strictEqual(canAssignTask(manager, senior), true);
  assert.strictEqual(canAssignTask(manager, junior), true);

  // 3. Manager (50) CANNOT assign to Admin (100)
  assert.strictEqual(canAssignTask(manager, admin), false);

  // 4. Senior (30) cannot assign to Peer (30)
  assert.strictEqual(canAssignTask(senior, peer), false);

  // 5. Senior (30) can assign to Junior (10)
  assert.strictEqual(canAssignTask(senior, junior), true);

  // 6. Junior (10) can assign to self
  assert.strictEqual(canAssignTask(junior, junior), true);

  // 7. Junior (10) CANNOT assign to Senior (30)
  assert.strictEqual(canAssignTask(junior, senior), false);
});

test("Level precedence rules for task visibility", () => {
  const manager = { _id: "2", level: 50, role: "MEMBER" };
  const junior = { _id: "5", level: 10, role: "MEMBER" };
  const senior = { _id: "3", level: 30, role: "MEMBER" };

  // Manager can view Junior's tasks
  assert.strictEqual(canViewTask(manager, junior), true);

  // Junior cannot view Senior's tasks
  assert.strictEqual(canViewTask(junior, senior), false);

  // Junior can view own tasks
  assert.strictEqual(canViewTask(junior, junior), true);
});
