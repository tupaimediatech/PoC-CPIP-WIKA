import type { Metadata } from 'next';
import UploadExcel from '@/components/upload/UploadExcel';

export const metadata: Metadata = {
  title: 'Upload Excel – CPIP',
};

export default function UploadPage() {
  return (
    <div>
      <UploadExcel />
    </div>
  );
}