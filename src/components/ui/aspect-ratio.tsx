"use client";

import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

import { cn } from "@/lib/utils";

/* ==========================================================================
   1. ASPECT RATIO ROOT COMPONENT (مكوّن تثبيت الأبعاد الهندسية)
   ========================================================================== */

export type AspectRatioElement = React.ElementRef<typeof AspectRatioPrimitive.Root>;
export interface AspectRatioProps 
  extends React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root> {}

const AspectRatio = React.forwardRef<AspectRatioElement, AspectRatioProps>((
  { className, ...props }: AspectRatioProps,
  ref: React.ForwardedRef<AspectRatioElement>
): React.JSX.Element => (
  <AspectRatioPrimitive.Root
    ref={ref}
    data-slot="aspect-ratio"
    className={cn(
      "overflow-hidden rounded-xl bg-muted/40 transform-gpu w-full [&_img]:object-cover [&_video]:object-cover [&_img]:w-full [&_video]:w-full [&_img]:h-full [&_video]:h-full", 
      className
    )}
    {...props}
  />
));
AspectRatio.displayName = "AspectRatio";

export { AspectRatio };