'use client';

import { useRouter } from 'next/navigation';
import { CaretRightIcon } from '@phosphor-icons/react';

interface ActionButtonProps {
  label: string;
  href: string;
}

export default function ActionButton({ label, href }: ActionButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className="flex items-center gap-2 bg-primary-blue text-white text-[13px] font-bold rounded-lg px-5 hover:brightness-110 transition-all"
      style={{ height: '38px' }}
    >
      {label}
      <CaretRightIcon size={14} weight="bold" />
    </button>
  );
}
