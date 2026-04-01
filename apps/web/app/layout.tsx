// app/layout.tsx
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import DynamicHeader from '@/components/layout/DynamicHeader';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

export const metadata = {
  title: 'Project Performance Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <Sidebar />
        <main className="ml-59.25 bg-white">
          <DynamicHeader />
          <Breadcrumbs />
          <div className="relative w-full">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
