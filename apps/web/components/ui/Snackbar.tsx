'use client';

import { useEffect, useState } from 'react';
import { ShieldCheckIcon, XIcon } from '@phosphor-icons/react';

interface SnackbarProps {
  title: string;
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Snackbar({ title, message, visible, onClose, duration = 3000 }: SnackbarProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`flex items-center gap-3 bg-[#F0FFF4] border border-[#C6F6D5] rounded-xl px-4 py-3 shadow-lg transition-all duration-300 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 shrink-0">
          <ShieldCheckIcon size={18} className="text-white" />
        </div>
        <div className="flex flex-col mr-4">
          <span className="text-[14px] font-bold text-[#1B1C1F]">{title}</span>
          <span className="text-[12px] text-gray-500">{message}</span>
        </div>
        <button
          onClick={() => { setShow(false); setTimeout(onClose, 300); }}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 self-start"
        >
          <XIcon size={16} />
        </button>
      </div>
    </div>
  );
}
