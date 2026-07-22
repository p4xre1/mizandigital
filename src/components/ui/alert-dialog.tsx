"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/* ==========================================================================
   1. ALERT DIALOG ROOT & PORTAL & TRIGGER (المكونات الهيكلية الأساسية)
   ========================================================================== */

export interface AlertDialogProps 
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Root> {}

const AlertDialog = ({ ...props }: AlertDialogProps): React.JSX.Element => (
  <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
);
AlertDialog.displayName = "AlertDialog";


export interface AlertDialogPortalProps 
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Portal> {}

const AlertDialogPortal = ({ ...props }: AlertDialogPortalProps): React.JSX.Element => (
  <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
);
AlertDialogPortal.displayName = "AlertDialogPortal";


export type AlertDialogTriggerElement = React.ElementRef<typeof AlertDialogPrimitive.Trigger>;
export interface AlertDialogTriggerProps 
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Trigger> {}

const AlertDialogTrigger = React.forwardRef<AlertDialogTriggerElement, AlertDialogTriggerProps>((
  { ...props }: AlertDialogTriggerProps,
  ref: React.ForwardedRef<AlertDialogTriggerElement>
): React.JSX.Element => (
  <AlertDialogPrimitive.Trigger 
    ref={ref} 
    data-slot="alert-dialog-trigger" 
    {...props} 
  />
));
AlertDialogTrigger.displayName = AlertDialogPrimitive.Trigger.displayName ?? "AlertDialogTrigger";

/* ==========================================================================
   2. ALERT DIALOG OVERLAY (مكوّن غطاء الخلفية الضبابي المحمي)
   ========================================================================== */

export type AlertDialogOverlayElement = React.ElementRef<typeof AlertDialogPrimitive.Overlay>;
export interface AlertDialogOverlayProps 
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay> {}

const AlertDialogOverlay = React.forwardRef<AlertDialogOverlayElement, AlertDialogOverlayProps>((
  { className, ...props }: AlertDialogOverlayProps,
  ref: React.ForwardedRef<AlertDialogOverlayElement>
): React.JSX.Element => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    data-slot="alert-dialog-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 transition-all duration-200 will-change-auto",
      className
    )}
    {...props}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName ?? "AlertDialogOverlay";

/* ==========================================================================
   3. ALERT DIALOG CONTENT (حاوية المحتوى المحسنة بكرت الشاشة)
   ========================================================================== */

export type AlertDialogContentElement = React.ElementRef<typeof AlertDialogPrimitive.Content>;
export interface AlertDialogContentProps 
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content> {}

const AlertDialogContent = React.forwardRef<AlertDialogContentElement, AlertDialogContentProps>((
  { className, ...props }: AlertDialogContentProps,
  ref: React.ForwardedRef<AlertDialogContentElement>
): React.JSX.Element => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      data-slot="alert-dialog-content"
      className={cn(
        "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] transform-gpu gap-4 rounded-xl border border-border p-6 shadow-xl duration-200 sm:max-w-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 focus:outline-none print:hidden",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName ?? "AlertDialogContent";

/* ==========================================================================
   4. ALERT DIALOG HEADER & FOOTER (مكونات ترويسة وتذييل مرنة)
   ========================================================================== */

export type AlertDialogHeaderElement = React.ElementRef<"div">;
export interface AlertDialogHeaderProps extends React.ComponentPropsWithoutRef<"div"> {}

const AlertDialogHeader = React.forwardRef<AlertDialogHeaderElement, AlertDialogHeaderProps>((
  { className, ...props }: AlertDialogHeaderProps,
  ref: React.ForwardedRef<AlertDialogHeaderElement>
): React.JSX.Element => (
  <div
    ref={ref}
    data-slot="alert-dialog-header"
    className={cn("flex flex-col gap-2 text-center sm:text-start", className)}
    {...props}
  />
));
AlertDialogHeader.displayName = "AlertDialogHeader";


export type AlertDialogFooterElement = React.ElementRef<"div">;
export interface AlertDialogFooterProps extends React.ComponentPropsWithoutRef<"div"> {}

const AlertDialogFooter = React.forwardRef<AlertDialogFooterElement, AlertDialogFooterProps>((
  { className, ...props }: AlertDialogFooterProps,
  ref: React.ForwardedRef<AlertDialogFooterElement>
): React.JSX.Element => (
  <div
    ref={ref}
    data-slot="alert-dialog-footer"
    className={cn(
      "flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
));
AlertDialogFooter.displayName = "AlertDialogFooter";

/* ==========================================================================
   5. ALERT DIALOG TITLE & DESCRIPTION (عناوين وشروح واضحة ومقروءة)
   ========================================================================== */

export type AlertDialogTitleElement = React.ElementRef<typeof AlertDialogPrimitive.Title>;
export interface AlertDialogTitleProps 
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title> {}

const AlertDialogTitle = React.forwardRef<AlertDialogTitleElement, AlertDialogTitleProps>((
  { className, ...props }: AlertDialogTitleProps,
  ref: React.ForwardedRef<AlertDialogTitleElement>
): React.JSX.Element => (
  <AlertDialogPrimitive.Title
    ref={ref}
    data-slot="alert-dialog-title"
    className={cn("text-lg font-semibold tracking-tight text-foreground select-none", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName ?? "AlertDialogTitle";


export type AlertDialogDescriptionElement = React.ElementRef<typeof AlertDialogPrimitive.Description>;
export interface AlertDialogDescriptionProps 
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description> {}

const AlertDialogDescription = React.forwardRef<AlertDialogDescriptionElement, AlertDialogDescriptionProps>((
  { className, ...props }: AlertDialogDescriptionProps,
  ref: React.ForwardedRef<AlertDialogDescriptionElement>
): React.JSX.Element => (
  <AlertDialogPrimitive.Description
    ref={ref}
    data-slot="alert-dialog-description"
    className={cn("text-muted-foreground text-sm leading-relaxed", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName ?? "AlertDialogDescription";

/* ==========================================================================
   6. ALERT DIALOG ACTIONS (أزرار التأكيد والإلغاء مع المراجع الكاملة)
   ========================================================================== */

export type AlertDialogActionElement = React.ElementRef<typeof AlertDialogPrimitive.Action>;
export interface AlertDialogActionProps 
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> {}

const AlertDialogAction = React.forwardRef<AlertDialogActionElement, AlertDialogActionProps>((
  { className, ...props }: AlertDialogActionProps,
  ref: React.ForwardedRef<AlertDialogActionElement>
): React.JSX.Element => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
));
AlertDialogAction.displayName = "AlertDialogAction";


export type AlertDialogCancelElement = React.ElementRef<typeof AlertDialogPrimitive.Cancel>;
export interface AlertDialogCancelProps 
  extends React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel> {}

const AlertDialogCancel = React.forwardRef<AlertDialogCancelElement, AlertDialogCancelProps>((
  { className, ...props }: AlertDialogCancelProps,
  ref: React.ForwardedRef<AlertDialogCancelElement>
): React.JSX.Element => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: "outline" }), className)}
    {...props}
  />
));
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};