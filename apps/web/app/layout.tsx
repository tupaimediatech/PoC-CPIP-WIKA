// app/layout.tsx
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import DynamicHeader from '@/components/layout/DynamicHeader'; // Impor pembungkus client kita

export const metadata = {
  title: "Project Performance Dashboard – CPIP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <SidebarProvider>
          <LayoutShell>{children}</LayoutShell>
        </SidebarProvider>
        <AuthGuard>
          <AppShell>{children}</AppShell>
        </AuthGuard>
      </body>
    </html>
  );
}
