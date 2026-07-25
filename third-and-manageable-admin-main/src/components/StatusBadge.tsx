interface StatusBadgeProps {
    status: string;
    variant?: "default" | "success" | "warning" | "danger" | "info";
}

const VARIANT_STYLES = {
    default: "bg-gray-800 text-gray-300 border-gray-700",
    success: "bg-green-900/30 text-green-400 border-green-800",
    warning: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
    danger: "bg-red-900/30 text-red-400 border-red-800",
    info: "bg-blue-900/30 text-blue-400 border-blue-800",
};

export default function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${VARIANT_STYLES[variant]}`}
        >
            {status}
        </span>
    );
}
