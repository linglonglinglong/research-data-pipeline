"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();
  
  const links = [
    { name: "Anomaly Dashboard", href: "/" },
    { name: "Data Ingestion", href: "/ingest" },
    { name: "Pull Jobs", href: "/jobs" },
    { name: "Admin (Setup)", href: "/admin" },
  ];

  return (
    <nav className="flex gap-2 bg-gray-200 p-1 rounded-lg w-fit mb-8">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive 
                ? "bg-white shadow-sm text-black" 
                : "text-gray-500 hover:text-black"
            }`}
          >
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}