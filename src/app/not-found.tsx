import Link from "next/link";
import { Compass } from "lucide-react";

/*
 * 404. This is the root not-found boundary, so it catches unmatched URLs for
 * the whole deployment — including `/admin/*`, which has no gated equivalent
 * to fall back to.
 *
 * The prototype rendered its 404 inside the app shell, with the tab bar still
 * working. That is not reproducible here without either duplicating the shell
 * (and its auth context) for an error page, or pushing the boundary down into
 * the route group and leaving genuinely unknown top-level paths unhandled.
 * A self-contained page with a way home is the honest trade.
 */
export default function NotFound() {
    return (
        <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
            <div className="max-w-xl mx-auto animate-rise text-center">
                <div className="w-16 h-16 bg-bg-surface border border-border-subtle rounded-full flex items-center justify-center mx-auto mb-6">
                    <Compass className="w-8 h-8 text-volt" />
                </div>
                <h1 className="font-serif text-4xl text-sand italic mb-3">Out of bounds</h1>
                <p className="text-[15px] text-text-secondary mb-8">
                    This page isn&apos;t on the depth chart. It may have moved, or the link is off.
                </p>
                <Link
                    href="/"
                    className="bg-volt text-volt-ink font-semibold px-6 py-3 rounded-full inline-block hover:bg-volt/90 transition-all"
                >
                    Back to today&apos;s check-in
                </Link>
            </div>
        </div>
    );
}
