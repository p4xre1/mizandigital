"use client";

import * as React from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "../../lib/utils";

export type NavigationMenuElement = React.ElementRef<
  typeof NavigationMenuPrimitive.Root
>;
export interface NavigationMenuProps
  extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root> {
  viewport?: boolean;
}

const NavigationMenu = React.forwardRef<
  NavigationMenuElement,
  NavigationMenuProps
>(
  (
    { className, children, viewport = true, ...props }: NavigationMenuProps,
    ref: React.ForwardedRef<NavigationMenuElement>
  ): React.JSX.Element => (
    <NavigationMenuPrimitive.Root
      ref={ref}
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  )
);
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

export type NavigationMenuListElement = React.ElementRef<
  typeof NavigationMenuPrimitive.List
>;
export interface NavigationMenuListProps
  extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List> {}

const NavigationMenuList = React.forwardRef<
  NavigationMenuListElement,
  NavigationMenuListProps
>(
  (
    { className, ...props }: NavigationMenuListProps,
    ref: React.ForwardedRef<NavigationMenuListElement>
  ): React.JSX.Element => (
    <NavigationMenuPrimitive.List
      ref={ref}
      data-slot="navigation-menu-list"
      className={cn(
        "group flex flex-1 list-none items-center justify-center gap-1",
        className
      )}
      {...props}
    />
  )
);
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

export type NavigationMenuItemElement = React.ElementRef<
  typeof NavigationMenuPrimitive.Item
>;
export interface NavigationMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Item> {}

const NavigationMenuItem = React.forwardRef<
  NavigationMenuItemElement,
  NavigationMenuItemProps
>(
  (
    { className, ...props }: NavigationMenuItemProps,
    ref: React.ForwardedRef<NavigationMenuItemElement>
  ): React.JSX.Element => (
    <NavigationMenuPrimitive.Item
      ref={ref}
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  )
);
NavigationMenuItem.displayName = NavigationMenuPrimitive.Item.displayName;

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-muted data-[state=open]:text-foreground focus-visible:ring-ring/50 outline-none transition-colors"
);

export type NavigationMenuTriggerElement = React.ElementRef<
  typeof NavigationMenuPrimitive.Trigger
>;
export interface NavigationMenuTriggerProps
  extends React.ComponentPropsWithoutRef<
    typeof NavigationMenuPrimitive.Trigger
  > {}

const NavigationMenuTrigger = React.forwardRef<
  NavigationMenuTriggerElement,
  NavigationMenuTriggerProps
>(
  (
    { className, children, ...props }: NavigationMenuTriggerProps,
    ref: React.ForwardedRef<NavigationMenuTriggerElement>
  ): React.JSX.Element => (
    <NavigationMenuPrimitive.Trigger
      ref={ref}
      data-slot="navigation-menu-trigger"
      className={cn(
        navigationMenuTriggerStyle(),
        "group cursor-pointer",
        className
      )}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon
        className="relative top-[1px] size-3 transition duration-300 group-data-[state=open]:rotate-180 ltr:ml-1 rtl:mr-1"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  )
);
NavigationMenuTrigger.displayName =
  NavigationMenuPrimitive.Trigger.displayName;

export type NavigationMenuContentElement = React.ElementRef<
  typeof NavigationMenuPrimitive.Content
>;
export interface NavigationMenuContentProps
  extends React.ComponentPropsWithoutRef<
    typeof NavigationMenuPrimitive.Content
  > {}

const NavigationMenuContent = React.forwardRef<
  NavigationMenuContentElement,
  NavigationMenuContentProps
>(
  (
    { className, ...props }: NavigationMenuContentProps,
    ref: React.ForwardedRef<NavigationMenuContentElement>
  ): React.JSX.Element => (
    <NavigationMenuPrimitive.Content
      ref={ref}
      data-slot="navigation-menu-content"
      className={cn(
        "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 top-0 w-full p-2 md:absolute md:w-auto ltr:left-0 ltr:pr-2.5 rtl:right-0 rtl:pl-2.5",
        "group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:border-border group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:shadow-md group-data-[viewport=false]/navigation-menu:duration-200 **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none",
        className
      )}
      {...props}
    />
  )
);
NavigationMenuContent.displayName =
  NavigationMenuPrimitive.Content.displayName;

export type NavigationMenuViewportElement = React.ElementRef<
  typeof NavigationMenuPrimitive.Viewport
>;
export interface NavigationMenuViewportProps
  extends React.ComponentPropsWithoutRef<
    typeof NavigationMenuPrimitive.Viewport
  > {}

const NavigationMenuViewport = React.forwardRef<
  NavigationMenuViewportElement,
  NavigationMenuViewportProps
>(
  (
    { className, ...props }: NavigationMenuViewportProps,
    ref: React.ForwardedRef<NavigationMenuViewportElement>
  ): React.JSX.Element => (
    <div
      className={cn(
        "absolute top-full isolate z-50 flex justify-center ltr:left-0 rtl:right-0"
      )}
    >
      <NavigationMenuPrimitive.Viewport
        ref={ref}
        data-slot="navigation-menu-viewport"
        className={cn(
          "origin-top-center bg-popover text-popover-foreground border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border shadow-md md:w-[var(--radix-navigation-menu-viewport-width)] transition-[width,height] duration-200",
          className
        )}
        {...props}
      />
    </div>
  )
);
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName;

export type NavigationMenuLinkElement = React.ElementRef<
  typeof NavigationMenuPrimitive.Link
>;
export interface NavigationMenuLinkProps
  extends React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link> {}

const NavigationMenuLink = React.forwardRef<
  NavigationMenuLinkElement,
  NavigationMenuLinkProps
>(
  (
    { className, ...props }: NavigationMenuLinkProps,
    ref: React.ForwardedRef<NavigationMenuLinkElement>
  ): React.JSX.Element => (
    <NavigationMenuPrimitive.Link
      ref={ref}
      data-slot="navigation-menu-link"
      className={cn(
        "text-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground focus-visible:ring-ring/50 [&_svg:not([class*='text-'])]:text-muted-foreground flex flex-col gap-1 rounded-sm p-2 text-sm transition-colors outline-none focus-visible:ring-2 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
);
NavigationMenuLink.displayName = NavigationMenuPrimitive.Link.displayName;

export type NavigationMenuIndicatorElement = React.ElementRef<
  typeof NavigationMenuPrimitive.Indicator
>;
export interface NavigationMenuIndicatorProps
  extends React.ComponentPropsWithoutRef<
    typeof NavigationMenuPrimitive.Indicator
  > {}

const NavigationMenuIndicator = React.forwardRef<
  NavigationMenuIndicatorElement,
  NavigationMenuIndicatorProps
>(
  (
    { className, ...props }: NavigationMenuIndicatorProps,
    ref: React.ForwardedRef<NavigationMenuIndicatorElement>
  ): React.JSX.Element => (
    <NavigationMenuPrimitive.Indicator
      ref={ref}
      data-slot="navigation-menu-indicator"
      className={cn(
        "data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="bg-border relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm shadow-md" />
    </NavigationMenuPrimitive.Indicator>
  )
);
NavigationMenuIndicator.displayName =
  NavigationMenuPrimitive.Indicator.displayName;

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
};