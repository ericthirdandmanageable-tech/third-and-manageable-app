import { type LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: { value: number; label: string };
}

export default function StatCard({ title, value, subtitle, icon: Icon, trend }: StatCardProps) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6 hover:border-gray-700 transition-colors">
            <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-400 font-medium">{title}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-1 sm:mt-2 truncate">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                    {trend && (
                        <p className={`text-xs mt-2 ${trend.value >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
                        </p>
                    )}
                </div>
                <div className="p-2 bg-gray-800 rounded-lg shrink-0 ml-3">
                    <Icon size={20} className="text-blue-400" />
                </div>
            </div>
        </div>
    );
}
