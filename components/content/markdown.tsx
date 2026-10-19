import { ArrowRight, MessageCircle, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { FormBlock } from "@/components/content/form-block";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { headingId } from "@/lib/content";
import { prepareMarkdown, type CtaSpec } from "@/lib/content/prepare";
import { remarkFaq } from "@/lib/content/remark-faq";
import { serviceKey, whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";

/** `form` is the real form for pages that have one; it is passed in by the page's own route so its JS stays off other pages. */
type Ctx = { slug: string; serviceName: string; formKind?: string; form?: React.ReactNode };

const textOf = (children: React.ReactNode): string =>
  typeof children === "string" || typeof children === "number"
    ? String(children)
    : Array.isArray(children)
      ? children.map(textOf).join("")
      : children && typeof children === "object" && "props" in children
        ? textOf((children as React.ReactElement<{ children?: React.ReactNode }>).props.children)
        : "";

const MD_LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;

/** Visible "to confirm" marker for unanswered client questions (pre-launch only). */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <mark
      title="To be confirmed by Fuerte"
      className="rounded-sm border border-dashed border-primary/50 bg-accent px-1 py-0.5 font-mono text-[0.8em] text-accent-foreground [box-decoration-break:clone] [overflow-wrap:anywhere]"
    >
      {children}
    </mark>
  );
}

function SmartLink({ href = "", className, children }: { href?: string; className?: string; children: React.ReactNode }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  const external = /^https?:/.test(href);
  return (
    <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

/** Renders a draft's Markdown body with Fuerte typography (plan section 12). Server component, zero client JS. */
export async function Markdown({ source, ctx, className }: { source: string; ctx: Ctx; className?: string }) {
  const t = await getTranslations("cta");
  const key = serviceKey(ctx.slug);

  function CtaGroup({ spec }: { spec: CtaSpec }) {
    const label = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "");
    const tertiary = spec.tertiary?.match(MD_LINK);
    const tertiaryHref = tertiary
      ? tertiary[2]
      : /whatsapp|واتساب/i.test(spec.tertiary ?? "")
        ? whatsappHref(t("whatsappPrefill", { service: ctx.serviceName }))
        : /vendor pack|حزمة|ملف المورّد/i.test(spec.tertiary ?? "")
          ? "/vendor-pack"
          : undefined;
    return (
      <div className="not-prose mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {spec.primary && (
          <Link href={{ pathname: "/contact", query: { type: "survey", service: key } }} className={buttonVariants({ size: "xl" })}>
            {label(spec.primary)}
            <ArrowRight data-icon="inline-end" aria-hidden className="rtl:-scale-x-100" />
          </Link>
        )}
        {spec.secondary && (
          <Link
            href={{ pathname: "/contact", query: { type: "quote", service: key } }}
            className={buttonVariants({ size: "xl", variant: "outline", className: "border-foreground/25" })}
          >
            {label(spec.secondary)}
          </Link>
        )}
        {spec.tertiary && tertiaryHref && (
          <SmartLink
            href={tertiaryHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-medium underline decoration-primary underline-offset-4"
          >
            {tertiaryHref.includes("wa.me") && <MessageCircle aria-hidden className="size-5 text-primary-ink" />}
            {tertiary ? tertiary[1] : label(spec.tertiary)}
          </SmartLink>
        )}
      </div>
    );
  }

  const components: Components = {
    h1: () => null, // The page header renders the H1.
    h2: ({ children }) => {
      const text = textOf(children);
      return (
        <h2 id={headingId(text)} className="mt-16 scroll-mt-24 text-h2 first:mt-0">
          {children}
        </h2>
      );
    },
    h3: ({ children }) => <h3 className="mt-10 text-h3">{children}</h3>,
    h4: ({ children }) => <h4 className="mt-8 text-h4">{children}</h4>,
    p: ({ children }) => <p className="mt-4 text-body">{children}</p>,
    ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 ps-6 marker:text-primary-ink">{children}</ul>,
    ol: ({ children }) => <ol className="mt-4 list-decimal space-y-3 ps-6 marker:font-medium marker:text-muted-foreground">{children}</ol>,
    li: ({ children }) => <li className="ps-1 text-body [&>p]:mt-0">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    a: ({ href, children }) => (
      <SmartLink
        href={href}
        className="font-medium underline decoration-primary/60 decoration-1 underline-offset-4 transition-[text-decoration-color] hover:decoration-primary hover:decoration-2"
      >
        {children}
      </SmartLink>
    ),
    hr: () => <hr className="my-12 border-border" />,
    blockquote: ({ children }) => <blockquote className="mt-6 border-s-2 border-primary ps-5 text-body-lg">{children}</blockquote>,
    table: ({ children }) => (
      <div className="mt-6 overflow-x-auto rounded-2xl border">
        <table className="w-full border-collapse text-small">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="bg-muted p-3 text-start align-bottom font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-t p-3 align-top">{children}</td>,
    details: ({ children }) => <details className="group border-b py-5 first:border-t">{children}</details>,
    summary: ({ children }) => (
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 text-h4 [&::-webkit-details-marker]:hidden">
        <span>{children}</span>
        <Plus aria-hidden className="size-5 shrink-0 text-primary-ink transition-transform duration-250 group-open:rotate-45" />
      </summary>
    ),
    pre: ({ node, children }) => {
      const cls = String((node?.children?.[0] as { properties?: { className?: string[] } })?.properties?.className ?? "");
      if (cls.includes("language-fuerte-")) return <>{children}</>;
      return <pre className="mt-6 overflow-x-auto rounded-2xl bg-muted p-4 font-mono text-small">{children}</pre>;
    },
    code: ({ className: cls, children }) => {
      const value = textOf(children).trim();
      if (cls?.includes("language-fuerte-cta")) return <CtaGroup spec={JSON.parse(value) as CtaSpec} />;
      if (cls?.includes("language-fuerte-form")) return ctx.form ?? <FormBlock kind={value} />;
      if (value.startsWith("⟦") && value.endsWith("⟧")) return <Placeholder>{value.slice(1, -1)}</Placeholder>;
      return <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.9em]">{children}</code>;
    },
  };

  return (
    <div className={cn("text-foreground", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkFaq]} components={components} skipHtml>
        {prepareMarkdown(source, ctx.formKind)}
      </ReactMarkdown>
    </div>
  );
}
