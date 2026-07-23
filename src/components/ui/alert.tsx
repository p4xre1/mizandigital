import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

export const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current text-start transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive *:data-[slot=alert-description]:text-destructive/90 bg-destructive/5 dark:bg-destructive/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type AlertElement = React.ElementRef<"div">;
export interface AlertProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<AlertElement, AlertProps>((
  { className, variant = "default", ...props }: AlertProps,
  ref: React.ForwardedRef<AlertElement>
): React.JSX.Element => (
  <div
    ref={ref}
    data-slot="alert"
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

export type AlertTitleElement = React.ElementRef<"div">;
export interface AlertTitleProps extends React.ComponentPropsWithoutRef<"div"> {}

const AlertTitle = React.forwardRef<AlertTitleElement, AlertTitleProps>((
  { className, ...props }: AlertTitleProps,
  ref: React.ForwardedRef<AlertTitleElement>
): React.JSX.Element => (
  <div
    ref={ref}
    data-slot="alert-title"
    className={cn(
      "col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight select-none",
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export type AlertDescriptionElement = React.ElementRef<"div">;
export interface AlertDescriptionProps extends React.ComponentPropsWithoutRef<"div"> {}

const AlertDescription = React.forwardRef<AlertDescriptionElement, AlertDescriptionProps>((
  { className, ...props }: AlertDescriptionProps,
  ref: React.ForwardedRef<AlertDescriptionElement>
): React.JSX.Element => (
  <div
    ref={ref}
    data-slot="alert-description"
    className={cn(
      "text-muted-foreground col-start-2 grid gap-1 text-sm [&_p]:leading-relaxed",
      className
    )}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };