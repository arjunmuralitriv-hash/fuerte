"use client";

import { useState } from "react";
import { ar } from "react-day-picker/locale/ar";
import { enGB } from "react-day-picker/locale/en-GB";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

type Props = {
  trigger: (props: object) => React.ReactElement;
  value: string;
  onChange: (iso: string) => void;
  locale: string;
};

/**
 * Loaded on first open (see DateField), so the calendar's code never weighs on the initial page.
 * Arabic: RTL grid, Arabic month names, Western digits (plan section 12), weeks from Saturday as in Qatar.
 */
export default function DatePopover({ trigger, value, onChange, locale }: Props) {
  const [open, setOpen] = useState(true);
  const selected = value ? fromIso(value) : undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isAr = locale === "ar";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger({})}</PopoverTrigger>
      <PopoverContent align="start" collisionPadding={16} className="w-auto rounded-2xl p-2 elevation-3">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? today}
          onSelect={(d) => {
            if (!d) return;
            onChange(toIso(d));
            setOpen(false);
          }}
          disabled={{ before: today }}
          startMonth={today}
          locale={isAr ? ar : enGB}
          dir={isAr ? "rtl" : "ltr"}
          weekStartsOn={isAr ? 6 : 0}
          numerals="latn"
          autoFocus
          // 44px day cells: the touch-target minimum (plan section 10).
          className="[--cell-size:--spacing(11)]"
        />
      </PopoverContent>
    </Popover>
  );
}
