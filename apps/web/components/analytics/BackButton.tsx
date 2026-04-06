'use client';

import { useRouter } from 'next/navigation';
import { CaretLeftIcon } from '@phosphor-icons/react';

interface BackButtonProps {
  label: string;
  href?: string;
}

export default function BackButton({ label, href }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 bg-primary-blue text-white text-[13px] font-bold rounded-lg px-5 hover:brightness-110 transition-all"
      style={{ height: '38px' }}
    >
      <CaretLeftIcon size={14} weight="bold" />
      {label}
    </button>
  );
}
