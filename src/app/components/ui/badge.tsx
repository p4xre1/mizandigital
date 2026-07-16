import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

export const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-semibold w-fit max-w-full whitespace-nowrap shrink-0 transition-[color,box-shadow,background-color,border-color] duration-200 ease-in-out select-none overflow-hidden text-ellipsis gap-1.5 [&>svg]:size-3.5 [&>svg]:pointer-events-none [&>svg]:shrink-0 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90 [button&]:hover:bg-primary/90 [a&]:focus-visible:bg-primary/90 [button&]:focus-visible:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80 [button&]:hover:bg-secondary/80 [a&]:focus-visible:bg-secondary/80 [button&]:focus-visible:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 [button&]:hover:bg-destructive/90 [a&]:focus-visible:bg-destructive/90 [button&]:focus-visible:bg-destructive/90",
        outline:
          "text-foreground border-border bg-background [a&]:hover:bg-accent [a&]:hover:text-accent-foreground [button&]:hover:bg-accent [button&]:hover:text-accent-foreground",
        success:
          "border-transparent bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 [a&]:hover:bg-emerald-500/25 [button&]:hover:bg-emerald-500/25",
        warning:
          "border-transparent bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 [a&]:hover:bg-amber-500/25 [button&]:hover:bg-amber-500/25",
        info:
          "border-transparent bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400 [a&]:hover:bg-sky-500/25 [button&]:hover:bg-sky-500/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.ComponentPropsWithoutRef<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

export type BadgeElement = React.ElementRef<"span">;

const Badge = React.forwardRef<BadgeElement, BadgeProps>((
  { className, variant = "default", asChild = false, ...props },
  ref: React.ForwardedRef<BadgeElement>
): React.JSX.Element => {
  const Comp: React.ElementType = asChild ? Slot : "span";

  return (
    <Comp
      ref={ref}
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
});

Badge.displayName = "Badge";

export { Badge };