import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Profile, Routine, WorkoutSession } from '../types';

// Almacenamiento local en IndexedDB. Cada dispositivo guarda sus propios datos.
interface MancuernasDB extends DBSchema {
  profile: { key: string; value: Profile };
  routines: { key: string; value: Routine };
  sessions: { key: string; value: WorkoutSession; indexes: { byInicio: number } };
}

const DB_NAME = 'mancuernas';
const DB_VERSION = 1;
const PROFILE_KEY = 'yo';

let dbPromise: Promise<IDBPDatabase<MancuernasDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<MancuernasDB>(DB_NAME, DB_VERSION, {
      upgrade(d, oldVersion) {
        // Las versiones futuras agregan aquí sus migraciones.
        if (oldVersion < 1) {
          d.createObjectStore('profile');
          d.createObjectStore('routines', { keyPath: 'id' });
          const s = d.createObjectStore('sessions', { keyPath: 'id' });
          s.createIndex('byInicio', 'inicio');
        }
      },
    });
  }
  return dbPromise;
}

export async function loadProfile(): Promise<Profile | undefined> {
  return (await db()).get('profile', PROFILE_KEY);
}

export async function saveProfile(p: Profile): Promise<void> {
  await (await db()).put('profile', p, PROFILE_KEY);
}

export async function listRoutines(): Promise<Routine[]> {
  const all = await (await db()).getAll('routines');
  return all.sort((a, b) => b.actualizado - a.actualizado);
}

export async function getRoutine(id: string): Promise<Routine | undefined> {
  return (await db()).get('routines', id);
}

export async function saveRoutine(r: Routine): Promise<void> {
  await (await db()).put('routines', r);
}

export async function deleteRoutine(id: string): Promise<void> {
  await (await db()).delete('routines', id);
}

export async function saveSession(s: WorkoutSession): Promise<void> {
  await (await db()).put('sessions', s);
}

export async function listSessions(): Promise<WorkoutSession[]> {
  return (await db()).getAllFromIndex('sessions', 'byInicio');
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
