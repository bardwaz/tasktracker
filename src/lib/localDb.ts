import fs from "fs";
import path from "path";
import { ObjectId } from "mongodb";

const dataDir = path.join(process.cwd(), ".data");
const dbFilePath = path.join(dataDir, "db.json");

interface DataStore {
  users: any[];
  tasks: any[];
}

function ensureDataFile(): DataStore {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dbFilePath)) {
    const initial: DataStore = { users: [], tasks: [] };
    fs.writeFileSync(dbFilePath, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }

  try {
    const raw = fs.readFileSync(dbFilePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    const fallback: DataStore = { users: [], tasks: [] };
    fs.writeFileSync(dbFilePath, JSON.stringify(fallback, null, 2), "utf-8");
    return fallback;
  }
}

function saveData(data: DataStore) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), "utf-8");
}

function matchesFilter(item: any, filter: any): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const key of Object.keys(filter)) {
    const targetVal = filter[key];

    if (key === "_id") {
      const targetIdStr = targetVal?.toString();
      const itemIdStr = item._id?.toString();
      if (itemIdStr !== targetIdStr) return false;
      continue;
    }

    if (targetVal && typeof targetVal === "object" && "$in" in targetVal) {
      const inList = (targetVal.$in || []).map((x: any) => x?.toString());
      const itemValStr = item[key]?.toString();
      if (!inList.includes(itemValStr)) return false;
      continue;
    }

    if (item[key] !== targetVal) {
      return false;
    }
  }

  return true;
}

class LocalCursor {
  private items: any[];

  constructor(items: any[], projection?: any) {
    this.items = items.map((it) => {
      const copy = { ...it };
      if (projection?.passwordHash === 0) {
        delete copy.passwordHash;
      }
      return copy;
    });
  }

  sort(sortRules: Record<string, number>) {
    this.items.sort((a, b) => {
      for (const [key, direction] of Object.entries(sortRules)) {
        const valA = a[key];
        const valB = b[key];
        if (valA === valB) continue;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        if (valA > valB) return direction === 1 ? 1 : -1;
        if (valA < valB) return direction === 1 ? -1 : 1;
      }
      return 0;
    });
    return this;
  }

  async toArray(): Promise<any[]> {
    return this.items;
  }
}

class LocalCollection {
  private name: "users" | "tasks";

  constructor(name: "users" | "tasks") {
    this.name = name;
  }

  private getData(): DataStore {
    return ensureDataFile();
  }

  async countDocuments(filter: any = {}): Promise<number> {
    const data = this.getData();
    const list = data[this.name] || [];
    return list.filter((item) => matchesFilter(item, filter)).length;
  }

  async findOne(filter: any, options?: { projection?: any }): Promise<any | null> {
    const data = this.getData();
    const list = data[this.name] || [];
    const item = list.find((it) => matchesFilter(it, filter));
    if (!item) return null;

    const copy = { ...item };
    if (options?.projection?.passwordHash === 0) {
      delete copy.passwordHash;
    }
    return copy;
  }

  find(filter: any = {}, options?: { projection?: any }): LocalCursor {
    const data = this.getData();
    const list = data[this.name] || [];
    const matching = list.filter((it) => matchesFilter(it, filter));
    return new LocalCursor(matching, options?.projection);
  }

  async insertOne(doc: any): Promise<{ insertedId: ObjectId | string }> {
    const data = this.getData();
    if (!data[this.name]) {
      data[this.name] = [];
    }

    const insertedId = doc._id || new ObjectId();
    const newDoc = {
      ...doc,
      _id: insertedId,
    };

    data[this.name].push(newDoc);
    saveData(data);
    return { insertedId };
  }

  async findOneAndUpdate(
    filter: any,
    update: { $set?: any },
    options?: { returnDocument?: string; projection?: any }
  ): Promise<any | null> {
    const data = this.getData();
    const list = data[this.name] || [];
    const index = list.findIndex((it) => matchesFilter(it, filter));
    if (index === -1) return null;

    if (update.$set) {
      list[index] = {
        ...list[index],
        ...update.$set,
      };
    }

    saveData(data);

    const updated = { ...list[index] };
    if (options?.projection?.passwordHash === 0) {
      delete updated.passwordHash;
    }
    return updated;
  }

  async deleteOne(filter: any): Promise<{ deletedCount: number }> {
    const data = this.getData();
    const list = data[this.name] || [];
    const index = list.findIndex((it) => matchesFilter(it, filter));
    if (index === -1) {
      return { deletedCount: 0 };
    }

    list.splice(index, 1);
    saveData(data);
    return { deletedCount: 1 };
  }
}

export class LocalDb {
  collection(name: "users" | "tasks") {
    return new LocalCollection(name);
  }
}

export const localDbInstance = new LocalDb();
