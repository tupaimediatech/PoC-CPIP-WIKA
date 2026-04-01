'use client';

import { usePathname } from 'next/navigation';
import { HouseIcon, PresentationChartIcon, CaretRightIcon, UploadIcon, FileTextIcon } from '@phosphor-icons/react';

const ROUTE_BREADCRUMBS: Record<string, { icon: React.ReactNode; label: string }[]> = {
  '/': [
    { icon: <HouseIcon size={14} />, label: 'Home' },
    { icon: <PresentationChartIcon size={14} />, label: 'Infographic Summary' },
  ],
  '/projects': [
    { icon: <PresentationChartIcon size={14} />, label: 'Projects Analytics' },
    { icon: <FileTextIcon size={14} />, label: 'All Projects' },
  ],
  '/upload': [
    { icon: <HouseIcon size={14} />, label: 'Home' },
    { icon: <UploadIcon size={14} />, label: 'Data Management' },
  ],
  '/reports': [
    { icon: <HouseIcon size={14} />, label: 'Home' },
    { icon: <FileTextIcon size={14} />, label: 'Reports and Pareto' },
  ],
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const items = ROUTE_BREADCRUMBS[pathname] || ROUTE_BREADCRUMBS['/'];

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
