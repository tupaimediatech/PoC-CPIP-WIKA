'use client';

import { usePathname } from 'next/navigation';
import { HouseIcon, PresentationChartIcon, CaretRightIcon, UploadIcon, FileTextIcon, FunnelIcon } from '@phosphor-icons/react';

type BreadcrumbItem = { icon: React.ReactNode; label: string };

const STATIC_BREADCRUMBS: Record<string, BreadcrumbItem[]> = {
  '/': [
    { icon: <HouseIcon size={14} />, label: 'Home' },
    { icon: <PresentationChartIcon size={14} />, label: 'Infographic Summary' },
  ],
  '/projects': [
    { icon: <PresentationChartIcon size={14} />, label: 'Projects Analytics' },
    { icon: <FileTextIcon size={14} />, label: 'All Projects' },
    { icon: <FunnelIcon size={14} />, label: 'Filtered Results' },
  ],
  '/upload': [
    { icon: <HouseIcon size={14} />, label: 'Home' },
    { icon: <UploadIcon size={14} />, label: 'Data Management' },
  ],
  '/reports': [
    { icon: <PresentationChartIcon size={14} />, label: 'Projects Analytics' },
    { icon: <FileTextIcon size={14} />, label: 'Reports & Pareto' },
  ],
};

function getDynamicBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const base: BreadcrumbItem[] = [
    { icon: <PresentationChartIcon size={14} />, label: 'Projects Analytics' },
    { icon: <FileTextIcon size={14} />, label: 'All Projects' },
  ];

  const segments = pathname.replace('/projects/', '').split('/');

  if (segments.length >= 1 && segments[0]) {
    base.push({ icon: <FileTextIcon size={14} />, label: 'RS Tri Harsi' });
  }
  if (segments.length >= 2) {
    base.push({ icon: <FileTextIcon size={14} />, label: 'Pekerjaan Struktur' });
  }
  if (segments.length >= 3) {
    const lastSeg = segments[segments.length - 1];
    if (lastSeg === 'hpp') {
      base.push({ icon: <FileTextIcon size={14} />, label: 'HPP & Project Performance' });
    } else if (lastSeg === 'risk') {
      base.push({ icon: <FileTextIcon size={14} />, label: 'HPP & Project Performance' });
    } else {
      base.push({ icon: <FileTextIcon size={14} />, label: 'Detail Sumber Daya' });
    }
  }
  if (segments.length >= 4) {
    const lastSeg = segments[segments.length - 1];
    if (lastSeg === 'hpp') {
      // already added above
    } else if (lastSeg === 'risk') {
      // already added above
    } else {
      base.push({ icon: <FileTextIcon size={14} />, label: 'Detail Vendor' });
    }
  }

  return base;
}

export default function Breadcrumbs() {
  const pathname = usePathname();

  let items: BreadcrumbItem[];
  if (STATIC_BREADCRUMBS[pathname]) {
    items = STATIC_BREADCRUMBS[pathname];
  } else if (pathname.startsWith('/projects/')) {
    items = getDynamicBreadcrumbs(pathname);
  } else {
    items = STATIC_BREADCRUMBS['/'];
  }

  return (
    <div
      className="flex items-center bg-white border-b border-[#E9E9EA]"
      style={{ height: '50px', padding: '0 32px' }}
    >
      <div
        className="flex items-center bg-[#F9FAFB] rounded-lg px-4"
        style={{ height: '34px' }}
      >
        <div className="flex items-center gap-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && (
                <CaretRightIcon size={8} className="text-gray-400" />
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">{item.icon}</span>
                <span className="text-[12px] font-medium text-gray-600">
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
