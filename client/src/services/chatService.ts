import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { ChatMessage, ChatThread } from "../types";

const THREAD_LIMIT = 20;
const MESSAGE_LIMIT = 100;

function threadsCollection(uid: string) {
  return collection(db, "users", uid, "chatThreads");
}

function messagesCollection(uid: string, threadId: string) {
  return collection(db, "users", uid, "chatThreads", threadId, "messages");
}

function toIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function preview(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 120) || "New conversation";
}

export async function listChatThreads(uid: string): Promise<ChatThread[]> {
  const snapshot = await getDocs(query(threadsCollection(uid), orderBy("updatedAt", "desc"), limit(THREAD_LIMIT)));
  return snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      id: entry.id,
      title: data.title || "New conversation",
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
      lastMessagePreview: data.lastMessagePreview || "",
      messageCount: data.messageCount || 0,
    };
  });
}

export async function createChatThread(uid: string, title = "New conversation"): Promise<ChatThread> {
  const threadRef = doc(collection(db, "users", uid, "chatThreads"));
  const now = serverTimestamp();
  await setDoc(threadRef, {
    title,
    createdAt: now,
    updatedAt: now,
    lastMessagePreview: "",
    messageCount: 0,
  });

  return {
    id: threadRef.id,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMessagePreview: "",
    messageCount: 0,
  };
}

export async function loadChatMessages(uid: string, threadId: string): Promise<ChatMessage[]> {
  const snapshot = await getDocs(query(messagesCollection(uid, threadId), orderBy("timestamp", "asc"), limit(MESSAGE_LIMIT)));
  return snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      id: entry.id,
      role: data.role,
      content: data.content,
      timestamp: toIso(data.timestamp),
    };
  });
}

export async function appendChatMessage(uid: string, threadId: string, message: Omit<ChatMessage, "id" | "timestamp">) {
  const threadRef = doc(db, "users", uid, "chatThreads", threadId);
  const messageRef = await addDoc(messagesCollection(uid, threadId), {
    role: message.role,
    content: message.content,
    timestamp: serverTimestamp(),
  });

  await setDoc(
    threadRef,
    {
      updatedAt: serverTimestamp(),
      lastMessagePreview: preview(message.content),
      messageCount: increment(1),
    },
    { merge: true },
  );

  return {
    id: messageRef.id,
    role: message.role,
    content: message.content,
    timestamp: new Date().toISOString(),
  };
}

export async function updateChatThreadMeta(
  uid: string,
  threadId: string,
  data: Partial<Pick<ChatThread, "title" | "lastMessagePreview" | "messageCount">>,
) {
  await setDoc(
    doc(db, "users", uid, "chatThreads", threadId),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function renameChatThread(uid: string, threadId: string, title: string) {
  await setDoc(doc(db, "users", uid, "chatThreads", threadId), { title, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteChatThread(uid: string, threadId: string) {
  const threadRef = doc(db, "users", uid, "chatThreads", threadId);
  const messagesSnap = await getDocs(collection(db, "users", uid, "chatThreads", threadId, "messages"));

  await Promise.all(messagesSnap.docs.map((entry) => deleteDoc(entry.ref)));
  await deleteDoc(threadRef);
}
