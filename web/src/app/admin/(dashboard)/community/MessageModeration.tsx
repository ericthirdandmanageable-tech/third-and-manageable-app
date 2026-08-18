"use client";

import {
    Ban,
    MessageSquareOff,
    ShieldOff,
    Trash2,
    User,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  sport: string;
  content: string;
  created_at: string;
}

export default function MessageModeration({
  messages,
}: {
  messages: Message[];
}) {
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const router = useRouter();

  const handleDeleteMessage = async (messageId: string) => {
    setLoading("delete-msg");
    try {
      await fetch("/api/delete-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      setSelectedMsg(null);
      setConfirmAction(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to delete message:", err);
    } finally {
      setLoading(null);
    }
  };

  const handleBanFromChat = async (userId: string) => {
    setLoading("ban-chat");
    try {
      await fetch("/api/ban-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, banned: true, banType: "chat" }),
      });
      setSelectedMsg(null);
      setConfirmAction(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to ban from chat:", err);
    } finally {
      setLoading(null);
    }
  };

  const handleBanFromPlatform = async (userId: string) => {
    setLoading("ban-platform");
    try {
      await fetch("/api/ban-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, banned: true, banType: "platform" }),
      });
      setSelectedMsg(null);
      setConfirmAction(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to ban from platform:", err);
    } finally {
      setLoading(null);
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="relative">
      {/* Message List */}
      <div className="divide-y divide-gray-800/50">
        {messages.map((msg) => (
          <button
            key={msg.id}
            onClick={() => {
              setSelectedMsg(msg);
              setConfirmAction(null);
            }}
            className={`w-full text-left px-4 sm:px-5 py-3 sm:py-4 hover:bg-gray-800/30 transition-colors ${
              selectedMsg?.id === msg.id
                ? "bg-blue-900/10 border-l-2 border-blue-500"
                : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {msg.display_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-white truncate">
                {msg.display_name}
              </span>
              {msg.sport && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded-full capitalize">
                  {msg.sport.replace("_", " ")}
                </span>
              )}
              <span className="text-[10px] text-gray-600 ml-auto shrink-0">
                {formatTime(msg.created_at)}
              </span>
            </div>
            <p className="text-sm text-gray-300 pl-9 line-clamp-2">
              {msg.content}
            </p>
          </button>
        ))}
        {messages.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No messages yet
          </div>
        )}
      </div>

      {/* Moderation Panel (slides in from right) */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MessageSquareOff size={16} className="text-orange-400" />
                Moderate Message
              </h3>
              <button
                onClick={() => {
                  setSelectedMsg(null);
                  setConfirmAction(null);
                }}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* User Info */}
            <div className="px-5 py-4 border-b border-gray-800/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                  {selectedMsg.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {selectedMsg.display_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <User size={10} className="text-gray-500" />
                    <span className="text-[11px] text-gray-500">
                      ID: {selectedMsg.user_id.slice(0, 12)}...
                    </span>
                  </div>
                </div>
              </div>
              {/* The message */}
              <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50">
                <p className="text-sm text-gray-200 leading-relaxed">
                  {selectedMsg.content}
                </p>
                <p className="text-[10px] text-gray-500 mt-2">
                  {selectedMsg.created_at
                    ? new Date(selectedMsg.created_at).toLocaleString()
                    : "Unknown date"}
                  {" · "}
                  Room: {selectedMsg.room_id}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 space-y-2">
              {confirmAction ? (
                <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
                  <p className="text-sm text-red-300 mb-3">
                    {confirmAction === "delete-msg"
                      ? "Delete this message permanently?"
                      : confirmAction === "ban-chat"
                        ? `Ban ${selectedMsg.display_name} from all chats?`
                        : `Ban ${selectedMsg.display_name} from the entire platform?`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (confirmAction === "delete-msg")
                          handleDeleteMessage(selectedMsg.id);
                        else if (confirmAction === "ban-chat")
                          handleBanFromChat(selectedMsg.user_id);
                        else handleBanFromPlatform(selectedMsg.user_id);
                      }}
                      disabled={loading !== null}
                      className="flex-1 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {loading ? "Processing..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => setConfirmAction(null)}
                      className="flex-1 py-2 text-sm font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmAction("delete-msg")}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    <Trash2 size={16} className="text-orange-400" />
                    Delete Message
                  </button>
                  <button
                    onClick={() => setConfirmAction("ban-chat")}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    <Ban size={16} className="text-yellow-400" />
                    Ban from Chat
                  </button>
                  <button
                    onClick={() => setConfirmAction("ban-platform")}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-red-900/20 hover:bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-300 hover:text-red-200 transition-colors"
                  >
                    <ShieldOff size={16} className="text-red-400" />
                    Ban from Platform
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
