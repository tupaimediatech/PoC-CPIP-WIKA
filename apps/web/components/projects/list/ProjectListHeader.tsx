'use client';

import { MagnifyingGlass, CaretDown } from '@phosphor-icons/react';

type Props = {
  search: string;
  division: string;
  totalShown: number;
  totalAll: number;
  availableYears: number[];
  activeYear: number | null;
  onSearchChange: (v: string) => void;
  onDivisionChange: (v: string) => void;
  onYearChange: (year: number | null) => void;
};

const DIVISIONS = [
  { value: '',               label: 'Division' },
  { value: 'Infrastructure', label: 'Infrastructure' },
  { value: 'Building',       label: 'Building' },
];

export default function ProjectListHeader({
  search,
  division,
  availableYears,
  activeYear,
  onSearchChange,
  onDivisionChange,
  onYearChange,
}: Props) {
  const yearDisabled = !!division; // year tidak aktif saat division dipilih

  return (
    <div
      className="flex items-center justify-between"
      style={{ width: '1139px', height: '37px', opacity: 1 }}
    >
      {/* Search Bar */}
      <div
        className="relative flex items-center"
        style={{ width: '783px', height: '37px', opacity: 1 }}
      >
        <input
          type="text"
          placeholder="Search project here"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-full text-[13px] bg-white border-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 transition-all"
          style={{
            paddingTop: '8px',
            paddingBottom: '2px',
            paddingLeft: '16px',
            paddingRight: '40px',
            borderRadius: '8px',
            borderWidth: '0.5px',
            borderStyle: 'solid',
          }}
        />
        <MagnifyingGlass
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          size={16}
        />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 h-full">

        {/* Year Filter */}
        {availableYears.length > 0 && (
          <div className={`relative h-full transition-opacity ${yearDisabled ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <select
              value={activeYear ?? ''}
              disabled={yearDisabled}
              onChange={e => onYearChange(e.target.value ? Number(e.target.value) : null)}
              className="appearance-none h-full pl-4 pr-10 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-600 font-medium cursor-pointer focus:outline-none hover:bg-gray-50 transition-all disabled:cursor-not-allowed"
            >
              <option value=''>All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <CaretDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              size={14}
            />
          </div>
        )}

        {/* Division Filter */}
        <div className="relative h-full">
          <select
            value={division}
            onChange={e => onDivisionChange(e.target.value)}
            className="appearance-none h-full pl-4 pr-10 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-600 font-medium cursor-pointer focus:outline-none hover:bg-gray-50 transition-all"
          >
            {DIVISIONS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <CaretDown
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            size={14}
          />
        </div>
      </div>
    </div>
  );
}