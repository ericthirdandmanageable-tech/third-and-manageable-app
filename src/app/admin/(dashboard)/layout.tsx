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

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto pt-16 lg:pt-8">
                {children}
            </main>
        </div>
    );
}
