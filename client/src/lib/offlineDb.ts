/**
 * Arjuna Offline Database (IndexedDB)
 * 
 * Provides offline-first persistence for:
 * - Structured Mutation Queue (UUID, entity, operation, payload, timestamp, retryCount, syncStatus)
 * - Local Entity Stores (Households, Patients, Visits/Screenings, Referrals)
 * - Sync Metadata & Conflict logs
 */

export type SyncStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";
export type EntityType = "household" | "patient" | "visit" | "screening" | "referral";
export type MutationOperation = "CREATE" | "UPDATE";

export interface OfflineMutation {
  uuid: string;
  entity: EntityType;
  operation: MutationOperation;
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  syncStatus: SyncStatus;
  clientTempId?: string;
  serverEntityId?: number;
  lastError?: string;
  conflictDetails?: Record<string, unknown>;
}

export interface LocalHousehold {
  id: string | number;
  headName: string;
  village: string;
  district: string;
  contact?: string;
  assignedWorkerId?: number;
  isOfflineOnly?: boolean;
  createdAt: number;
}

export interface LocalPatient {
  id: string | number;
  name: string;
  age: number;
  gender: "female" | "male" | "other" | "undisclosed";
  village?: string;
  district: string;
  contact?: string;
  householdId?: string | number;
  conditions?: string;
  allergies?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  riskScore?: number;
  riskCategory?: string;
  isOfflineOnly?: boolean;
  createdAt: number;
}

export interface LocalVisit {
  id: string | number;
  patientId: string | number;
  patientName?: string;
  recordedBy?: number;
  facilityId?: number;
  symptoms?: string;
  structuredSymptoms?: string[];
  notes?: string;
  diagnosis?: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  spo2?: number;
  temperature?: number;
  glucose?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  pregnancyStatus?: string;
  existingConditions?: string;
  triageLevel?: string;
  riskScore?: number;
  riskCategory?: string;
  recommendedAction?: string;
  isOfflineOnly?: boolean;
  createdAt: number;
}

export interface LocalReferral {
  id: string | number;
  patientId: string | number;
  patientName?: string;
  targetFacilityId?: number;
  targetFacilityName?: string;
  specialty?: string;
  urgency: "emergency" | "urgent" | "routine";
  reason: string;
  recommendationScore?: number;
  distanceKm?: number;
  status?: string;
  isOfflineOnly?: boolean;
  createdAt: number;
}

const DB_NAME = "arjuna-offline-v2";
const DB_VERSION = 1;

export const STORES = {
  MUTATION_QUEUE: "mutation_queue",
  HOUSEHOLDS: "local_households",
  PATIENTS: "local_patients",
  VISITS: "local_visits",
  REFERRALS: "local_referrals",
  META: "sync_meta",
} as const;

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "mut_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now().toString(36);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // 1. Mutation Queue Store
      if (!db.objectStoreNames.contains(STORES.MUTATION_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.MUTATION_QUEUE, { keyPath: "uuid" });
        queueStore.createIndex("timestamp", "timestamp", { unique: false });
        queueStore.createIndex("syncStatus", "syncStatus", { unique: false });
        queueStore.createIndex("entity", "entity", { unique: false });
        queueStore.createIndex("retryCount", "retryCount", { unique: false });
      }

      // 2. Local Households Store
      if (!db.objectStoreNames.contains(STORES.HOUSEHOLDS)) {
        db.createObjectStore(STORES.HOUSEHOLDS, { keyPath: "id" });
      }

      // 3. Local Patients Store
      if (!db.objectStoreNames.contains(STORES.PATIENTS)) {
        db.createObjectStore(STORES.PATIENTS, { keyPath: "id" });
      }

      // 4. Local Visits Store
      if (!db.objectStoreNames.contains(STORES.VISITS)) {
        db.createObjectStore(STORES.VISITS, { keyPath: "id" });
      }

      // 5. Local Referrals Store
      if (!db.objectStoreNames.contains(STORES.REFERRALS)) {
        db.createObjectStore(STORES.REFERRALS, { keyPath: "id" });
      }

      // 6. Metadata Store
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// -------------------------------------------------------------
// Mutation Queue Operations
// -------------------------------------------------------------

export async function enqueueMutation(input: {
  entity: EntityType;
  operation?: MutationOperation;
  payload: Record<string, unknown>;
  clientTempId?: string;
}): Promise<OfflineMutation> {
  const db = await openDatabase();
  const mutation: OfflineMutation = {
    uuid: generateUUID(),
    entity: input.entity,
    operation: input.operation || "CREATE",
    payload: input.payload,
    timestamp: Date.now(),
    retryCount: 0,
    syncStatus: "pending",
    clientTempId: input.clientTempId,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MUTATION_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.MUTATION_QUEUE);
    const req = store.put(mutation);
    req.onsuccess = () => {
      db.close();
      resolve(mutation);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function getMutationQueue(): Promise<OfflineMutation[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MUTATION_QUEUE, "readonly");
    const store = tx.objectStore(STORES.MUTATION_QUEUE);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      const list = (req.result as OfflineMutation[]) || [];
      // Sort chronologically
      list.sort((a, b) => a.timestamp - b.timestamp);
      resolve(list);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function getPendingMutations(): Promise<OfflineMutation[]> {
  const queue = await getMutationQueue();
  return queue.filter((m) => m.syncStatus === "pending" || m.syncStatus === "failed");
}

export async function getPendingCount(): Promise<number> {
  try {
    const pending = await getPendingMutations();
    return pending.length;
  } catch {
    return 0;
  }
}

export async function updateMutation(mutation: OfflineMutation): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MUTATION_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.MUTATION_QUEUE);
    const req = store.put(mutation);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function markMutationStatus(
  uuid: string,
  status: SyncStatus,
  options?: {
    serverEntityId?: number;
    lastError?: string;
    conflictDetails?: Record<string, unknown>;
    incrementRetry?: boolean;
  }
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MUTATION_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.MUTATION_QUEUE);
    const getReq = store.get(uuid);

    getReq.onsuccess = () => {
      const mut = getReq.result as OfflineMutation | undefined;
      if (!mut) {
        db.close();
        resolve();
        return;
      }
      mut.syncStatus = status;
      if (options?.serverEntityId !== undefined) mut.serverEntityId = options.serverEntityId;
      if (options?.lastError !== undefined) mut.lastError = options.lastError;
      if (options?.conflictDetails !== undefined) mut.conflictDetails = options.conflictDetails;
      if (options?.incrementRetry) mut.retryCount = (mut.retryCount || 0) + 1;

      const putReq = store.put(mut);
      putReq.onsuccess = () => {
        db.close();
        resolve();
      };
      putReq.onerror = () => {
        db.close();
        reject(putReq.error);
      };
    };

    getReq.onerror = () => {
      db.close();
      reject(getReq.error);
    };
  });
}

export async function deleteMutation(uuid: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MUTATION_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.MUTATION_QUEUE);
    const req = store.delete(uuid);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function clearSyncedMutations(): Promise<number> {
  const queue = await getMutationQueue();
  const syncedUuids = queue.filter((m) => m.syncStatus === "synced").map((m) => m.uuid);
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MUTATION_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.MUTATION_QUEUE);
    syncedUuids.forEach((id) => store.delete(id));
    tx.oncomplete = () => {
      db.close();
      resolve(syncedUuids.length);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function resetMutationForRetry(uuid: string): Promise<void> {
  await markMutationStatus(uuid, "pending", { lastError: undefined });
}

// -------------------------------------------------------------
// Local Entity Cache Operations (Optimistic offline view)
// -------------------------------------------------------------

export async function saveLocalEntity<T extends { id: string | number }>(
  storeName: (typeof STORES)[keyof typeof STORES],
  entity: T
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(entity);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function getLocalEntities<T>(
  storeName: (typeof STORES)[keyof typeof STORES]
): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      resolve((req.result as T[]) || []);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function getLocalEntityById<T>(
  storeName: (typeof STORES)[keyof typeof STORES],
  id: string | number
): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => {
      db.close();
      resolve(req.result as T | undefined);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function removeLocalEntity(
  storeName: (typeof STORES)[keyof typeof STORES],
  id: string | number
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function replaceTempEntityId<T extends { id: string | number }>(
  storeName: (typeof STORES)[keyof typeof STORES],
  tempId: string | number,
  newEntity: T
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.delete(tempId);
    store.put(newEntity);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// -------------------------------------------------------------
// Metadata & Settings
// -------------------------------------------------------------

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.META, "readwrite");
    const store = tx.objectStore(STORES.META);
    const req = store.put({ key, value, updatedAt: Date.now() });
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.META, "readonly");
    const store = tx.objectStore(STORES.META);
    const req = store.get(key);
    req.onsuccess = () => {
      db.close();
      resolve(req.result ? (req.result.value as T) : undefined);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}
