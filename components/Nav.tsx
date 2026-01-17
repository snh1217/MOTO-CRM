'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: '접수 등록' },
  { href: '/inquiry', label: '문의 등록' },
  { href: '/admin/receipts', label: '접수 내역' },
  { href: '/admin/inquiries', label: '문의 내역' }
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="mb-5 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold">MOTO-CRM</h1>
        <p className="text-xs text-slate-500">접수/문의 관리 시스템</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${
              pathname === link.href
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
