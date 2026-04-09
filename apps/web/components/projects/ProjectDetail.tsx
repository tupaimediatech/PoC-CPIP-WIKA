'use client';

import { useState, useEffect } from 'react';
import { projectApi } from '@/lib/api';
import type { Project } from '@/types/project';
import PerformanceSummary   from '@/components/projects/detail/PerformanceSummary';
import GaugeChart            from '@/components/projects/detail/GaugeChart';
import InsightBox            from '@/components/projects/detail/InsightBox';
import IngestionDataPanel    from '@/components/projects/detail/IngestionDataPanel';

type Props = { id: number };

export default function ProjectDetail({ id }: Props) {
  const [project,     setProject]     = useState<Project | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  useEffect(() => {
    projectApi.detail(id)
      .then((detailRes) => {
        setProject(detailRes.data);
      })
      .catch(() => setError('Project tidak ditemukan atau server tidak dapat dijangkau.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
        <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Memuat detail project...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="card border border-red-200 bg-red-50 space-y-3 p-5">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  const cpi = parseFloat(project.cpi ?? '0');
  const spi = parseFloat(project.spi ?? '0');

  return (
    <div className="space-y-6">
      <PerformanceSummary project={project} />

      <div 
        className="bg-white rounded-2xl  flex flex-col"
        style={{
          width: '1203px',
          height: '390px',
          paddingTop: '18px',
          paddingRight: '32px',
          paddingBottom: '18px',
          paddingLeft: '32px',
          boxSizing: 'border-box'
        }}
      >
        <h2 className="text-lg font-bold text-[#1B1C1F] tracking-widest mb-4">
          Visual Indicator
        </h2>
        
        <div 
          className="flex flex-row flex-1" 
          style={{ gap: '18px' }} // Gap antar kartu sesuai spesifikasi
        >
          <GaugeChart 
            label="Cost Performance Index (CPI)" 
            value={cpi} 
            type="cost" 
          />
          <GaugeChart 
            label="Schedule Performance Index (SPI)" 
            value={spi} 
            type="schedule" 
          />
        </div>
      </div>

      <InsightBox project={project} />
      <IngestionDataPanel key={project.id} projectId={project.id} />
    </div>
  );
}
