import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono, Raleway } from "next/font/google";

import "./globals.css";

/*
 * Fonts are self-hosted at build time. The prototype pulled all three from
 * fonts.googleapis.com with a render-blocking <link> plus two preconnects
 * (VERCEL_MIGRATION_PLAN.md §3, dependency 16); `next/font/google` downloads
 * and serves them from our own origin instead, so there is no third-party
 * request and no layout shift waiting on one.
 *
 * Each exposes a CSS variable that globals.css binds to a Tailwind theme
 * token. Raleway is here only for the admin portal — see `--font-admin`.
 */

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

const instrumentSerif = Instrument_Serif({
    subsets: ["latin"],
    weight: "400",
    style: ["normal", "italic"],
    variable: "--font-instrument-serif",
    display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-jetbrains-mono",
    display: "swap",
});

const raleway = Raleway({
    subsets: ["latin"],
    variable: "--font-raleway",
    display: "swap",
});

export const metadata: Metadata = {
    title: "Third & Manageable",
    description: "A daily game plan for athletes in transition.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html
            lang="en"
            className={`dark ${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} ${raleway.variable}`}
        >
            {/* Surface colours belong to the route groups, not here: the athlete
                app and the admin portal are different designs sharing one
                document. `body` only carries the base defined in globals.css. */}
            <body>{children}</body>
        </html>
    );
}
