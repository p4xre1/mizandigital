"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "../../lib/utils";

export type ProgressElement = React.ElementRef<
  typeof ProgressPrimitive.Root
>;
export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {}

const Progress = React.forwardRef<ProgressElement, ProgressProps>(
  (
    { className, value, ...props }: ProgressProps,
    ref: React.ForwardedRef<ProgressElement>
  ): React.JSX.Element => (
    <ProgressPrimitive.Root
      ref={ref}
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all ltr:[--translate-x-factor:-1] rtl:[--translate-x-factor:1]"
        style={{
          transform: `translateX(calc(var(--translate-x-factor, -1) * ${100 - (value || 0)}%))`,
        }}
      />
    </ProgressPrimitive.Root>
  )
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };