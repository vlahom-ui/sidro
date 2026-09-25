import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Navigacija" className="flex flex-wrap items-center gap-1.5 text-sm opacity-80 mb-6">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {item.href ? (
            <Link href={item.href} className="text-slate underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-bold">{item.label}</span>
          )}
          {i < items.length - 1 && <span className="opacity-40">/</span>}
        </span>
      ))}
    </nav>
  );
}
