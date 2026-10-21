import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Custom font sizes from the --text-* tokens in app/globals.css. Without them tailwind-merge
// reads text-small, text-h1 etc. as colours and drops them next to text-muted-foreground.
// Colours need no entry: tailwind-merge accepts any colour name.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h1", "h2", "h3", "h4", "body-lg", "body", "small"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
