import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { ContentPage, contentMetadata } from "@/components/content/content-page";
import { CareersForm } from "@/components/forms/careers-form";
import { routing } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(routing.locales, locale) ? contentMetadata(locale, "/careers") : {};
}

export default async function CareersPage({ params }: Params) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <ContentPage locale={locale} slug="/careers" form={<CareersForm />} />;
}
