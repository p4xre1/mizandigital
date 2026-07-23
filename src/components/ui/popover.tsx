"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "../../lib/utils";

const Popover = PopoverPrimitive.Root;

export type PopoverTriggerElement = React.ElementRef<
  typeof PopoverPrimitive.Trigger
>;
export interface PopoverTriggerProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> {}

const PopoverTrigger = React.forwardRef<
  PopoverTriggerElement,
  PopoverTriggerProps
>(
  (
    { ...props }: PopoverTriggerProps,
    ref: React.ForwardedRef<PopoverTriggerElement>
  ): React.JSX.Element => (
    <PopoverPrimitive.Trigger
      ref={ref}
      data-slot="popover-trigger"
      {...props}
    />
  )
);
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName;

export type PopoverAnchorElement = React.ElementRef<
  typeof PopoverPrimitive.Anchor
>;
export interface PopoverAnchorProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Anchor> {}

const PopoverAnchor = React.forwardRef<
  PopoverAnchorElement,
  PopoverAnchorProps
>(
  (
    { ...props }: PopoverAnchorProps,
    ref: React.ForwardedRef<PopoverAnchorElement>
  ): React.JSX.Element => (
    <PopoverPrimitive.Anchor
      ref={ref}
      data-slot="popover-anchor"
      {...props}
    />
  )
);
PopoverAnchor.displayName = PopoverPrimitive.Anchor.displayName;

export type PopoverContentElement = React.ElementRef<
  typeof PopoverPrimitive.Content
>;
export interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {}

const PopoverContent = React.forwardRef<
  PopoverContentElement,
  PopoverContentProps
>(
  (
    {
      className,
      align = "center",
      sideOffset = 4,
      collisionPadding = 8,
      avoidCollisions = true,
      ...props
    }: PopoverContentProps,
    ref: React.ForwardedRef<PopoverContentElement>
  ): React.JSX.Element => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        avoidCollisions={avoidCollisions}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-auto max-w-[calc(100vw-2rem)] sm:max-w-sm origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden ltr:text-left rtl:text-right",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };