import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DebateSession } from './types';

interface DebateDB extends DBSchema {
  sessions: {
    key: string;
    value: DebateSession;
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<DebateDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DebateDB>('multi-agent-debate', 1, {
      upgrade(db) {
        const store = db.createObjectStore('sessions', {
          keyPath: 'id',
        });
        store.createIndex('by-date', 'lastUpdated');
      },
    });
  }
  return dbPromise;
}

export async function saveSession(session: DebateSession): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function getSession(id: string): Promise<DebateSession | undefined> {
  const db = await getDB();
  return db.get('sessions', id);
}

export async function getAllSessions(): Promise<DebateSession[]> {
  const db = await getDB();
  return db.getAllFromIndex('sessions', 'by-date');
}
