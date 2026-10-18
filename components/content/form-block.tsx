import { MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { whatsappHref } from "@/lib/site";

/** Replaces a draft's form microcopy spec with a contact CTA where the online form ships later (plan section 13). */
export async function FormBlock({ kind }: { kind: string }) {
  if (kind !== "vendor-pack" && kind !== "careers") return null;

  const t = await getTranslations(`formCta.${kind}`);
  return (
    <div className="mt-6 rounded-2xl border bg-card p-6 md:p-8">
      <h3 className="text-h4">{t("title")}</h3>
      <p className="mt-3 text-body text-muted-foreground">{t("body")}</p>
      <a href={whatsappHref(t("prefill"))} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "xl", className: "mt-6" })}>
        <MessageCircle aria-hidden data-icon="inline-start" />
        {t("button")}
      </a>
    </div>
  );
}
