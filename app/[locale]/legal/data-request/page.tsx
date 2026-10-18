import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { ContentPage, contentMetadata } from "@/components/content/content-page";
import { DataRequestForm } from "@/components/forms/data-request-form";
import { routing } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return hasLocale(routing.locales, locale) ? contentMetadata(locale, "/legal/data-request") : {};
}

export default async function DataRequestPage({ params }: Params) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <ContentPage locale={locale} slug="/legal/data-request" form={<DataRequestForm />} />;
}
