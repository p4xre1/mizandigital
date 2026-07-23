"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "../../lib/utils";

export type DrawerProps = React.ComponentProps<typeof DrawerPrimitive.Root>;

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: DrawerProps): React.JSX.Element => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    data-slot="drawer"
    {...props}
  />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

export type DrawerOverlayElement = React.ElementRef<
  typeof DrawerPrimitive.Overlay
>;
export interface DrawerOverlayProps
  extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay> {}

const DrawerOverlay = React.forwardRef<
  DrawerOverlayElement,
  DrawerOverlayProps
>(
  (
    { className, ...props }: DrawerOverlayProps,
    ref: React.ForwardedRef<DrawerOverlayElement>
  ): React.JSX.Element => (
    <DrawerPrimitive.Overlay
      ref={ref}
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
);
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

export type DrawerContentElement = React.ElementRef<
  typeof DrawerPrimitive.Content
>;
export interface DrawerContentProps
  extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {}

const DrawerContent = React.forwardRef<
  DrawerContentElement,
  DrawerContentProps
>(
  (
    { className, children, ...props }: DrawerContentProps,
    ref: React.ForwardedRef<DrawerContentElement>
  ): React.JSX.Element => (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content fixed z-50 flex h-auto flex-col bg-background",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        <div className="mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
);
DrawerContent.displayName = "DrawerContent";

export type DrawerHeaderElement = HTMLDivElement;
export interface DrawerHeaderProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const DrawerHeader = React.forwardRef<DrawerHeaderElement, DrawerHeaderProps>(
  (
    { className, ...props }: DrawerHeaderProps,
    ref: React.ForwardedRef<DrawerHeaderElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-1.5 p-4 ltr:text-left rtl:text-right sm:text-left sm:rtl:text-right",
        className
      )}
      {...props}
    />
  )
);
DrawerHeader.displayName = "DrawerHeader";

export type DrawerFooterElement = HTMLDivElement;
export interface DrawerFooterProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const DrawerFooter = React.forwardRef<DrawerFooterElement, DrawerFooterProps>(
  (
    { className, ...props }: DrawerFooterProps,
    ref: React.ForwardedRef<DrawerFooterElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
);
DrawerFooter.displayName = "DrawerFooter";

export type DrawerTitleElement = React.ElementRef<
  typeof DrawerPrimitive.Title
>;
export interface DrawerTitleProps
  extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title> {}

const DrawerTitle = React.forwardRef<DrawerTitleElement, DrawerTitleProps>(
  (
    { className, ...props }: DrawerTitleProps,
    ref: React.ForwardedRef<DrawerTitleElement>
  ): React.JSX.Element => (
    <DrawerPrimitive.Title
      ref={ref}
      data-slot="drawer-title"
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
);
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

export type DrawerDescriptionElement = React.ElementRef<
  typeof DrawerPrimitive.Description
>;
export interface DrawerDescriptionProps
  extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description> {}

const DrawerDescription = React.forwardRef<
  DrawerDescriptionElement,
  DrawerDescriptionProps
>(
  (
    { className, ...props }: DrawerDescriptionProps,
    ref: React.ForwardedRef<DrawerDescriptionElement>
  ): React.JSX.Element => (
    <DrawerPrimitive.Description
      ref={ref}
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};