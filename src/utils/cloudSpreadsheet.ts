import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  query,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export interface CloudPassRecord {
  id: string;
  name: string;
  round: number;
  score: number;
  reviewScore: number;
  currentRoundScore: number;
  levelLabel: string;
  passStatus: '합격' | '불합격';
  fullTimestamp: string;
  dateOnly: string;
  timeOnly: string;
  deadlineTime: string;
  status: '정상' | '지각';
}

export interface CloudRosterMember {
  id: string;
  name: string;
  active: 'Y' | 'N';
}

function makeSafeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

function makeRosterId(name: string): string {
  // Encode UTF-8 name into alphanumeric hex ID matching ^[a-zA-Z0-9_\-]+$
  const clean = name.trim();
  let hex = 'member_';
  for (let i = 0; i < clean.length; i++) {
    hex += clean.charCodeAt(i).toString(16);
  }
  return hex.slice(0, 120);
}

export function parseNameAndLevel(
  rawName: string,
  explicitLevel?: string
): { baseName: string; levelLabel: string } {
  const trimmed = rawName.trim();
  const match = trimmed.match(/^(.*?)\s*\((초급|중급|고급)\)\s*$/);
  if (match) {
    return {
      baseName: match[1].trim() || trimmed,
      levelLabel: explicitLevel || match[2],
    };
  }
  return {
    baseName: trimmed,
    levelLabel: explicitLevel || '고급',
  };
}

/**
 * Saves an exam pass submission directly into the live Cloud Spreadsheet (Firestore)
 * and ensures the student is registered in the roster.
 */
export async function savePassToCloudSpreadsheet(
  record: Omit<CloudPassRecord, 'id'>
): Promise<string> {
  const recordId = makeSafeDocId('pass');
  const path = `pass_records/${recordId}`;
  const { baseName, levelLabel } = parseNameAndLevel(
    record.name,
    record.levelLabel
  );
  const cleanScore = Math.max(0, Math.min(100, Math.round(record.score)));
  const computedPassStatus: '합격' | '불합격' =
    record.passStatus || (cleanScore >= 80 ? '합격' : '불합격');

  try {
    await setDoc(doc(db, 'pass_records', recordId), {
      name: baseName.slice(0, 60),
      round: Math.max(1, Math.min(120, Math.round(record.round))),
      score: cleanScore,
      reviewScore: Math.max(0, Math.min(100, Math.round(record.reviewScore))),
      currentRoundScore: Math.max(
        0,
        Math.min(100, Math.round(record.currentRoundScore))
      ),
      levelLabel: levelLabel.slice(0, 20),
      passStatus: computedPassStatus,
      fullTimestamp: record.fullTimestamp.slice(0, 30),
      dateOnly: record.dateOnly.slice(0, 15),
      timeOnly: record.timeOnly.slice(0, 15),
      deadlineTime: record.deadlineTime.slice(0, 10),
      status: record.status === '지각' ? '지각' : '정상',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  // Also ensure the student is in roster_members
  const memberId = makeRosterId(baseName);
  const rosterPath = `roster_members/${memberId}`;
  try {
    await setDoc(doc(db, 'roster_members', memberId), {
      name: baseName.slice(0, 60),
      active: 'Y',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, rosterPath);
  }

  return recordId;
}

export async function addRosterStudent(name: string): Promise<void> {
  const clean = name.trim().slice(0, 60);
  if (!clean) return;
  const memberId = makeRosterId(clean);
  const path = `roster_members/${memberId}`;
  try {
    await setDoc(doc(db, 'roster_members', memberId), {
      name: clean,
      active: 'Y',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function removeRosterStudent(memberId: string): Promise<void> {
  const path = `roster_members/${memberId}`;
  try {
    await deleteDoc(doc(db, 'roster_members', memberId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribePassRecords(
  onUpdate: (records: CloudPassRecord[]) => void
) {
  const q = query(collection(db, 'pass_records'), where('score', '>=', 0));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CloudPassRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        const { baseName, levelLabel } = parseNameAndLevel(
          String(data.name || ''),
          data.levelLabel ? String(data.levelLabel) : undefined
        );
        const numericScore = Number(data.score ?? 80);
        const passStatus: '합격' | '불합격' =
          data.passStatus === '불합격' || numericScore < 80
            ? '불합격'
            : '합격';
        return {
          id: d.id,
          name: baseName,
          round: Number(data.round || 1),
          score: numericScore,
          reviewScore: Number(data.reviewScore || 0),
          currentRoundScore: Number(data.currentRoundScore || 0),
          levelLabel,
          passStatus,
          fullTimestamp: String(data.fullTimestamp || ''),
          dateOnly: String(data.dateOnly || ''),
          timeOnly: String(data.timeOnly || ''),
          deadlineTime: String(data.deadlineTime || '22:00'),
          status: data.status === '지각' ? '지각' : '정상',
        };
      });
      list.sort((a, b) => b.fullTimestamp.localeCompare(a.fullTimestamp));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pass_records');
    }
  );
}

export function subscribeRosterMembers(
  onUpdate: (members: CloudRosterMember[]) => void
) {
  const q = query(
    collection(db, 'roster_members'),
    where('active', 'in', ['Y', 'N'])
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CloudRosterMember[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name || ''),
          active: data.active === 'N' ? 'N' : 'Y',
        };
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'roster_members');
    }
  );
}
