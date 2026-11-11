import { useSyncExternalStore } from "react";
import { SAMPLE_APPLICATIONS, SAMPLE_PROFILE } from "./seed";
import type { Application, ResumeProfile } from "@/types";

/** Browser-local store (localStorage + in-memory fallback).
 *
 *  Implemented with useSyncExternalStore so components subscribe to a
 *  module-level snapshot — no setState-in-effect, no hydration
 *  mismatch: the server snapshot is the seed data, and the client
 *  snapshot is loaded from localStorage on first access. */

/* Storage keys are versioned: v2 was introduced when the seed profile
 * changed from the fictional sample to Sravanthi Panga's real resume
 * (Nov 11, 2026), so browsers holding the old v1 seed load the new one.
 *
 * The seed profile has since gained fields the v2-stored profile may
 * lack (summaryBullets + skillGroups, added in commit 0b6cdff, and the
 * seed contact changed from "Lisle, IL, United States" to "Illinois,
 * United States"). Bumping the key again would wipe the user's saved
 * applications and any profile edits, so instead stored profiles are
 * MIGRATED in place on load (see migrateProfile below): only the
 * missing/old fields are filled from the seed; everything else the
 * user stored is preserved. */
const PROFILE_KEY = "copilot-profile-v2";
const APPS_KEY = "copilot-applications-v2";

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

/** Migrate a stored profile to the current seed shape, in place.
 *
 *  A browser that stored its profile under "copilot-profile-v2" before
 *  the reference-format fix (commit 0b6cdff) holds a profile with no
 *  `summaryBullets` and no `skillGroups`, and a contact line with
 *  "Lisle, IL, United States". Without migration, documents.ts falls
 *  back to the summary paragraph and the flat skills list, so the
 *  downloaded PDF is the OLD format even though the app code is new
 *  (the Fintech PDF incident, Nov 11, 2026).
 *
 *  Only the missing/old fields are filled from SAMPLE_PROFILE; every
 *  other stored field (name, title, summary, skills, bullets,
 *  education, certifications, and any user edits) is preserved
 *  untouched. Returns the (possibly migrated) profile and whether
 *  anything changed. Pure — safe to unit-test. */
export function migrateProfile(stored: ResumeProfile): {
  profile: ResumeProfile;
  migrated: boolean;
} {
  const profile = deepCopy(stored);
  let migrated = false;
  if (!profile.summaryBullets || profile.summaryBullets.length === 0) {
    profile.summaryBullets = deepCopy(SAMPLE_PROFILE.summaryBullets ?? []);
    migrated = true;
  }
  if (!profile.skillGroups || profile.skillGroups.length === 0) {
    profile.skillGroups = deepCopy(SAMPLE_PROFILE.skillGroups ?? []);
    migrated = true;
  }
  if (profile.contact && profile.contact.includes("Lisle, IL, United States")) {
    profile.contact = SAMPLE_PROFILE.contact ?? profile.contact;
    migrated = true;
  }
  return { profile, migrated };
}

/** Load the stored profile, migrating it in place when it predates the
 *  reference-format fields (see migrateProfile). The migrated profile
 *  is written back to localStorage so the next load is already current.
 *  Falls back to the seed when nothing is stored or the stored value
 *  is unreadable. Never touches the stored applications. */
function loadProfile(): ResumeProfile {
  if (typeof window === "undefined") return deepCopy(SAMPLE_PROFILE);
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return deepCopy(SAMPLE_PROFILE);
    const stored = JSON.parse(raw) as ResumeProfile;
    const { profile, migrated } = migrateProfile(stored);
    if (migrated) {
      try {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      } catch {
        // Storage full / unavailable: keep the in-memory snapshot.
      }
    }
    return profile;
  } catch {
    return deepCopy(SAMPLE_PROFILE);
  }
}

let snapshot: StoreState | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): StoreState {
  if (!snapshot) {
    snapshot = {
      profile: loadProfile(),
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
