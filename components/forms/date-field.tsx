"use client";

import { CalendarDays, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { useState } from "react";

import { controlClass } from "@/components/forms/fields";
import { cn } from "@/lib/utils";

const DatePopover = dynamic(() => import("@/components/forms/date-popover"), { ssr: false });

type Props = { id: string; name: string; describedBy?: string; placeholder: string; clearLabel: string };

const display = (iso: string, locale: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-QA-u-nu-latn" : "en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(
    new Date(y, m - 1, d),
  );
};

/**
 * Themed date picker that replaces the native date input (which shows mm/dd/yyyy and ignores theme and RTL).
 * The trigger is plain HTML; the popover and calendar load on first click. Submits yyyy-mm-dd via a hidden input.
 */
export function DateField({ id, name, describedBy, placeholder, clearLabel }: Props) {
  const locale = useLocale();
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);

  const trigger = (props: object) => (
    <button
      type="button"
      id={id}
      aria-haspopup="dialog"
      aria-labelledby={`${id}-label ${id}-value`}
      aria-describedby={describedBy}
      className={cn(controlClass, "flex items-center gap-3 pe-12 text-start")}
      {...props}
    >
      <CalendarDays aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      <span id={`${id}-value`} className={cn("flex-1 truncate", !value && "text-muted-foreground")}>
        {value ? display(value, locale) : placeholder}
      </span>
    </button>
  );

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      {loaded ? <DatePopover trigger={trigger} value={value} onChange={setValue} locale={locale} /> : trigger({ onClick: () => setLoaded(true) })}
      {value && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => setValue("")}
          className="absolute inset-y-0 end-1 my-auto grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
