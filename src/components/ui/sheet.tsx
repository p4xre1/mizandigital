"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "../../lib/utils";

const Sheet = SheetPrimitive.Root;

export type SheetTriggerElement = React.ElementRef<
  typeof SheetPrimitive.Trigger
>;
export interface SheetTriggerProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Trigger> {}

const SheetTrigger = React.forwardRef<SheetTriggerElement, SheetTriggerProps>(
  (
    { ...props }: SheetTriggerProps,
    ref: React.ForwardedRef<SheetTriggerElement>
  ): React.JSX.Element => (
    <SheetPrimitive.Trigger ref={ref} data-slot="sheet-trigger" {...props} />
  )
);
SheetTrigger.displayName = SheetPrimitive.Trigger.displayName;

export type SheetCloseElement = React.ElementRef<typeof SheetPrimitive.Close>;
export interface SheetCloseProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Close> {}

const SheetClose = React.forwardRef<SheetCloseElement, SheetCloseProps>(
  (
    { ...props }: SheetCloseProps,
    ref: React.ForwardedRef<SheetCloseElement>
  ): React.JSX.Element => (
    <SheetPrimitive.Close ref={ref} data-slot="sheet-close" {...props} />
  )
);
SheetClose.displayName = SheetPrimitive.Close.displayName;

const SheetPortal = SheetPrimitive.Portal;

export type SheetOverlayElement = React.ElementRef<
  typeof SheetPrimitive.Overlay
>;
export interface SheetOverlayProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay> {}

const SheetOverlay = React.forwardRef<SheetOverlayElement, SheetOverlayProps>(
  (
    { className, ...props }: SheetOverlayProps,
    ref: React.ForwardedRef<SheetOverlayElement>
  ): React.JSX.Element => (
    <SheetPrimitive.Overlay
      ref={ref}
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
);
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

export type SheetContentElement = React.ElementRef<
  typeof SheetPrimitive.Content
>;
export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
  side?: "top" | "right" | "bottom" | "left";
}

const SheetContent = React.forwardRef<SheetContentElement, SheetContentProps>(
  (
    { className, children, side = "right", ...props }: SheetContentProps,
    ref: React.ForwardedRef<SheetContentElement>
  ): React.JSX.Element => (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        data-slot="sheet-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 ltr:text-left rtl:text-right",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          side === "top" &&
            "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
          side === "bottom" &&
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
          className
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none ltr:right-4 rtl:left-4">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

export type SheetHeaderElement = HTMLDivElement;
export interface SheetHeaderProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const SheetHeader = React.forwardRef<SheetHeaderElement, SheetHeaderProps>(
  (
    { className, ...props }: SheetHeaderProps,
    ref: React.ForwardedRef<SheetHeaderElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="sheet-header"
      className={cn(
        "flex flex-col gap-1.5 p-4 ltr:text-left rtl:text-right",
        className
      )}
      {...props}
    />
  )
);
SheetHeader.displayName = "SheetHeader";

export type SheetFooterElement = HTMLDivElement;
export interface SheetFooterProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const SheetFooter = React.forwardRef<SheetFooterElement, SheetFooterProps>(
  (
    { className, ...props }: SheetFooterProps,
    ref: React.ForwardedRef<SheetFooterElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex flex-col gap-2 p-4 ltr:text-left rtl:text-right",
        className
      )}
      {...props}
    />
  )
);
SheetFooter.displayName = "SheetFooter";

export type SheetTitleElement = React.ElementRef<typeof SheetPrimitive.Title>;
export interface SheetTitleProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title> {}

const SheetTitle = React.forwardRef<SheetTitleElement, SheetTitleProps>(
  (
    { className, ...props }: SheetTitleProps,
    ref: React.ForwardedRef<SheetTitleElement>
  ): React.JSX.Element => (
    <SheetPrimitive.Title
      ref={ref}
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
);
SheetTitle.displayName = SheetPrimitive.Title.displayName;

export type SheetDescriptionElement = React.ElementRef<
  typeof SheetPrimitive.Description
>;
export interface SheetDescriptionProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description> {}

const SheetDescription = React.forwardRef<
  SheetDescriptionElement,
  SheetDescriptionProps
>(
  (
    { className, ...props }: SheetDescriptionProps,
    ref: React.ForwardedRef<SheetDescriptionElement>
  ): React.JSX.Element => (
    <SheetPrimitive.Description
      ref={ref}
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
);
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};