'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { strings } from '@/lib/strings.ko';

const groups = [
  {
    label: strings.nav.admin,
    items: [
      { href: '/admin/home', label: strings.nav.dashboard },
      { href: '/admin/users', label: strings.nav.users }
    ]
  },
  {
    label: strings.nav.reception,
    items: [
      { href: '/receipts', label: strings.nav.receptionRegister },
      { href: '/admin/receipts', label: strings.nav.receptionHistory }
    ]
  },
  {
    label: strings.nav.inquiries,
    items: [
      { href: '/inquiry', label: strings.nav.inquiryRegister },
      { href: '/admin/inquiries', label: strings.nav.inquiryHistory }
    ]
  },
  {
    label: strings.nav.as,
    items: [
      { href: '/as', label: strings.nav.asRegister },
      { href: '/admin/as', label: strings.nav.asHistory }
    ]
  }
];

export default function Nav() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <header className="mb-5 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold">{strings.appName}</h1>
        <p className="text-xs text-slate-500">센터 운영 대시보드</p>
      </div>

      <nav className="hidden items-center gap-3 md:flex">
        <Link
          href="/admin/home"
          className={`group relative flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
            pathname === '/admin/home'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {strings.nav.home}
          <span className="pointer-events-none absolute left-4 right-4 -bottom-1 h-0.5 scale-x-0 rounded-full bg-slate-900 transition-transform duration-200 group-hover:scale-x-100" />
        </Link>

        {groups.map((group) => (
          <div key={group.label} className="relative group">
            <button
              type="button"
              className="group/button flex min-h-[44px] items-center gap-2 rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <span>{group.label}</span>
              <span className="text-xs">v</span>
              <span className="pointer-events-none absolute left-4 right-4 -bottom-1 h-0.5 scale-x-0 rounded-full bg-slate-900 transition-transform duration-200 group-hover:scale-x-100 group-focus-within:scale-x-100" />
            </button>
            <div className="absolute left-0 top-full z-10 mt-2 w-56 translate-y-2 rounded-lg border border-slate-200 bg-white p-2 opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[44px] items-center rounded-md px-3 text-sm transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <nav className="flex flex-col gap-2 md:hidden">
        <Link
          href="/admin/home"
          className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            pathname === '/admin/home' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {strings.nav.home}
        </Link>
        {groups.map((group) => (
          <div key={group.label} className="rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setOpenGroup((prev) => (prev === group.label ? null : group.label))}
              className="flex min-h-[44px] w-full items-center justify-between px-4 py-2 text-sm font-semibold text-slate-700"
            >
              <span className="whitespace-nowrap">{group.label}</span>
              <span className="text-xs">{openGroup === group.label ? '^' : 'v'}</span>
            </button>
            {openGroup === group.label && (
              <div className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50 p-2">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`min-h-[44px] rounded-md px-3 py-2 text-sm ${
                      pathname === item.href
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </header>
  );
}
