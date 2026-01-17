'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/', label: '접수 등록' },
  { href: '/inquiry', label: '문의 등록' },
  { href: '/admin/receipts', label: '접수 내역' },
  { href: '/admin/inquiries', label: '문의 내역' }
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/');
  };

  return (
    <header className="mb-6 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-xl font-semibold">MOTO-CRM</h1>
        <p className="text-sm text-slate-500">접수/문의 관리 시스템</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium ${
              pathname === link.href
                ? 'text-slate-900'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {link.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:border-slate-300"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
