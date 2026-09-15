/**
 * Arjuna Offline Queue - Compatibility & Unified Wrapper
 */
import {
  enqueueMutation,
  getMutationQueue,
  getPendingCount,
  clearSyncedMutations,
  type OfflineMutation,
  type EntityType,
} from "./offlineDb";

export type OfflineEvent = {
  id?: number | string;
  uuid?: string;
  type: string;
  entity?: EntityType;
  operation?: string;
  payload: Record<string, unknown>;
  createdAt: number;
  timestamp?: number;
  retryCount?: number;
  syncStatus?: string;
  clientTempId?: string;
};

export async function enqueueOfflineEvent(
  type: string,
  payload: Record<string, unknown>,
  clientTempId?: string
) {
  // Map legacy event types to entity types
  let entity: EntityType = "screening";
  if (type === "create_household" || type.includes("household")) {
    entity = "household";
  } else if (type === "create_patient" || type.includes("patient")) {
    entity = "patient";
  } else if (type === "create_visit" || type.includes("visit")) {
    entity = "visit";
  } else if (type === "create_referral" || type.includes("referral")) {
    entity = "referral";
  } else if (type === "create_screening" || type.includes("screening")) {
    entity = "screening";
  }

  return await enqueueMutation({
    entity,
    operation: "CREATE",
    payload,
    clientTempId,
  });
}

export async function listOfflineEvents(): Promise<OfflineEvent[]> {
  const queue = await getMutationQueue();
  return queue.map((m) => ({
    id: m.uuid,
    uuid: m.uuid,
    type: `create_${m.entity}`,
    entity: m.entity,
    operation: m.operation,
    payload: m.payload,
    createdAt: m.timestamp,
    timestamp: m.timestamp,
    retryCount: m.retryCount,
    syncStatus: m.syncStatus,
    clientTempId: m.clientTempId,
  }));
}

export async function clearOfflineEvents() {
  await clearSyncedMutations();
}

export async function getOfflineQueueCount(): Promise<number> {
  return await getPendingCount();
}

export * from "./offlineDb";
