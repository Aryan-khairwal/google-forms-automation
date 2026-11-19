import { useEffect, useRef, useState } from "react";

const CHAT_PREFIX = "checkin-conversation:";
const ACTIVE_CHAT_KEY = "checkin-active-conversation";

function parseConversation(value) {
  try {
    const chat = JSON.parse(value);
    return typeof chat?.id === "string" && Array.isArray(chat.messages) ? chat : null;
  } catch {
    return null;
  }
}

function loadHistory() {
  try {
    const conversations = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(CHAT_PREFIX)) continue;
      const chat = parseConversation(localStorage.getItem(key));
      if (chat) conversations.push(chat);
    }
    return {
      conversations,
      activeId: localStorage.getItem(ACTIVE_CHAT_KEY) || crypto.randomUUID(),
      storageError: null
    };
  } catch {
    return {
      conversations: [],
      activeId: crypto.randomUUID(),
      storageError: "This browser is blocking conversation history from being saved."
    };
  }
}

export default function useConversationHistory() {
  const [initial] = useState(loadHistory);
  const [conversations, setConversations] = useState(initial.conversations);
  const [activeId, setActiveId] = useState(initial.activeId);
  const [storageError, setStorageError] = useState(initial.storageError);
  const unsavedChats = useRef(new Map());

  useEffect(() => {
    function syncStorage(event) {
      if (!event.key) {
        setConversations([...unsavedChats.current.values()]);
        return;
      }
      if (!event.key.startsWith(CHAT_PREFIX)) return;
      const id = event.key.slice(CHAT_PREFIX.length);
      if (unsavedChats.current.has(id)) return;
      const updated = parseConversation(event.newValue);
      setConversations((previous) => {
        const otherChats = previous.filter((chat) => chat.id !== id);
        return updated ? [...otherChats, updated] : otherChats;
      });
    }
    window.addEventListener("storage", syncStorage);
    return () => window.removeEventListener("storage", syncStorage);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_CHAT_KEY, activeId);
    } catch {
      setStorageError("This browser could not remember the last open conversation.");
    }
  }, [activeId]);

  function updateConversation(id, update, createIfMissing = false) {
    const storageKey = CHAT_PREFIX + id;
    let chat = unsavedChats.current.get(id);
    try {
      chat ??= parseConversation(localStorage.getItem(storageKey));
    } catch {
      chat ??= conversations.find((candidate) => candidate.id === id);
    }
    if (!chat && !createIfMissing) return;

    const updated = {
      ...update(chat || { id, messages: [], formData: null }),
      updatedAt: Date.now()
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      unsavedChats.current.delete(id);
      if (unsavedChats.current.size === 0) setStorageError(null);
    } catch {
      unsavedChats.current.set(id, updated);
      setStorageError("This browser could not save your latest conversation changes.");
    }
    setConversations((previous) => [...previous.filter((item) => item.id !== id), updated]);
    return updated;
  }

  function deleteConversation(id) {
    try {
      localStorage.removeItem(CHAT_PREFIX + id);
    } catch {
      setStorageError("This browser could not delete the conversation.");
      return;
    }
    unsavedChats.current.delete(id);
    if (unsavedChats.current.size === 0) setStorageError(null);
    setConversations((previous) => previous.filter((chat) => chat.id !== id));
    if (id === activeId) setActiveId(crypto.randomUUID());
  }

  return {
    conversations: [...conversations].sort((first, second) => second.updatedAt - first.updatedAt),
    activeId,
    activeChat: conversations.find((chat) => chat.id === activeId),
    storageError,
    selectConversation: setActiveId,
    newConversation: () => setActiveId(crypto.randomUUID()),
    updateConversation,
    deleteConversation
  };
}
