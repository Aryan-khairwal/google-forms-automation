import React from "react";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import formTemplates from "../../config/formTemplates.json";

function conversationTitle(chat) {
  const firstMessage = chat.messages.find((message) => message?.role === "user" && typeof message.content === "string");
  const template = Object.hasOwn(formTemplates, chat.formId) ? formTemplates[chat.formId] : formTemplates.checkin;
  return firstMessage?.content.trim().split(/\s+/).join(" ").slice(0, 80) || `${template.label} draft`;
}

export default function ConversationHistory({ conversations, activeId, storageError, onSelect, onNew, onDelete }) {
  return (
    <nav
      id="conversation-history"
      aria-label="Conversations"
      className="absolute inset-y-0 left-0 z-20 flex w-64 max-w-[85vw] min-h-0 flex-col border-r border-slate-200 bg-white p-3 shadow-xl xl:static xl:shrink-0 xl:shadow-none"
    >
      <button
        type="button"
        onClick={onNew}
        className="flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        <Plus className="h-4 w-4" />
        New chat
      </button>

      <h2 className="mb-2 mt-5 px-2 text-xs font-semibold text-slate-500">Recent chats</h2>
      {storageError && <p role="status" className="mb-2 px-2 text-xs text-rose-700">{storageError}</p>}
      {conversations.length === 0 ? (
        <p className="px-2 text-xs text-slate-500">No saved chats yet.</p>
      ) : (
        <ul className="min-h-0 space-y-1 overflow-y-auto">
          {conversations.map((chat) => {
            const title = conversationTitle(chat);
            const active = chat.id === activeId;
            return (
              <li key={chat.id} className={`flex items-center rounded-lg ${active ? "bg-brand-50 text-brand-900" : "text-slate-700 hover:bg-slate-100"}`}>
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => onSelect(chat.id)}
                  title={title}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="truncate">{title}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete chat ${title}`}
                  onClick={() => {
                    if (window.confirm(`Delete “${title}” from this browser?`)) onDelete(chat.id);
                  }}
                  className="mr-1 rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
