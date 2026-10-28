/**
 * Pluggable key/value storage.
 * IndexedDB in the browser, localStorage as a fallback, in-memory in tests.
 */

export interface StorageDriver {
  readonly kind: "indexeddb" | "localstorage" | "memory";
  getAll(): Promise<Record<string, string>>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const DB_NAME = "delulu-life-v2";
const STORE = "kv";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

class IndexedDbDriver implements StorageDriver {
  readonly kind = "indexeddb" as const;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db() {
    if (!this.dbPromise) this.dbPromise = openDb();
    return this.dbPromise;
  }

  async getAll(): Promise<Record<string, string>> {
    const db = await this.db();
    const tx = db.transaction(STORE, "readonly");
    const keys = await idbRequest(tx.objectStore(STORE).getAllKeys() as IDBRequest<IDBValidKey[]>);
    const out: Record<string, string> = {};
    for (const k of keys) {
      const v = await idbRequest(tx.objectStore(STORE).get(k));
      if (typeof v === "string") out[String(k)] = v;
    }
    return out;
  }

  async get(key: string): Promise<string | null> {
    const db = await this.db();
    const tx = db.transaction(STORE, "readonly");
    const v = await idbRequest(tx.objectStore(STORE).get(key));
    return typeof v === "string" ? v : null;
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE, "readwrite");
    await idbRequest(tx.objectStore(STORE).put(value, key));
  }

  async remove(key: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE, "readwrite");
    await idbRequest(tx.objectStore(STORE).delete(key));
  }
}

class LocalStorageDriver implements StorageDriver {
  readonly kind = "localstorage" as const;
  private prefix = "delulu-v2:";

  async getAll(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) out[k.slice(this.prefix.length)] = localStorage.getItem(k) ?? "";
    }
    return out;
  }

  async get(key: string): Promise<string | null> {
    return localStorage.getItem(this.prefix + key);
  }

  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(this.prefix + key, value);
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }
}

export class MemoryDriver implements StorageDriver {
  readonly kind = "memory" as const;
  constructor(private map = new Map<string, string>()) {}
  async getAll(): Promise<Record<string, string>> {
    return Object.fromEntries(this.map.entries());
  }
  async get(key: string): Promise<string | null> {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  async set(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.map.delete(key);
  }
}

let cached: StorageDriver | null = null;

export function getDriver(): StorageDriver {
  if (cached) return cached;
  if (typeof indexedDB !== "undefined") {
    cached = new IndexedDbDriver();
  } else if (typeof localStorage !== "undefined") {
    cached = new LocalStorageDriver();
  } else {
    cached = new MemoryDriver();
  }
  return cached;
}

/** Test/preview helper: force a particular driver. */
export function setDriver(driver: StorageDriver): void {
  cached = driver;
}
