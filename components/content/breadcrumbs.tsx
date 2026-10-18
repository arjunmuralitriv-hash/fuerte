import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export type Crumb = { label: string; href?: string };

export async function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = await getTranslations("content");
  return (
    <nav aria-label={t("breadcrumb")}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <ChevronRight aria-hidden className="size-4 shrink-0 rtl:-scale-x-100" />}
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="rounded-sm underline-offset-4 hover:text-foreground hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className={i === items.length - 1 ? "text-foreground" : undefined}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
