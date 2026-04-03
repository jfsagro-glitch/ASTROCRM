/**
 * peopleService — CRUD helpers for saved birth profiles.
 *
 * Firestore path: users/{uid}/people/{personId}
 *
 * Security: each document contains authorUid enforced by Firestore rules:
 *   match /users/{uid}/people/{doc} {
 *     allow read, write: if request.auth != null && request.auth.uid == uid;
 *   }
 */
import {
  collection, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, doc,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface SavedPerson {
  id: string;
  name: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM or HH:MM:SS
  lat: number;
  lon: number;
  utc: number;
  location?: string;  // display city name
  notes?: string;
}

/** Subscribe to all people for a user, ordered by name. Returns unsubscribe fn. */
export function subscribePeople(uid: string, cb: (people: SavedPerson[]) => void): () => void {
  const q = query(
    collection(db, 'users', uid, 'people'),
    orderBy('name', 'asc'),
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<SavedPerson, 'id'>) }))),
  );
}

/** Add a new person — returns new document ID. */
export async function addPerson(uid: string, person: Omit<SavedPerson, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'people'), {
    ...person,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update an existing person. */
export async function updatePerson(
  uid: string,
  id: string,
  updates: Partial<Omit<SavedPerson, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'people', id), updates);
}

/** Delete a saved person. */
export async function deletePerson(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'people', id));
}
