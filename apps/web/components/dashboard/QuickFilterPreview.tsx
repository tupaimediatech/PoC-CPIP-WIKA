'use client';

import { useState } from 'react';
import { CaretDownIcon } from '@phosphor-icons/react';
import mockData from '@/data/mock-data.json';

type FilterState = {
  sbu: string;
  owner: string;
  contract: string;
  partnership: string;
};

const FILTER_OPTIONS = mockData.filterOptions as Record<keyof FilterState, { label: string; options: string[] }>;

const EMPTY_FILTERS: FilterState = { sbu: '', owner: '', contract: '', partnership: '' };

interface QuickFilterPreviewProps {
  onSearch: (filters: FilterState) => void;
  onReset: () => void;
}

export default function QuickFilterPreview({ onSearch, onReset }: QuickFilterPreviewProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    onReset();
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  return (
    <div className="bg-white w-full" style={{ padding: '18px 32px' }}>
      <h2 className="text-[18px] font-bold text-[#1B1C1F] mb-4">
        Quick Filter Preview
      </h2>

      <div className="flex items-center gap-4 mb-4">
        {(Object.keys(FILTER_OPTIONS) as (keyof FilterState)[]).map((key) => (
          <FilterPill
            key={key}
            label={FILTER_OPTIONS[key].label}
            value={filters[key]}
            placeholder={`Select ${FILTER_OPTIONS[key].label}`}
            options={FILTER_OPTIONS[key].options}
            onChange={(v) => updateFilter(key, v)}
          />
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSearch}
          className="flex items-center justify-center bg-primary-blue text-white text-[13px] font-bold rounded-lg hover:brightness-110 transition-all"
          style={{ width: '93px', height: '31px' }}
        >
          Search
        </button>
        <button
          onClick={handleReset}
          className="flex items-center justify-center border border-gray-300 text-gray-600 text-[13px] font-medium rounded-lg hover:bg-gray-50 transition-colors"
          style={{ width: '93px', height: '31px' }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative flex items-center bg-white border border-gray-200 rounded-md cursor-pointer" style={{ height: '27px' }}>
      <div className="flex items-center gap-1 px-2">
        <span className="text-[12px] font-medium text-gray-500">{label}</span>
        <span className="text-[12px] text-gray-400">:</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-transparent text-[12px] font-medium text-[#1B1C1F] pr-6 pl-0 focus:outline-none cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.filter(opt => opt !== 'All').map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <CaretDownIcon size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}
