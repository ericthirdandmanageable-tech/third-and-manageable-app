import Sidebar from "@/components/Sidebar";
import { verifyAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) redirect("/admin/login");

    // The admin keeps its own surface colours and typeface; `body` now carries
    // the athlete design system's base (see app/globals.css).
    return (
        <div className="flex min-h-screen bg-gray-950 text-white font-admin">
            <Sidebar />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pt-16 lg:pt-8">
                {children}
            </main>
        </div>
    );
}
