/**
 * Arjuna Offline Sync Engine
 * 
 * Orchestrates:
 * 1. Network connectivity detection (navigator.onLine, window events, heartbeat)
 * 2. Topological dependency-ordered mutation dispatch
 * 3. Client temporary ID remapping (clientTempId -> serverEntityId)
 * 4. Automatic retry on failure with backoff
 * 5. Conflict tracking and error reporting
 * 6. Reactive event notification for UI status indicators
 */

import {
  getMutationQueue,
  getPendingMutations,
  markMutationStatus,
  updateMutation,
  deleteMutation,
  saveLocalEntity,
  replaceTempEntityId,
  setMeta,
  getMeta,
  STORES,
  type OfflineMutation,
  type SyncStatus,
  type EntityType,
} from "./offlineDb";

export interface SyncEngineState {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  statusText: "ONLINE" | "OFFLINE" | "SYNCING";
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  lastSyncedAt: Date | null;
  queue: OfflineMutation[];
}

export type SyncEngineListener = (state: SyncEngineState) => void;

// Dependency order: Households first, then Patients, then Screenings/Visits, then Referrals
const ENTITY_PRIORITY: Record<EntityType, number> = {
  household: 1,
  patient: 2,
  visit: 3,
  screening: 3,
  referral: 4,
};

class OfflineSyncEngine {
  private isOnlineInternal: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private isSimulatedOfflineInternal: boolean = false;
  private isSyncingInternal: boolean = false;
  private lastSyncedAtInternal: Date | null = null;
  private listeners: Set<SyncEngineListener> = new Set();
  private syncClient: ((batch: OfflineMutation[]) => Promise<any>) | null = null;
  private cachedQueue: OfflineMutation[] = [];
  private heartbeatInterval: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleConnectionChange(true));
      window.addEventListener("offline", () => this.handleConnectionChange(false));
      this.initHeartbeat();
      this.refreshState();
    }
  }

  public setSyncClient(client: (batch: OfflineMutation[]) => Promise<any>) {
    this.syncClient = client;
  }

  public subscribe(listener: SyncEngineListener): () => void {
    this.listeners.add(listener);
    // Send immediate initial state
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error("Error in sync engine listener:", err);
      }
    });
  }

  public getState(): SyncEngineState {
    const effectiveOnline = this.isOnlineInternal && !this.isSimulatedOfflineInternal;
    let statusText: "ONLINE" | "OFFLINE" | "SYNCING" = "ONLINE";
    if (this.isSyncingInternal) {
      statusText = "SYNCING";
    } else if (!effectiveOnline) {
      statusText = "OFFLINE";
    }

    const pendingCount = this.cachedQueue.filter(
      (m) => m.syncStatus === "pending" || m.syncStatus === "failed"
    ).length;
    const syncedCount = this.cachedQueue.filter((m) => m.syncStatus === "synced").length;
    const failedCount = this.cachedQueue.filter((m) => m.syncStatus === "failed").length;
    const conflictCount = this.cachedQueue.filter((m) => m.syncStatus === "conflict").length;

    return {
      isOnline: effectiveOnline,
      isSimulatedOffline: this.isSimulatedOfflineInternal,
      isSyncing: this.isSyncingInternal,
      statusText,
      pendingCount,
      syncedCount,
      failedCount,
      conflictCount,
      lastSyncedAt: this.lastSyncedAtInternal,
      queue: [...this.cachedQueue],
    };
  }

  public async refreshState(): Promise<SyncEngineState> {
    try {
      this.cachedQueue = await getMutationQueue();
      const lastSyncMeta = await getMeta<string>("lastSyncedAt");
      if (lastSyncMeta) {
        this.lastSyncedAtInternal = new Date(lastSyncMeta);
      }
    } catch {
      // Ignore initial IndexedDB open issues
    }
    this.notify();
    return this.getState();
  }

  public setSimulatedOffline(simulated: boolean) {
    this.isSimulatedOfflineInternal = simulated;
    this.notify();
    if (!simulated && this.isOnlineInternal) {
      // Reconnection: trigger auto-sync
      this.triggerSync();
    }
  }

  public toggleSimulatedOffline(): boolean {
    this.setSimulatedOffline(!this.isSimulatedOfflineInternal);
    return this.isSimulatedOfflineInternal;
  }

  private handleConnectionChange(online: boolean) {
    this.isOnlineInternal = online;
    this.notify();
    if (online && !this.isSimulatedOfflineInternal) {
      // Connection restored: auto replay pending queue
      setTimeout(() => {
        this.triggerSync();
      }, 500);
    }
  }

  private initHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    // Periodically verify connection and state
    this.heartbeatInterval = setInterval(async () => {
      if (typeof navigator !== "undefined" && navigator.onLine !== this.isOnlineInternal) {
        this.handleConnectionChange(navigator.onLine);
      }
    }, 10000);
  }

  /**
   * Sort mutations topologically to guarantee dependency order:
   * 1. Households
   * 2. Patients
   * 3. Visits & Screenings
   * 4. Referrals
   */
  public sortMutationsForDispatch(mutations: OfflineMutation[]): OfflineMutation[] {
    return [...mutations].sort((a, b) => {
      const pA = ENTITY_PRIORITY[a.entity] || 99;
      const pB = ENTITY_PRIORITY[b.entity] || 99;
      if (pA !== pB) return pA - pB;
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Main sync dispatch loop
   */
  public async triggerSync(): Promise<{
    processed: number;
    success: number;
    failed: number;
    conflicts: number;
  }> {
    const effectiveOnline = this.isOnlineInternal && !this.isSimulatedOfflineInternal;
    if (!effectiveOnline) {
      return { processed: 0, success: 0, failed: 0, conflicts: 0 };
    }

    if (this.isSyncingInternal) {
      return { processed: 0, success: 0, failed: 0, conflicts: 0 };
    }

    if (!this.syncClient) {
      console.warn("SyncEngine: No sync client registered.");
      return { processed: 0, success: 0, failed: 0, conflicts: 0 };
    }

    this.isSyncingInternal = true;
    this.notify();

    let processed = 0;
    let success = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      const pending = await getPendingMutations();
      if (pending.length === 0) {
        this.isSyncingInternal = false;
        await this.refreshState();
        return { processed: 0, success: 0, failed: 0, conflicts: 0 };
      }

      // Mark all pending as syncing in memory & db
      for (const m of pending) {
        await markMutationStatus(m.uuid, "syncing");
      }
      await this.refreshState();

      const sorted = this.sortMutationsForDispatch(pending);

      // Execute batch via server procedure
      const response = await this.syncClient(sorted);

      if (response && response.results && Array.isArray(response.results)) {
        // Map of clientTempId -> serverEntityId
        const idMap = new Map<string, number>();

        for (const res of response.results) {
          processed++;
          const targetMutation = sorted.find((m) => m.uuid === res.uuid);
          if (!targetMutation) continue;

          if (res.status === "synced") {
            success++;
            await markMutationStatus(res.uuid, "synced", {
              serverEntityId: res.serverEntityId,
              lastError: undefined,
              conflictDetails: undefined,
            });

            if (res.clientTempId && res.serverEntityId) {
              idMap.set(String(res.clientTempId), Number(res.serverEntityId));
            }

            // Update local entity store with real server ID if available
            await this.updateLocalEntitySynced(targetMutation, res.serverEntityId);
          } else if (res.status === "conflict") {
            conflicts++;
            await markMutationStatus(res.uuid, "conflict", {
              lastError: res.message || "Conflict detected on server",
              conflictDetails: res.conflictDetails,
            });
          } else {
            failed++;
            await markMutationStatus(res.uuid, "failed", {
              lastError: res.message || "Server rejected mutation",
              incrementRetry: true,
            });
          }
        }

        // Remap any dependent temp IDs in remaining queue mutations
        if (idMap.size > 0) {
          await this.remapDependentTempIds(idMap);
        }
      }

      this.lastSyncedAtInternal = new Date();
      await setMeta("lastSyncedAt", this.lastSyncedAtInternal.toISOString());
    } catch (err: any) {
      console.error("SyncEngine execution error:", err);
      // Revert syncing mutations back to failed/pending
      const queue = await getMutationQueue();
      for (const m of queue) {
        if (m.syncStatus === "syncing") {
          await markMutationStatus(m.uuid, "failed", {
            lastError: err.message || "Network error during synchronization",
            incrementRetry: true,
          });
        }
      }
    } finally {
      this.isSyncingInternal = false;
      await this.refreshState();
    }

    return { processed, success, failed, conflicts };
  }

  private async updateLocalEntitySynced(mutation: OfflineMutation, serverId?: number) {
    if (!serverId) return;
    try {
      if (mutation.entity === "household") {
        const tempId = mutation.clientTempId || mutation.payload.id;
        if (tempId) {
          await replaceTempEntityId(STORES.HOUSEHOLDS, tempId as string | number, {
            ...mutation.payload,
            id: serverId,
            isOfflineOnly: false,
          } as any);
        }
      } else if (mutation.entity === "patient") {
        const tempId = mutation.clientTempId || mutation.payload.id;
        if (tempId) {
          await replaceTempEntityId(STORES.PATIENTS, tempId as string | number, {
            ...mutation.payload,
            id: serverId,
            isOfflineOnly: false,
          } as any);
        }
      } else if (mutation.entity === "visit" || mutation.entity === "screening") {
        const tempId = mutation.clientTempId || mutation.payload.id;
        if (tempId) {
          await replaceTempEntityId(STORES.VISITS, tempId as string | number, {
            ...mutation.payload,
            id: serverId,
            isOfflineOnly: false,
          } as any);
        }
      } else if (mutation.entity === "referral") {
        const tempId = mutation.clientTempId || mutation.payload.id;
        if (tempId) {
          await replaceTempEntityId(STORES.REFERRALS, tempId as string | number, {
            ...mutation.payload,
            id: serverId,
            isOfflineOnly: false,
          } as any);
        }
      }
    } catch {
      // Best-effort local entity update
    }
  }

  private async remapDependentTempIds(idMap: Map<string, number>) {
    const queue = await getMutationQueue();
    for (const m of queue) {
      if (m.syncStatus === "synced") continue;
      let modified = false;
      const payload = { ...m.payload };

      if (payload.householdId && idMap.has(String(payload.householdId))) {
        payload.householdId = idMap.get(String(payload.householdId));
        modified = true;
      }
      if (payload.patientId && idMap.has(String(payload.patientId))) {
        payload.patientId = idMap.get(String(payload.patientId));
        modified = true;
      }

      if (modified) {
        m.payload = payload;
        await updateMutation(m);
      }
    }
  }

  public async retryMutation(uuid: string): Promise<void> {
    await markMutationStatus(uuid, "pending", { lastError: undefined });
    await this.refreshState();
    if (this.isOnlineInternal && !this.isSimulatedOfflineInternal) {
      this.triggerSync();
    }
  }

  public async retryAllFailed(): Promise<void> {
    const queue = await getMutationQueue();
    for (const m of queue) {
      if (m.syncStatus === "failed" || m.syncStatus === "conflict") {
        await markMutationStatus(m.uuid, "pending", { lastError: undefined });
      }
    }
    await this.refreshState();
    if (this.isOnlineInternal && !this.isSimulatedOfflineInternal) {
      this.triggerSync();
    }
  }

  public async removeMutation(uuid: string): Promise<void> {
    await deleteMutation(uuid);
    await this.refreshState();
  }
}

// Global Singleton Sync Engine
export const syncEngine = new OfflineSyncEngine();
