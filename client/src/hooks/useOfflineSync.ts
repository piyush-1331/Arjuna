/**
 * useOfflineSync React Hook
 * 
 * Subscribes component to Arjuna OfflineSyncEngine state
 */

import { useState, useEffect, useCallback } from "react";
import { syncEngine, type SyncEngineState } from "@/lib/offlineSyncEngine";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  enqueueMutation,
  saveLocalEntity,
  getLocalEntities,
  STORES,
  type EntityType,
  type MutationOperation,
  type LocalHousehold,
  type LocalPatient,
  type LocalVisit,
  type LocalReferral,
} from "@/lib/offlineDb";

export function useOfflineSync() {
  const [syncState, setSyncState] = useState<SyncEngineState>(syncEngine.getState());
  const syncMutation = trpc.offline.sync.useMutation();

  // Register tRPC mutation runner with the sync engine
  useEffect(() => {
    syncEngine.setSyncClient(async (batch) => {
      return await syncMutation.mutateAsync({
        events: batch.map((m) => ({
          uuid: m.uuid,
          entity: m.entity,
          operation: m.operation,
          payload: m.payload,
          timestamp: m.timestamp,
          clientTempId: m.clientTempId,
          retryCount: m.retryCount,
        })),
      });
    });
  }, [syncMutation]);

  // Subscribe to reactive state updates
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => {
      setSyncState(state);
    });
    return unsubscribe;
  }, []);

  const triggerSync = useCallback(async () => {
    const res = await syncEngine.triggerSync();
    if (res.processed > 0) {
      if (res.failed === 0 && res.conflicts === 0) {
        toast.success(`Successfully synchronized ${res.success} field record(s) to server.`);
      } else {
        toast.warning(
          `Sync completed: ${res.success} synced, ${res.conflicts} conflict(s), ${res.failed} failed.`
        );
      }
    }
    return res;
  }, []);

  const retryMutation = useCallback(async (uuid: string) => {
    await syncEngine.retryMutation(uuid);
    toast.info("Retrying mutation synchronization...");
  }, []);

  const retryAllFailed = useCallback(async () => {
    await syncEngine.retryAllFailed();
    toast.info("Retrying all failed & conflict records...");
  }, []);

  const removeMutation = useCallback(async (uuid: string) => {
    await syncEngine.removeMutation(uuid);
    toast.info("Record removed from offline mutation queue.");
  }, []);

  const setSimulatedOffline = useCallback((simulated: boolean) => {
    syncEngine.setSimulatedOffline(simulated);
    toast.info(
      simulated
        ? "Field Mode: Offline simulated (records stored in local IndexedDB)"
        : "Field Mode: Online restored (syncing pending records)"
    );
  }, []);

  const toggleSimulatedOffline = useCallback(() => {
    const newState = syncEngine.toggleSimulatedOffline();
    toast.info(
      newState
        ? "Field Mode: Offline simulated (records stored in local IndexedDB)"
        : "Field Mode: Online restored (syncing pending records)"
    );
  }, []);

  /**
   * Helper to perform an offline-first Household creation:
   * 1. Saves to local IndexedDB store for instant UI selection
   * 2. Enqueues mutation to mutation_queue with clientTempId
   * 3. Triggers sync if online
   */
  const createHouseholdOfflineFirst = useCallback(
    async (payload: { headName: string; village: string; district: string; contact?: string }) => {
      const tempId = "temp_hh_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
      const localHousehold: LocalHousehold = {
        id: tempId,
        headName: payload.headName,
        village: payload.village,
        district: payload.district,
        contact: payload.contact,
        isOfflineOnly: true,
        createdAt: Date.now(),
      };

      await saveLocalEntity(STORES.HOUSEHOLDS, localHousehold);
      const mutation = await enqueueMutation({
        entity: "household",
        operation: "CREATE",
        payload: { ...payload, clientTempId: tempId },
        clientTempId: tempId,
      });

      await syncEngine.refreshState();
      if (syncState.isOnline) {
        syncEngine.triggerSync();
      }

      return { tempId, mutation };
    },
    [syncState.isOnline]
  );

  /**
   * Helper to perform an offline-first Patient creation
   */
  const createPatientOfflineFirst = useCallback(
    async (payload: {
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
    }) => {
      const tempId = "temp_pat_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
      const localPatient: LocalPatient = {
        id: tempId,
        name: payload.name,
        age: payload.age,
        gender: payload.gender,
        village: payload.village,
        district: payload.district,
        contact: payload.contact,
        householdId: payload.householdId,
        conditions: payload.conditions,
        allergies: payload.allergies,
        bloodGroup: payload.bloodGroup,
        emergencyContact: payload.emergencyContact,
        riskScore: 0,
        riskCategory: "low",
        isOfflineOnly: true,
        createdAt: Date.now(),
      };

      await saveLocalEntity(STORES.PATIENTS, localPatient);
      const mutation = await enqueueMutation({
        entity: "patient",
        operation: "CREATE",
        payload: { ...payload, clientTempId: tempId },
        clientTempId: tempId,
      });

      await syncEngine.refreshState();
      if (syncState.isOnline) {
        syncEngine.triggerSync();
      }

      return { tempId, mutation };
    },
    [syncState.isOnline]
  );

  /**
   * Helper to perform an offline-first Screening/Visit creation
   */
  const createScreeningOfflineFirst = useCallback(
    async (payload: {
      patientId: string | number;
      patientName?: string;
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
    }) => {
      const tempId = "temp_vst_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
      const localVisit: LocalVisit = {
        id: tempId,
        ...payload,
        isOfflineOnly: true,
        createdAt: Date.now(),
      };

      await saveLocalEntity(STORES.VISITS, localVisit);
      const mutation = await enqueueMutation({
        entity: "visit",
        operation: "CREATE",
        payload: { ...payload, clientTempId: tempId },
        clientTempId: tempId,
      });

      await syncEngine.refreshState();
      if (syncState.isOnline) {
        syncEngine.triggerSync();
      }

      return { tempId, mutation };
    },
    [syncState.isOnline]
  );

  /**
   * Helper to perform an offline-first Referral creation
   */
  const createReferralOfflineFirst = useCallback(
    async (payload: {
      patientId: string | number;
      patientName?: string;
      targetFacilityId?: number;
      targetFacilityName?: string;
      specialty?: string;
      urgency: "emergency" | "urgent" | "routine";
      reason: string;
      recommendationScore?: number;
      distanceKm?: number;
    }) => {
      const tempId = "temp_ref_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6);
      const localReferral: LocalReferral = {
        id: tempId,
        ...payload,
        status: "PENDING",
        isOfflineOnly: true,
        createdAt: Date.now(),
      };

      await saveLocalEntity(STORES.REFERRALS, localReferral);
      const mutation = await enqueueMutation({
        entity: "referral",
        operation: "CREATE",
        payload: { ...payload, clientTempId: tempId },
        clientTempId: tempId,
      });

      await syncEngine.refreshState();
      if (syncState.isOnline) {
        syncEngine.triggerSync();
      }

      return { tempId, mutation };
    },
    [syncState.isOnline]
  );

  return {
    ...syncState,
    triggerSync,
    retryMutation,
    retryAllFailed,
    removeMutation,
    setSimulatedOffline,
    toggleSimulatedOffline,
    createHouseholdOfflineFirst,
    createPatientOfflineFirst,
    createScreeningOfflineFirst,
    createReferralOfflineFirst,
  };
}
