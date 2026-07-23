"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "../../lib/utils";

export interface HoverCardProps
  extends React.ComponentProps<typeof HoverCardPrimitive.Root> {}

function HoverCard({ ...props }: HoverCardProps): React.JSX.Element {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

export type HoverCardTriggerElement = React.ElementRef<
  typeof HoverCardPrimitive.Trigger
>;
export interface HoverCardTriggerProps
  extends React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Trigger> {}

const HoverCardTrigger = React.forwardRef<
  HoverCardTriggerElement,
  HoverCardTriggerProps
>(
  (
    { ...props }: HoverCardTriggerProps,
    ref: React.ForwardedRef<HoverCardTriggerElement>
  ): React.JSX.Element => (
    <HoverCardPrimitive.Trigger
      ref={ref}
      data-slot="hover-card-trigger"
      {...props}
    />
  )
);
HoverCardTrigger.displayName = HoverCardPrimitive.Trigger.displayName;

export type HoverCardContentElement = React.ElementRef<
  typeof HoverCardPrimitive.Content
>;
export interface HoverCardContentProps
  extends React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> {}

const HoverCardContent = React.forwardRef<
  HoverCardContentElement,
  HoverCardContentProps
>(
  (
    { className, align = "center", sideOffset = 4, ...props }: HoverCardContentProps,
    ref: React.ForwardedRef<HoverCardContentElement>
  ): React.JSX.Element => (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        ref={ref}
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  )
);
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent };