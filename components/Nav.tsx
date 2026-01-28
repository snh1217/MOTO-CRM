'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: '?? ??' },
  { href: '/inquiry', label: '?? ??' },
  { href: '/as', label: 'A/S ??' },
  { href: '/admin/receipts', label: '?? ??' },
  { href: '/admin/inquiries', label: '?? ??' },
  { href: '/admin/as', label: 'A/S ??' }
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="mb-5 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold">MOTO-CRM</h1>
        <p className="text-xs text-slate-500">??/?? ?? ???</p>
      </div>
      <nav className="hide-scrollbar flex gap-2 overflow-x-auto text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-h-[44px] items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
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
