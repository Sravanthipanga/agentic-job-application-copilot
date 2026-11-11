import { useSyncExternalStore } from "react";
import { SAMPLE_APPLICATIONS, SAMPLE_PROFILE } from "./seed";
import type { Application, ResumeProfile } from "@/types";

/** Browser-local store (localStorage + in-memory fallback).
 *
 *  Implemented with useSyncExternalStore so components subscribe to a
 *  module-level snapshot — no setState-in-effect, no hydration
 *  mismatch: the server snapshot is the seed data, and the client
 *  snapshot is loaded from localStorage on first access. */

const PROFILE_KEY = "copilot-profile-v1";
const APPS_KEY = "copilot-applications-v1";

export interface StoreState {
  profile: ResumeProfile;
  applications: Application[];
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return deepCopy(fallback);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return deepCopy(fallback);
    return JSON.parse(raw) as T;
  } catch {
    return deepCopy(fallback);
  }
}

let snapshot: StoreState | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): StoreState {
  if (!snapshot) {
    snapshot = {
      profile: readStored(PROFILE_KEY, SAMPLE_PROFILE),
      applications: readStored(APPS_KEY, SAMPLE_APPLICATIONS),
    };
  }
  return snapshot;
}

function getServerSnapshot(): StoreState {
  return { profile: deepCopy(SAMPLE_PROFILE), applications: deepCopy(SAMPLE_APPLICATIONS) };
}

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === PROFILE_KEY || event.key === APPS_KEY) {
      snapshot = null;
      emit();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function persist(state: StoreState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));
    window.localStorage.setItem(APPS_KEY, JSON.stringify(state.applications));
  } catch {
    // Storage full / unavailable: keep the in-memory snapshot.
  }
}

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function updateStore(updater: (state: StoreState) => StoreState): void {
  const next = updater(deepCopy(getSnapshot()));
  snapshot = next;
  persist(next);
  emit();
}

export function setProfile(profile: ResumeProfile): void {
  updateStore((state) => ({ ...state, profile }));
}

export function addApplication(application: Application): void {
  updateStore((state) => ({
    ...state,
    applications: [application, ...state.applications],
  }));
}

export function updateApplication(id: string, patch: Partial<Application>): void {
  updateStore((state) => ({
    ...state,
    applications: state.applications.map((app) =>
      app.id === id ? { ...app, ...patch } : app,
    ),
  }));
}

export function deleteApplication(id: string): void {
  updateStore((state) => ({
    ...state,
    applications: state.applications.filter((app) => app.id !== id),
  }));
}

export function getApplication(id: string): Application | undefined {
  return getSnapshot().applications.find((app) => app.id === id);
}

export function resetToSample(): void {
  snapshot = { profile: deepCopy(SAMPLE_PROFILE), applications: deepCopy(SAMPLE_APPLICATIONS) };
  persist(snapshot);
  emit();
}
