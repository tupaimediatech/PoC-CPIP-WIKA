// app/layout.tsx
import './globals.css';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import LayoutShell from '@/components/layout/LayoutShell';

export const metadata = {
  title: 'Project Performance Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <SidebarProvider>
          <LayoutShell>{children}</LayoutShell>
        </SidebarProvider>
      </body>
    </html>
  );
}
