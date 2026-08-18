import { AuthProvider } from "@/lib/athlete/auth";

/*
 * Athlete route group. The parentheses keep it out of the URL: this layout
 * wraps `/`, `/game-plan`, `/community`, … and NOT `/admin/*`, which has its
 * own tree and its own (cookie-based) session.
 *
 * Only the auth context lives here, not the app chrome — `/onboarding` needs
 * the athlete session but deliberately renders without the tab bar, exactly as
 * the prototype's `(auth)` route group did. The chrome is one level down, in
 * `(shell)`.
 */
export default function AthleteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AuthProvider>{children}</AuthProvider>;
}
