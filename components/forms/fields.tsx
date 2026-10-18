import { cn } from "@/lib/utils";

/**
 * Native, token-styled form controls (plan sections 10 and 12): 44px targets, 16px text so iOS never zooms,
 * labels above fields, errors announced and linked with aria-describedby. They work without JavaScript.
 */

export const controlClass =
  "block h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30";

type FieldProps = {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  requiredText?: string;
  help?: React.ReactNode;
  error?: string;
  className?: string;
  children: (describedBy: string | undefined, invalid: boolean) => React.ReactNode;
};

export function Field({ id, label, required, requiredText, help, error, className, children }: FieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-small font-medium">
        {label}
        {required && requiredText && <span className="ms-1 font-normal text-muted-foreground">{requiredText}</span>}
      </label>
      {help && (
        <p id={helpId} className="-mt-1 text-small text-muted-foreground">
          {help}
        </p>
      )}
      {children(describedBy, Boolean(error))}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-small font-medium text-destructive">
      {message}
    </p>
  );
}

type ChoiceProps = React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; type: "checkbox" | "radio" };

/** A whole-card checkbox/radio: the entire card is the touch target. */
export function ChoiceCard({ label, className, ...input }: ChoiceProps) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-body transition-colors hover:bg-muted/60 has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
        className,
      )}
    >
      <input {...input} className="size-5 shrink-0 accent-primary" />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

/** A consent/declaration line: unticked by default, label beside the box. */
export function CheckLine({
  label,
  error,
  id,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; error?: string; id: string }) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-body">
        <input
          id={id}
          type="checkbox"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={errorId}
          {...input}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span className="leading-relaxed">{label}</span>
      </label>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
