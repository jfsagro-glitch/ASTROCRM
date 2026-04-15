/**
 * consultationService — CRUD helpers for per-person consultation notes.
 *
 * Firestore path: users/{uid}/people/{personId}/consultations/{noteId}
 *
 * Security: covered by parent people rule (request.auth.uid == uid).
 */
import {
  collection, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, doc, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export type NoteType = 'note' | 'consultation' | 'reading' | 'transit_session';
export type NoteStatus = 'scheduled' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface ConsultationNote {
  id: string;
  type: NoteType;
  date: Timestamp;
  title: string;
  notes: string;
  tags?: string[];
  status?: NoteStatus;
  price?: number;
  paymentStatus?: PaymentStatus;
  authorUid: string;
  createdAt: Timestamp;
}

function notesCol(uid: string, personId: string) {
  return collection(db, 'users', uid, 'people', personId, 'consultations');
}

/** Subscribe to all notes for a person, ordered by date descending. */
export function subscribeNotes(
  uid: string,
  personId: string,
  cb: (notes: ConsultationNote[]) => void,
): () => void {
  const q = query(notesCol(uid, personId), orderBy('date', 'desc'));
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ConsultationNote, 'id'>) }))),
  );
}

/** Add a new consultation note. */
export async function addNote(
  uid: string,
  personId: string,
  data: Omit<ConsultationNote, 'id' | 'authorUid' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(notesCol(uid, personId), {
    ...data,
    authorUid: uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update an existing note. */
export async function updateNote(
  uid: string,
  personId: string,
  noteId: string,
  data: Partial<Omit<ConsultationNote, 'id' | 'authorUid' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'people', personId, 'consultations', noteId), data);
}

/** Delete a note. */
export async function deleteNote(
  uid: string,
  personId: string,
  noteId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'people', personId, 'consultations', noteId));
}
