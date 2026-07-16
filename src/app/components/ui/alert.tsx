import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const alertVariants = cva(
  // إضافة text-start لضمان محاذاة صحيحة دائماً (يمين للعربية، يسار للإنجليزية) حتى لو كان الأب text-center
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current text-start transition-colors",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          // تحسين التباين البصري بإضافة خلفية خفيفة متكيفة مع الوضعين المضيء والمظلم
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive *:data-[slot=alert-description]:text-destructive/90 bg-destructive/5 dark:bg-destructive/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      // line-clamp-1 قد يخفي أجزاء من العناوين الطويلة، يفضل إزالته أو تركه حسب حاجتك، لكننا أبقيناه للحفاظ على تناسق الشبكة
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        // تم استبدال justify-items-start بـ محاذاة تلقائية تتناسب مع الـ Grid لضمان دعم أفضل للـ RTL
        "text-muted-foreground col-start-2 grid gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };