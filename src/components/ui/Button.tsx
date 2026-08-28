import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-moss-600 text-parchment-50 hover:bg-canopy-800 active:bg-canopy-900",
  secondary:
    "bg-transparent text-canopy-800 border border-walnut-500/40 hover:border-walnut-500 hover:bg-tan-300/20",
  ghost: "bg-transparent text-charcoal-600 hover:bg-canopy-800/5 hover:text-canopy-900",
  danger: "bg-clay-500 text-parchment-50 hover:bg-[#8a4a35] active:bg-[#7a4030]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
