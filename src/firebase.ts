import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use defined database ID if specified, otherwise fall back to standard '(default)' database
const dbId = (firebaseConfig as any).firestoreDatabaseId && 
             (firebaseConfig as any).firestoreDatabaseId !== "" && 
             (firebaseConfig as any).firestoreDatabaseId !== "(default)"
  ? (firebaseConfig as any).firestoreDatabaseId 
  : undefined;

export const db = getFirestore(app, dbId);

// --- ERROR HANDLING AS INSTRUCTED BY FIRBASE SKILL ---
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
  }
}

// Global listener for quota exceeded errors
let quotaErrorCallback: (() => void) | null = null;
export function onQuotaError(callback: () => void) {
  quotaErrorCallback = callback;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.toLowerCase().includes("quota exceeded") || 
      errMsg.toLowerCase().includes("quota limit") || 
      errMsg.toLowerCase().includes("quota metric")) {
    if (quotaErrorCallback) {
      quotaErrorCallback();
    }
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
