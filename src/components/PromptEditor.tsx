"use client";

import { MessageCircle, Save, User } from "lucide-react";
import { useState } from "react";

const MAX_PROMPT_LENGTH = 280;

interface PromptEditorProps {
    roomId: string;
    roomName: string;
    roomType: string;
    currentPrompt: string;
    currentAuthor: string;
    currentUpdatedAt: string;
}

export default function PromptEditor({
    roomId,
    roomName,
    roomType,
    currentPrompt,
    currentAuthor,
    currentUpdatedAt,
}: PromptEditorProps) {
    const [prompt, setPrompt] = useState(currentPrompt);
    const [authorName, setAuthorName] = useState(currentAuthor);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        if (!prompt.trim() || !authorName.trim()) {
            setError("Both prompt and author name are required.");
            return;
        }
        if (prompt.trim().length > MAX_PROMPT_LENGTH) {
            setError(`Prompt must be ${MAX_PROMPT_LENGTH} characters or less.`);
            return;
        }

        setSaving(true);
        setError("");
        setSuccess(false);

        try {
            const res = await fetch("/api/update-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId, prompt: prompt.trim(), authorName: authorName.trim() }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to update prompt.");
            } else {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            }
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const charsRemaining = MAX_PROMPT_LENGTH - prompt.trim().length;
    const isOverLimit = charsRemaining < 0;

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <MessageCircle size={16} className="text-blue-400" />
                    <h3 className="text-sm sm:text-base font-semibold text-white">{roomName}</h3>
                    <span className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-full">{roomType}</span>
                </div>
                {currentUpdatedAt && (
                    <span className="text-[10px] text-gray-500">
                        Updated {new Date(currentUpdatedAt).toLocaleDateString()}
                    </span>
                )}
            </div>

            {/* Prompt input */}
            <label className="block text-xs text-gray-400 mb-1.5">Today&apos;s Chat Prompt</label>
            <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter today's conversation prompt for this room..."
                maxLength={MAX_PROMPT_LENGTH + 10}
            />
            <div className="flex justify-end mt-1 mb-3">
                <span className={`text-[10px] ${isOverLimit ? "text-red-400" : charsRemaining <= 30 ? "text-yellow-400" : "text-gray-500"}`}>
                    {charsRemaining} characters remaining
                </span>
            </div>

            {/* Author name input */}
            <label className="block text-xs text-gray-400 mb-1.5">
                <User size={12} className="inline mr-1" />
                Prompt Author
            </label>
            <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors mb-4"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Name of the person who wrote this prompt"
                maxLength={50}
            />

            {/* Save button + status */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleSave}
                    disabled={saving || isOverLimit || !prompt.trim() || !authorName.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <Save size={14} />
                    {saving ? "Saving..." : "Save Prompt"}
                </button>
                {success && (
                    <span className="text-xs text-green-400">✓ Prompt updated successfully</span>
                )}
                {error && (
                    <span className="text-xs text-red-400">{error}</span>
                )}
            </div>
        </div>
    );
}
