"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const isDev = process.env.NEXT_PUBLIC_DEV_MODE === "true";

const LINKS = [
  { href: "/", label: "Distance" },
  { href: "/explore", label: "Time" },
  ...(isDev ? [{ href: "/compute", label: "Compute" }] : []),
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-6">
      <span className="text-sm font-bold text-gray-900 mr-2">Pop Squared</span>
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium transition-colors ${
              active
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
