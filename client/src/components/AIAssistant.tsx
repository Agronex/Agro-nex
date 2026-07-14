import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ChevronDown,
  MessageSquare,
  Plus,
  PencilLine,
  PauseCircle,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";
import { BACKEND_URL } from "../config/backend";
import { useAuth } from "../contexts/AuthContext";
import { useUserSettings } from "../contexts/UserSettingsContext";
import {
  appendChatMessage,
  createChatThread,
  deleteChatThread,
  listChatThreads,
  loadChatMessages,
  renameChatThread,
} from "../services/chatService";
import { ChatMessage, ChatThread } from "../types";

type DisplayMessage = ChatMessage & { pending?: boolean };

const ACTIVE_THREAD_KEY = (uid: string) => `agronex_chat_active_thread_${uid}`;

function previewTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 38 ? `${clean.slice(0, 38)}…` : clean || "New conversation";
}

function normalizeText(text: string) {
  return text.split("\u0000").join("").trim();
}

function assistantPrompt(settingsTone: string, responseLength: string, practicalBias: boolean) {
  return `Preference note: respond in a ${settingsTone} tone, keep answers ${responseLength}, and ${practicalBias ? "focus on practical farm actions" : "balance practical and explanatory detail"}.`;
}

async function readSseStream(
  response: Response,
  onToken: (content: string) => void,
  signal?: AbortSignal,
) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response body is unavailable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const separatorIndex = buffer.indexOf("\n\n");
      if (separatorIndex === -1) break;

      const chunk = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      let eventName = "message";
      let payload = "";

      chunk.split("\n").forEach((line) => {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          payload += line.slice(5).trim();
        }
      });

      if (!payload) continue;
      if (eventName === "token") {
        const data = JSON.parse(payload) as { content?: string };
        if (data.content) onToken(data.content);
      } else if (eventName === "error") {
        const data = JSON.parse(payload) as { message?: string };
        throw new Error(data.message || "Streaming failed.");
      } else if (eventName === "done") {
        return;
      }
    }
  }
}

const AIAssistantPopup: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [threadTitleDraft, setThreadTitleDraft] = useState("");
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const [status, setStatus] = useState<string>("Ready");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const currentThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) || null,
    [threads, activeThreadId],
  );

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setLoadingThreads(true);

    const hydrate = async () => {
      const loadedThreads = await listChatThreads(user.uid);
      if (cancelled) return;

      setThreads(loadedThreads);

      const storedThreadId = localStorage.getItem(ACTIVE_THREAD_KEY(user.uid));
      const firstThread = loadedThreads.find((thread) => thread.id === storedThreadId) || loadedThreads[0];

      if (firstThread) {
        setActiveThreadId(firstThread.id);
        setThreadTitleDraft(firstThread.title);
      } else {
        const created = await createChatThread(user.uid);
        if (cancelled) return;
        setThreads([created]);
        setActiveThreadId(created.id);
        setThreadTitleDraft(created.title);
        localStorage.setItem(ACTIVE_THREAD_KEY(user.uid), created.id);
      }
    };

    hydrate()
      .catch((error) => {
        console.error("Failed to load chat threads:", error);
        setStatus("Chat unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoadingThreads(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !activeThreadId) return;

    let cancelled = false;
    setLoadingMessages(true);

    loadChatMessages(user.uid, activeThreadId)
      .then((loadedMessages) => {
        if (cancelled) return;
        setMessages(loadedMessages);
      })
      .catch((error) => {
        console.error("Failed to load chat messages:", error);
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeThreadId, user]);

  useEffect(() => {
    if (currentThread && !editingTitle) {
      setThreadTitleDraft(currentThread.title);
    }
  }, [currentThread, editingTitle]);

  useEffect(() => {
    if (user && activeThreadId) {
      localStorage.setItem(ACTIVE_THREAD_KEY(user.uid), activeThreadId);
    }
  }, [activeThreadId, user]);

  const buildConversation = useCallback(
    (extraUserMessage?: string) => {
      const systemNote = assistantPrompt(settings.ai.tone, settings.ai.responseLength, settings.ai.practicalBias);
      const history = messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .slice(-settings.ai.memoryDepth)
        .map((message) => ({ role: message.role, content: message.content }));

      const convo = [{ role: "system" as const, content: systemNote }, ...history];
      if (extraUserMessage) {
        convo.push({ role: "user" as const, content: extraUserMessage });
      }
      return convo;
    },
    [messages, settings.ai.memoryDepth, settings.ai.practicalBias, settings.ai.responseLength, settings.ai.tone],
  );

  const updateThreadList = useCallback((threadId: string, updates: Partial<ChatThread>) => {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              ...updates,
            }
          : thread,
      ),
    );
  }, []);

  const handleCreateThread = useCallback(async () => {
    if (!user) return;
    if (threads.length >= 20) {
      const oldest = threads[threads.length - 1];
      if (oldest) {
        await deleteChatThread(user.uid, oldest.id);
      }
    }
    const thread = await createChatThread(user.uid, "New conversation");
    setThreads((prev) => [thread, ...prev].slice(0, 20));
    setActiveThreadId(thread.id);
    setMessages([]);
    setThreadTitleDraft(thread.title);
    setEditingTitle(false);
    setThreadMenuOpen(false);
  }, [threads, user]);

  const handleThreadSelect = useCallback(
    async (threadId: string) => {
      if (threadId === activeThreadId) return;
      setActiveThreadId(threadId);
      setEditingTitle(false);
      setThreadMenuOpen(false);
      setStatus("Loading thread");
    },
    [activeThreadId],
  );

  const handleRenameThread = useCallback(async () => {
    if (!user || !activeThreadId) return;
    const title = previewTitle(threadTitleDraft);
    setThreadTitleDraft(title);
    await renameChatThread(user.uid, activeThreadId, title);
    updateThreadList(activeThreadId, { title });
    setEditingTitle(false);
  }, [activeThreadId, threadTitleDraft, updateThreadList, user]);

  const handleDeleteThread = useCallback(async (threadId: string) => {
    if (!user) return;
    const ok = window.confirm("Delete this chat thread?");
    if (!ok) return;

    await deleteChatThread(user.uid, threadId);
    const remaining = threads.filter((thread) => thread.id !== threadId);
    setThreads(remaining);

    if (threadId === activeThreadId) {
      if (remaining.length > 0) {
        setActiveThreadId(remaining[0].id);
        setThreadTitleDraft(remaining[0].title);
      } else {
        const created = await createChatThread(user.uid, "New conversation");
        setThreads([created]);
        setActiveThreadId(created.id);
        setThreadTitleDraft(created.title);
      }
    }
  }, [activeThreadId, threads, user]);

  const persistAssistantResponse = useCallback(async (threadId: string, content: string) => {
    if (!user) return;
    const saved = await appendChatMessage(user.uid, threadId, {
      role: "assistant",
      content: normalizeText(content),
    });

    setMessages((prev) => {
      const hasPending = prev.some((message) => message.id === "pending-assistant");
      return hasPending
        ? prev.map((message) => (message.id === "pending-assistant" ? saved : message))
        : [...prev, saved];
    });
    updateThreadList(threadId, {
      lastMessagePreview: content,
    });
  }, [updateThreadList, user]);

  const sendNonStreaming = useCallback(
    async (threadId: string, userText: string) => {
      const payload = {
        messages: buildConversation(userText),
        options: {
          temperature: settings.ai.temperature,
          maxTokens: settings.ai.maxTokens,
        },
      };

      const response = await fetchWithTimeout(
        `${BACKEND_URL}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        90_000,
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.details || error?.error || "AI service error");
      }

      const data = await response.json();
      const reply = normalizeText(data.reply ?? "I couldn't generate a response.");
      setStreamingText("");
      await persistAssistantResponse(threadId, reply);
      setStatus(data.model ? `Answered via ${data.model}` : "Answered");
    },
    [buildConversation, persistAssistantResponse, settings.ai.maxTokens, settings.ai.temperature],
  );

  const sendStreaming = useCallback(
    async (threadId: string, userText: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), 90_000);

      const pendingId = "pending-assistant";
      setMessages((prev) => [
        ...prev,
        {
          id: pendingId,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
          pending: true,
        },
      ]);

      try {
        const response = await fetch(`${BACKEND_URL}/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: buildConversation(userText),
            options: {
              temperature: settings.ai.temperature,
              maxTokens: settings.ai.maxTokens,
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error?.details || error?.error || "AI stream error");
        }

        let assistantText = "";
        await readSseStream(
          response,
          (token) => {
            assistantText += token;
            setStreamingText(assistantText);
            setMessages((prev) =>
              prev.map((message) =>
                message.id === pendingId ? { ...message, content: assistantText } : message,
              ),
            );
          },
          controller.signal,
        );

        await persistAssistantResponse(threadId, assistantText);
        setStreamingText("");
        setStatus("Streaming complete");
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [buildConversation, persistAssistantResponse, settings.ai.maxTokens, settings.ai.temperature],
  );

  const sendMessage = useCallback(
    async (text?: string) => {
      const trimmed = normalizeText(text ?? inputMessage);
      if (!trimmed || sending || !user || !activeThreadId) return;

      setSending(true);
      setStatus(settings.ai.streamingEnabled ? "Streaming" : "Thinking");

      const userMessage: DisplayMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputMessage("");

      try {
        const savedUser = await appendChatMessage(user.uid, activeThreadId, {
          role: "user",
          content: trimmed,
        });

        setMessages((prev) => prev.map((message) => (message.id === userMessage.id ? savedUser : message)));

        const firstUserMessage = messages.find((message) => message.role === "user")?.content || trimmed;
        if (currentThread && currentThread.title === "New conversation") {
          const title = previewTitle(firstUserMessage);
          setThreadTitleDraft(title);
          await renameChatThread(user.uid, activeThreadId, title);
          updateThreadList(activeThreadId, { title });
        }

        if (settings.ai.streamingEnabled) {
          await sendStreaming(activeThreadId, trimmed);
        } else {
          await sendNonStreaming(activeThreadId, trimmed);
        }
      } catch (error) {
        console.error("Chat send error:", error);
        setStatus(error instanceof Error ? error.message : "Chat failed");
        setMessages((prev) => prev.filter((message) => message.id !== "pending-assistant"));
      } finally {
        abortRef.current = null;
        setSending(false);
      }
    },
    [
      activeThreadId,
      currentThread,
      inputMessage,
      messages,
      sendNonStreaming,
      sendStreaming,
      sending,
      settings.ai.streamingEnabled,
      user,
      updateThreadList,
    ],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
    setStatus("Streaming stopped");
  }, []);

  const quickQs = [
    "Best crop for this season?",
    "Should I irrigate today?",
    "Tips for pest control",
    "Fertilizer advice",
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="chatbox"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 w-full md:w-[460px] h-[640px] max-h-[92vh] bg-white shadow-2xl rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden border border-gray-200"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-green-600 via-emerald-600 to-sky-600 text-white p-4">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_28%)]" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0"
                  >
                    <Bot className="w-5 h-5" />
                  </motion.div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold">AI Farming Assistant</h3>
                      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px]">Live</span>
                    </div>
                    <p className="text-xs text-white/80 mt-1">
                      {settings.ai.streamingEnabled ? "Streaming replies enabled" : "Fast reply mode"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="p-2 rounded-xl hover:bg-white/10 min-h-10 min-w-10 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative mt-4 flex items-center gap-2">
                <button
                  onClick={() => setThreadMenuOpen((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-sm backdrop-blur hover:bg-white/20 min-w-0"
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate max-w-[180px]">{currentThread?.title || "Conversation"}</span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </button>
                <button
                  onClick={handleCreateThread}
                  className="inline-flex items-center gap-1 rounded-2xl bg-white/15 px-3 py-2 text-sm backdrop-blur hover:bg-white/20"
                >
                  <Plus className="h-4 w-4" />
                  New
                </button>
                <div className="ml-auto text-[11px] text-white/75">{status}</div>
              </div>

              <AnimatePresence>
                {threadMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute left-4 right-4 top-[88px] z-20 rounded-2xl border border-white/20 bg-white text-gray-800 shadow-2xl backdrop-blur"
                  >
                    <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-semibold">Threads</span>
                      <span className="text-xs text-gray-500">{threads.length}/20</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {loadingThreads ? (
                        <div className="p-4 text-sm text-gray-500">Loading threads…</div>
                      ) : threads.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">No threads yet.</div>
                      ) : (
                        threads.map((thread) => (
                          <div
                            key={thread.id}
                            className={`flex items-center gap-2 px-3 py-2 border-b last:border-b-0 ${thread.id === activeThreadId ? "bg-green-50" : "bg-white"}`}
                          >
                            <button
                              onClick={() => handleThreadSelect(thread.id)}
                              className="flex-1 text-left min-w-0"
                            >
                              <div className="text-sm font-medium truncate">{thread.title}</div>
                              <div className="text-xs text-gray-500 truncate">{thread.lastMessagePreview || "No messages yet"}</div>
                            </button>
                            <button
                              onClick={() => handleDeleteThread(thread.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                              aria-label={`Delete ${thread.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {editingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={threadTitleDraft}
                        onChange={(e) => setThreadTitleDraft(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button onClick={handleRenameThread} className="rounded-xl bg-green-600 px-3 py-2 text-sm text-white">
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingTitle(true)}
                      className="flex items-center gap-2 text-left text-sm font-semibold text-gray-800 hover:text-green-700"
                    >
                      <span className="truncate">{currentThread?.title || "New conversation"}</span>
                      <PencilLine className="h-4 w-4 shrink-0" />
                    </button>
                  )}
                </div>
                {sending && (
                  <button
                    onClick={stopStreaming}
                    className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <PauseCircle className="h-4 w-4" />
                    Stop
                  </button>
                )}
              </div>
            </div>

            <div ref={containerRef} className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_28%),linear-gradient(to_bottom,white,#f8fafc)] px-4 py-4 space-y-4">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  Loading conversation…
                </div>
              ) : messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex h-full flex-col items-center justify-center text-center px-6 py-8"
                >
                  <div className="relative mb-5">
                    <div className="absolute inset-0 rounded-full bg-green-200/40 blur-xl" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-lg border border-green-100">
                      <Sparkles className="h-7 w-7 text-green-600" />
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800">Ask anything about your farm</h4>
                  <p className="mt-2 max-w-xs text-sm text-gray-500">
                    Get practical crop, weather, irrigation, and disease advice in a clean conversation flow.
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 shrink-0">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[82%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
                          message.role === "user"
                            ? "bg-green-600 text-white"
                            : "bg-white text-gray-800 border border-gray-200"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none prose-headings:mb-2 prose-headings:mt-4 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-a:text-green-700 prose-strong:text-gray-900">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                              {message.content || (message.pending ? "…" : "")}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        )}
                        <div className={`mt-2 text-[10px] ${message.role === "user" ? "text-white/70" : "text-gray-400"}`}>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {message.pending ? " · streaming…" : ""}
                        </div>
                      </div>
                      {message.role === "user" && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            <div className="border-t border-gray-200 bg-white p-4">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {quickQs.map((question) => (
                  <button
                    key={question}
                    onClick={() => sendMessage(question)}
                    disabled={sending}
                    className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs text-gray-700 hover:bg-green-50 hover:border-green-200 disabled:opacity-60"
                  >
                    {question}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!sending) sendMessage();
                    }
                  }}
                  placeholder="Ask about crops, weather, or pests..."
                  rows={1}
                  className="min-h-[52px] flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={sending || !inputMessage.trim()}
                  aria-label="Send message"
                  className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-green-600 text-white shadow-lg hover:bg-green-700 disabled:opacity-60"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="relative h-14 w-14 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-2xl shadow-green-500/30 flex items-center justify-center hover:scale-105 transition-transform"
      >
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        </motion.div>
      </button>
    </div>
  );
};

export default AIAssistantPopup;
