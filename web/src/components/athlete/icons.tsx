import {
    BarChart3,
    Briefcase,
    Coffee,
    Compass,
    DollarSign,
    MapPin,
    Megaphone,
    MessageSquare,
    Moon,
    Rocket,
    ShieldAlert,
    Timer,
    Trophy,
    type LucideIcon,
    type LucideProps,
} from "lucide-react";

/*
 * Icon-name resolver. `lib/core` stores icon *names* so the rules stay
 * importable from server code (see the note in `lib/core/paths.ts`), and the
 * backend serialises them the same way. This table is where a name becomes a
 * component — add a new icon here.
 */
const ICONS: Record<string, LucideIcon> = {
    BarChart3,
    Briefcase,
    Coffee,
    Compass,
    DollarSign,
    MapPin,
    Megaphone,
    MessageSquare,
    Moon,
    Rocket,
    ShieldAlert,
    Timer,
    Trophy,
};

/*
 * Render a registry icon by name. Callers use this rather than looking the
 * component up themselves: resolving to a component type during render makes
 * the element's identity depend on a lookup, and React remounts the subtree
 * whenever that identity changes. Here the component type is always `Icon`.
 *
 * An unknown name falls back to a generic glyph rather than rendering nothing
 * — registry drift should look wrong, not disappear.
 */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
    const Glyph = ICONS[name] ?? MessageSquare;
    return <Glyph {...props} />;
}
