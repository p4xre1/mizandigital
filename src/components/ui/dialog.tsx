"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "../../lib/utils";

/* ==========================================================================
   1. DIALOG ROOT & PORTAL & TRIGGER & CLOSE
   ========================================================================== */

export interface DialogProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {}

const Dialog = ({ ...props }: DialogProps): React.JSX.Element => (
  <DialogPrimitive.Root data-slot="dialog" {...props} />
);
Dialog.displayName = "Dialog";


export interface DialogPortalProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Portal> {}

const DialogPortal = ({ ...props }: DialogPortalProps): React.JSX.Element => (
  <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
);
DialogPortal.displayName = "DialogPortal";


export type DialogTriggerElement = React.ElementRef<typeof DialogPrimitive.Trigger>;
export interface DialogTriggerProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger> {}

const DialogTrigger = React.forwardRef<DialogTriggerElement, DialogTriggerProps>((
  { ...props }: DialogTriggerProps,
  ref: React.ForwardedRef<DialogTriggerElement>
): React.JSX.Element => (
  <DialogPrimitive.Trigger
    ref={ref}
    data-slot="dialog-trigger"
    {...props}
  />
));
DialogTrigger.displayName = DialogPrimitive.Trigger.displayName ?? "DialogTrigger";


export type DialogCloseElement = React.ElementRef<typeof DialogPrimitive.Close>;
export interface DialogCloseProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close> {}

const DialogClose = React.forwardRef<DialogCloseElement, DialogCloseProps>((
  { ...props }: DialogCloseProps,
  ref: React.ForwardedRef<DialogCloseElement>
): React.JSX.Element => (
  <DialogPrimitive.Close
    ref={ref}
    data-slot="dialog-close"
    {...props}
  />
));
DialogClose.displayName = DialogPrimitive.Close.displayName ?? "DialogClose";

/* ==========================================================================
   2. DIALOG OVERLAY
   ========================================================================== */

export type DialogOverlayElement = React.ElementRef<typeof DialogPrimitive.Overlay>;
export interface DialogOverlayProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {}

const DialogOverlay = React.forwardRef<DialogOverlayElement, DialogOverlayProps>((
  { className, ...props }: DialogOverlayProps,
  ref: React.ForwardedRef<DialogOverlayElement>
): React.JSX.Element => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="dialog-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName ?? "DialogOverlay";

/* ==========================================================================
   3. DIALOG CONTENT
   ========================================================================== */

export type DialogContentElement = React.ElementRef<typeof DialogPrimitive.Content>;
export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {}

const DialogContent = React.forwardRef<DialogContentElement, DialogContentProps>((
  { className, children, ...props }: DialogContentProps,
  ref: React.ForwardedRef<DialogContentElement>
): React.JSX.Element => (
  <DialogPortal data-slot="dialog-portal">
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-slot="dialog-content"
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 sm:max-w-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute top-4 ltr:right-4 rtl:left-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
        <XIcon />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName ?? "DialogContent";

/* ==========================================================================
   4. DIALOG HEADER & FOOTER
   ========================================================================== */

export type DialogHeaderElement = React.ElementRef<"div">;
export interface DialogHeaderProps extends React.ComponentPropsWithoutRef<"div"> {}

const DialogHeader = React.forwardRef<DialogHeaderElement, DialogHeaderProps>((
  { className, ...props }: DialogHeaderProps,
  ref: React.ForwardedRef<DialogHeaderElement>
): React.JSX.Element => (
  <div
    ref={ref}
    data-slot="dialog-header"
    className={cn(
      "flex flex-col gap-2 text-center ltr:sm:text-left rtl:sm:text-right",
      className
    )}
    {...props}
  />
));
DialogHeader.displayName = "DialogHeader";


export type DialogFooterElement = React.ElementRef<"div">;
export interface DialogFooterProps extends React.ComponentPropsWithoutRef<"div"> {}

const DialogFooter = React.forwardRef<DialogFooterElement, DialogFooterProps>((
  { className, ...props }: DialogFooterProps,
  ref: React.ForwardedRef<DialogFooterElement>
): React.JSX.Element => (
  <div
    ref={ref}
    data-slot="dialog-footer"
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row ltr:sm:justify-end rtl:sm:justify-start rtl:sm:flex-row-reverse",
      className
    )}
    {...props}
  />
));
DialogFooter.displayName = "DialogFooter";

/* ==========================================================================
   5. DIALOG TITLE & DESCRIPTION
   ========================================================================== */

export type DialogTitleElement = React.ElementRef<typeof DialogPrimitive.Title>;
export interface DialogTitleProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {}

const DialogTitle = React.forwardRef<DialogTitleElement, DialogTitleProps>((
  { className, ...props }: DialogTitleProps,
  ref: React.ForwardedRef<DialogTitleElement>
): React.JSX.Element => (
  <DialogPrimitive.Title
    ref={ref}
    data-slot="dialog-title"
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName ?? "DialogTitle";


export type DialogDescriptionElement = React.ElementRef<typeof DialogPrimitive.Description>;
export interface DialogDescriptionProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> {}

const DialogDescription = React.forwardRef<DialogDescriptionElement, DialogDescriptionProps>((
  { className, ...props }: DialogDescriptionProps,
  ref: React.ForwardedRef<DialogDescriptionElement>
): React.JSX.Element => (
  <DialogPrimitive.Description
    ref={ref}
    data-slot="dialog-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName ?? "DialogDescription";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};