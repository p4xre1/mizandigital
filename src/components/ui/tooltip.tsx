"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/utils";

export type TooltipProviderProps = React.ComponentProps<
  typeof TooltipPrimitive.Provider
>;

function TooltipProvider({
  delayDuration = 0,
  ...props
}: TooltipProviderProps): React.JSX.Element {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}
TooltipProvider.displayName = "TooltipProvider";

export type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root>;

function Tooltip({ ...props }: TooltipProps): React.JSX.Element {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}
Tooltip.displayName = TooltipPrimitive.Root.displayName;

export type TooltipTriggerElement = React.ElementRef<
  typeof TooltipPrimitive.Trigger
>;
export type TooltipTriggerProps = React.ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Trigger
>;

const TooltipTrigger = React.forwardRef<
  TooltipTriggerElement,
  TooltipTriggerProps
>(
  (
    { ...props }: TooltipTriggerProps,
    ref: React.ForwardedRef<TooltipTriggerElement>
  ): React.JSX.Element => (
    <TooltipPrimitive.Trigger
      ref={ref}
      data-slot="tooltip-trigger"
      {...props}
    />
  )
);
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

export type TooltipContentElement = React.ElementRef<
  typeof TooltipPrimitive.Content
>;
export type TooltipContentProps = React.ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Content
>;

const TooltipContent = React.forwardRef<
  TooltipContentElement,
  TooltipContentProps
>(
  (
    { className, sideOffset = 0, children, ...props }: TooltipContentProps,
    ref: React.ForwardedRef<TooltipContentElement>
  ): React.JSX.Element => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance ltr:text-left rtl:text-right",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };