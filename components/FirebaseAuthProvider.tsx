"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import {
  onFirebaseAuthChange,
  loadUserDataFromFirestore,
  saveUserDataToFirestore,
  subscribeToUserData,
  isFirebaseConfigured,
  type FirebaseUser,
} from "@/lib/firebase";
import { toast } from "sonner";

/**
 * FirebaseAuthProvider handles:
 * 1. Listening to Firebase Auth state changes
 * 2. Syncing user data TO Firestore on every store change
 * 3. Loading user data FROM Firestore on login (cross-device sync)
 * 4. Real-time Firestore listener for live updates across tabs/devices
 * 
 * Wrap your app with this component in AppShell.
 */
export function FirebaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const login = useStudyStore((s) => s.login);
  const logout = useStudyStore((s) => s.logout);
  const setFirebaseUid = useStudyStore((s) => s.setFirebaseUid);
  const loadSyncedData = useStudyStore((s) => s.loadSyncedData);
  const getSyncableData = useStudyStore((s) => s.getSyncableData);

  const unsubFirestoreRef = useRef<(() => void) | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUidRef = useRef<string | null>(null);
  const isLoadingFromFirestore = useRef(false);
  const hasLoadedInitialData = useRef(false);

  // Debounced save to Firestore (prevents excessive writes)
  const debouncedSave = useCallback(
    (uid: string) => {
      if (isLoadingFromFirestore.current) return; // Don't save while loading
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const data = useStudyStore.getState().getSyncableData();
          await saveUserDataToFirestore(uid, data);
        } catch (err) {
          console.warn("[Firebase Sync] Save failed:", err);
        }
      }, 2000); // 2 second debounce
    },
    []
  );

  // Listen to Firebase Auth state
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const unsubAuth = onFirebaseAuthChange(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        currentUidRef.current = uid;
        setFirebaseUid(uid);

        // Set user in zustand store
        login({
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Student",
          email: firebaseUser.email || "",
          avatar: firebaseUser.photoURL || undefined,
        });

        // Load existing data from Firestore (if user has data on another device)
        if (!hasLoadedInitialData.current) {
          try {
            isLoadingFromFirestore.current = true;
            const cloudData = await loadUserDataFromFirestore(uid);
            if (cloudData && Object.keys(cloudData).length > 0) {
              // Only load if cloud has meaningful data
              const hasCloudData =
                (cloudData.subjects && cloudData.subjects.length > 0) ||
                (cloudData.playlists && cloudData.playlists.length > 0) ||
                (cloudData.lectures && cloudData.lectures.length > 0);

              const localState = useStudyStore.getState();
              const hasLocalData =
                localState.subjects.length > 0 ||
                localState.playlists.length > 0 ||
                localState.lectures.length > 0;

              if (hasCloudData) {
                if (hasLocalData) {
                  // Merge: cloud data takes priority but keep unique local items
                  loadSyncedData(cloudData);
                  toast.info("☁️ Cloud data synced successfully!");
                } else {
                  // No local data, just load cloud data
                  loadSyncedData(cloudData);
                  toast.success("☁️ Your data loaded from cloud!");
                }
              } else if (hasLocalData) {
                // Local has data but cloud doesn't — push local to cloud
                const data = useStudyStore.getState().getSyncableData();
                await saveUserDataToFirestore(uid, data);
                toast.info("☁️ Local data backed up to cloud!");
              }
            } else {
              // No cloud data — save current local data to cloud
              const localState = useStudyStore.getState();
              const hasLocalData =
                localState.subjects.length > 0 ||
                localState.playlists.length > 0;
              if (hasLocalData) {
                const data = useStudyStore.getState().getSyncableData();
                await saveUserDataToFirestore(uid, data);
              }
            }
            hasLoadedInitialData.current = true;
          } catch (err) {
            console.warn("[Firebase Sync] Load failed:", err);
          } finally {
            isLoadingFromFirestore.current = false;
          }
        }

        // Set up real-time listener for live cross-device sync
        if (unsubFirestoreRef.current) unsubFirestoreRef.current();
        unsubFirestoreRef.current = subscribeToUserData(uid, (data) => {
          if (data && !isLoadingFromFirestore.current) {
            // Only apply remote changes (ignore our own saves)
            // Check if data is actually different
            const lastSyncedAt = data.lastSyncedAt;
            if (lastSyncedAt) {
              isLoadingFromFirestore.current = true;
              loadSyncedData(data);
              setTimeout(() => {
                isLoadingFromFirestore.current = false;
              }, 500);
            }
          }
        });
      } else {
        // User signed out
        currentUidRef.current = null;
        hasLoadedInitialData.current = false;
        if (unsubFirestoreRef.current) {
          unsubFirestoreRef.current();
          unsubFirestoreRef.current = null;
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubFirestoreRef.current) unsubFirestoreRef.current();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [login, logout, setFirebaseUid, loadSyncedData]);

  // Subscribe to store changes and save to Firestore
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const unsub = useStudyStore.subscribe((state, prevState) => {
      const uid = currentUidRef.current;
      if (!uid) return;
      if (isLoadingFromFirestore.current) return;

      // Check if syncable data actually changed
      const changed =
        state.subjects !== prevState.subjects ||
        state.playlists !== prevState.playlists ||
        state.lectures !== prevState.lectures ||
        state.events !== prevState.events ||
        state.sessions !== prevState.sessions ||
        state.threads !== prevState.threads ||
        state.settings !== prevState.settings;

      if (changed) {
        debouncedSave(uid);
      }
    });

    return unsub;
  }, [debouncedSave]);

  return <>{children}</>;
}
