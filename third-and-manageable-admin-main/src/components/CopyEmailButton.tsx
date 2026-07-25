"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export default function CopyEmailButton({ email }: { email: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(email);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
            const el = document.createElement("textarea");
            el.value = email;
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!email) return <span className="text-xs text-gray-600">—</span>;

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors group"
            title={`Copy ${email}`}
        >
            <span className="truncate max-w-[160px]">{email}</span>
            {copied ? (
                <Check size={12} className="text-green-400 shrink-0" />
            ) : (
                <Copy size={12} className="text-gray-500 group-hover:text-blue-400 shrink-0" />
            )}
        </button>
    );
}
