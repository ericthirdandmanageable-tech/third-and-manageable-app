import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { LegalDocument as LegalDocumentValue } from "@/lib/core/legal";

export default function LegalDocument({ document }: { document: LegalDocumentValue }) {
    return (
        <main className="safe-viewport min-h-[100svh] bg-bg-base px-6 py-10 text-text-primary">
            <article className="mx-auto max-w-3xl">
                <Link href="/profile" className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary transition hover:border-volt/50 hover:text-volt">
                    <ArrowLeft className="h-4 w-4" /> Back to Profile
                </Link>
                <header className="mt-8 mb-10">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">Last updated {document.lastUpdated}</p>
                    <h1 className="mt-2 font-serif text-5xl italic text-sand">{document.title}</h1>
                    <div className="yard-line mt-5" />
                </header>
                <div className="space-y-5">
                    {document.sections.map((section) => (
                        <section key={section.heading} className="rounded-[20px] border border-border-subtle bg-bg-surface p-6 md:p-8">
                            <h2 className="text-lg font-semibold text-text-primary">{section.heading}</h2>
                            <div className="mt-3 space-y-3">
                                {section.paragraphs.map((paragraph) => (
                                    <p key={paragraph} className="text-[14px] leading-7 text-text-secondary">{paragraph}</p>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </article>
        </main>
    );
}
