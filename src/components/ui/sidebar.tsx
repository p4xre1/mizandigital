"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";

import { useIsMobile } from "../../hooks/useMobile";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Separator } from "./separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./sheet";
import { Skeleton } from "./skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar(): SidebarContextProps {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

export type SidebarProviderElement = HTMLDivElement;
export interface SidebarProviderProps
  extends React.ComponentPropsWithoutRef<"div"> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SidebarProvider = React.forwardRef<
  SidebarProviderElement,
  SidebarProviderProps
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    }: SidebarProviderProps,
    ref: React.ForwardedRef<SidebarProviderElement>
  ): React.JSX.Element => {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);

    // Internal state of the sidebar
    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }

        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      },
      [setOpenProp, open]
    );

    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((prev) => !prev)
        : setOpen((prev) => !prev);
    }, [isMobile, setOpen, setOpenMobile]);

    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          toggleSidebar();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    const state = open ? "expanded" : "collapsed";

    const contextValue = React.useMemo<SidebarContextProps>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            ref={ref}
            data-slot="sidebar-wrapper"
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
              className
            )}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = "SidebarProvider";

export type SidebarElement = HTMLDivElement;
export interface SidebarProps extends React.ComponentPropsWithoutRef<"div"> {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}

const Sidebar = React.forwardRef<SidebarElement, SidebarProps>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      className,
      children,
      ...props
    }: SidebarProps,
    ref: React.ForwardedRef<SidebarElement>
  ): React.JSX.Element => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (collapsible === "none") {
      return (
        <div
          ref={ref}
          data-slot="sidebar"
          className={cn(
            "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
            className
          )}
          {...props}
        >
          {children}
        </div>
      );
    }

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            data-sidebar="sidebar"
            data-slot="sidebar"
            data-mobile="true"
            className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
            side={side}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Sidebar</SheetTitle>
              <SheetDescription>Displays the mobile sidebar.</SheetDescription>
            </SheetHeader>
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <div
        ref={ref}
        className="group peer text-sidebar-foreground hidden md:block"
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
        data-slot="sidebar"
      >
        <div
          data-slot="sidebar-gap"
          className={cn(
            "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
            "group-data-[collapsible=offcanvas]:w-0",
            "group-data-[side=right]:rotate-180",
            variant === "floating" || variant === "inset"
              ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
              : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
          )}
        />
        <div
          data-slot="sidebar-container"
          className={cn(
            "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
            side === "left"
              ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
              : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
            variant === "floating" || variant === "inset"
              ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
              : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) ltr:group-data-[side=left]:border-r rtl:group-data-[side=left]:border-l ltr:group-data-[side=right]:border-l rtl:group-data-[side=right]:border-r",
            className
          )}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            data-slot="sidebar-inner"
            className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
          >
            {children}
          </div>
        </div>
      </div>
    );
  }
);
Sidebar.displayName = "Sidebar";

export type SidebarTriggerElement = React.ElementRef<typeof Button>;
export interface SidebarTriggerProps
  extends React.ComponentPropsWithoutRef<typeof Button> {}

const SidebarTrigger = React.forwardRef<SidebarTriggerElement, SidebarTriggerProps>(
  (
    { className, onClick, ...props }: SidebarTriggerProps,
    ref: React.ForwardedRef<SidebarTriggerElement>
  ): React.JSX.Element => {
    const { toggleSidebar } = useSidebar();

    return (
      <Button
        ref={ref}
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon"
        className={cn("size-7", className)}
        onClick={(event) => {
          onClick?.(event);
          toggleSidebar();
        }}
        {...props}
      >
        <PanelLeftIcon className="rtl:rotate-180" />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    );
  }
);
SidebarTrigger.displayName = "SidebarTrigger";

export type SidebarRailElement = HTMLButtonElement;
export interface SidebarRailProps
  extends React.ComponentPropsWithoutRef<"button"> {}

const SidebarRail = React.forwardRef<SidebarRailElement, SidebarRailProps>(
  (
    { className, ...props }: SidebarRailProps,
    ref: React.ForwardedRef<SidebarRailElement>
  ): React.JSX.Element => {
    const { toggleSidebar } = useSidebar();

    return (
      <button
        ref={ref}
        data-sidebar="rail"
        data-slot="sidebar-rail"
        aria-label="Toggle Sidebar"
        tabIndex={-1}
        onClick={toggleSidebar}
        title="Toggle Sidebar"
        className={cn(
          "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex",
          "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
          "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
          "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
          "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
          "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarRail.displayName = "SidebarRail";

export type SidebarInsetElement = HTMLElement;
export interface SidebarInsetProps
  extends React.ComponentPropsWithoutRef<"main"> {}

const SidebarInset = React.forwardRef<SidebarInsetElement, SidebarInsetProps>(
  (
    { className, ...props }: SidebarInsetProps,
    ref: React.ForwardedRef<SidebarInsetElement>
  ): React.JSX.Element => (
    <main
      ref={ref}
      data-slot="sidebar-inset"
      className={cn(
        "bg-background relative flex w-full flex-1 flex-col",
        "md:peer-data-[variant=inset]:m-2 ltr:md:peer-data-[variant=inset]:ml-0 rtl:md:peer-data-[variant=inset]:mr-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm ltr:md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2 rtl:md:peer-data-[variant=inset]:peer-data-[state=collapsed]:mr-2",
        className
      )}
      {...props}
    />
  )
);
SidebarInset.displayName = "SidebarInset";

export type SidebarInputElement = React.ElementRef<typeof Input>;
export interface SidebarInputProps
  extends React.ComponentPropsWithoutRef<typeof Input> {}

const SidebarInput = React.forwardRef<SidebarInputElement, SidebarInputProps>(
  (
    { className, ...props }: SidebarInputProps,
    ref: React.ForwardedRef<SidebarInputElement>
  ): React.JSX.Element => (
    <Input
      ref={ref}
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn("bg-background h-8 w-full shadow-none", className)}
      {...props}
    />
  )
);
SidebarInput.displayName = "SidebarInput";

export type SidebarHeaderElement = HTMLDivElement;
export interface SidebarHeaderProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const SidebarHeader = React.forwardRef<SidebarHeaderElement, SidebarHeaderProps>(
  (
    { className, ...props }: SidebarHeaderProps,
    ref: React.ForwardedRef<SidebarHeaderElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
);
SidebarHeader.displayName = "SidebarHeader";

export type SidebarFooterElement = HTMLDivElement;
export interface SidebarFooterProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const SidebarFooter = React.forwardRef<SidebarFooterElement, SidebarFooterProps>(
  (
    { className, ...props }: SidebarFooterProps,
    ref: React.ForwardedRef<SidebarFooterElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
);
SidebarFooter.displayName = "SidebarFooter";

export type SidebarSeparatorElement = React.ElementRef<typeof Separator>;
export interface SidebarSeparatorProps
  extends React.ComponentPropsWithoutRef<typeof Separator> {}

const SidebarSeparator = React.forwardRef<
  SidebarSeparatorElement,
  SidebarSeparatorProps
>(
  (
    { className, ...props }: SidebarSeparatorProps,
    ref: React.ForwardedRef<SidebarSeparatorElement>
  ): React.JSX.Element => (
    <Separator
      ref={ref}
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      {...props}
    />
  )
);
SidebarSeparator.displayName = "SidebarSeparator";

export type SidebarContentElement = HTMLDivElement;
export interface SidebarContentProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const SidebarContent = React.forwardRef<SidebarContentElement, SidebarContentProps>(
  (
    { className, ...props }: SidebarContentProps,
    ref: React.ForwardedRef<SidebarContentElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    />
  )
);
SidebarContent.displayName = "SidebarContent";

export type SidebarGroupElement = HTMLDivElement;
export interface SidebarGroupProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const SidebarGroup = React.forwardRef<SidebarGroupElement, SidebarGroupProps>(
  (
    { className, ...props }: SidebarGroupProps,
    ref: React.ForwardedRef<SidebarGroupElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  )
);
SidebarGroup.displayName = "SidebarGroup";

export type SidebarGroupLabelElement = HTMLDivElement;
export interface SidebarGroupLabelProps
  extends React.ComponentPropsWithoutRef<"div"> {
  asChild?: boolean;
}

const SidebarGroupLabel = React.forwardRef<
  SidebarGroupLabelElement,
  SidebarGroupLabelProps
>(
  (
    { className, asChild = false, ...props }: SidebarGroupLabelProps,
    ref: React.ForwardedRef<SidebarGroupLabelElement>
  ): React.JSX.Element => {
    const Comp = asChild ? Slot : "div";

    return (
      <Comp
        ref={ref}
        data-slot="sidebar-group-label"
        data-sidebar="group-label"
        className={cn(
          "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 ltr:text-left rtl:text-right",
          "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";

export type SidebarGroupActionElement = HTMLButtonElement;
export interface SidebarGroupActionProps
  extends React.ComponentPropsWithoutRef<"button"> {
  asChild?: boolean;
}

const SidebarGroupAction = React.forwardRef<
  SidebarGroupActionElement,
  SidebarGroupActionProps
>(
  (
    { className, asChild = false, ...props }: SidebarGroupActionProps,
    ref: React.ForwardedRef<SidebarGroupActionElement>
  ): React.JSX.Element => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-slot="sidebar-group-action"
        data-sidebar="group-action"
        className={cn(
          "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 ltr:right-3 rtl:left-3",
          "after:absolute after:-inset-2 md:after:hidden",
          "group-data-[collapsible=icon]:hidden",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarGroupAction.displayName = "SidebarGroupAction";

export type SidebarGroupContentElement = HTMLDivElement;
export interface SidebarGroupContentProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const SidebarGroupContent = React.forwardRef<
  SidebarGroupContentElement,
  SidebarGroupContentProps
>(
  (
    { className, ...props }: SidebarGroupContentProps,
    ref: React.ForwardedRef<SidebarGroupContentElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  )
);
SidebarGroupContent.displayName = "SidebarGroupContent";

export type SidebarMenuElement = HTMLUListElement;
export interface SidebarMenuProps
  extends React.ComponentPropsWithoutRef<"ul"> {}

const SidebarMenu = React.forwardRef<SidebarMenuElement, SidebarMenuProps>(
  (
    { className, ...props }: SidebarMenuProps,
    ref: React.ForwardedRef<SidebarMenuElement>
  ): React.JSX.Element => (
    <ul
      ref={ref}
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  )
);
SidebarMenu.displayName = "SidebarMenu";

export type SidebarMenuItemElement = HTMLLIElement;
export interface SidebarMenuItemProps
  extends React.ComponentPropsWithoutRef<"li"> {}

const SidebarMenuItem = React.forwardRef<
  SidebarMenuItemElement,
  SidebarMenuItemProps
>(
  (
    { className, ...props }: SidebarMenuItemProps,
    ref: React.ForwardedRef<SidebarMenuItemElement>
  ): React.JSX.Element => (
    <li
      ref={ref}
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  )
);
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 ltr:text-left rtl:text-right text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 ltr:group-has-data-[sidebar=menu-action]/menu-item:pr-8 rtl:group-has-data-[sidebar=menu-action]/menu-item:pl-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type SidebarMenuButtonElement = HTMLButtonElement;
export interface SidebarMenuButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof sidebarMenuButtonVariants> {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string | React.ComponentProps<typeof TooltipContent>;
}

const SidebarMenuButton = React.forwardRef<
  SidebarMenuButtonElement,
  SidebarMenuButtonProps
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      ...props
    }: SidebarMenuButtonProps,
    ref: React.ForwardedRef<SidebarMenuButtonElement>
  ): React.JSX.Element => {
    const Comp = asChild ? Slot : "button";
    const { isMobile, state } = useSidebar();

    const button = (
      <Comp
        ref={ref}
        data-slot="sidebar-menu-button"
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    );

    if (!tooltip) {
      return button;
    }

    const tooltipProps =
      typeof tooltip === "string" ? { children: tooltip } : tooltip;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltipProps}
        />
      </Tooltip>
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";

export type SidebarMenuActionElement = HTMLButtonElement;
export interface SidebarMenuActionProps
  extends React.ComponentPropsWithoutRef<"button"> {
  asChild?: boolean;
  showOnHover?: boolean;
}

const SidebarMenuAction = React.forwardRef<
  SidebarMenuActionElement,
  SidebarMenuActionProps
>(
  (
    {
      className,
      asChild = false,
      showOnHover = false,
      ...props
    }: SidebarMenuActionProps,
    ref: React.ForwardedRef<SidebarMenuActionElement>
  ): React.JSX.Element => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-slot="sidebar-menu-action"
        data-sidebar="menu-action"
        className={cn(
          "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 ltr:right-1 rtl:left-1",
          "after:absolute after:-inset-2 md:after:hidden",
          "peer-data-[size=sm]/menu-button:top-1",
          "peer-data-[size=default]/menu-button:top-1.5",
          "peer-data-[size=lg]/menu-button:top-2.5",
          "group-data-[collapsible=icon]:hidden",
          showOnHover &&
            "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarMenuAction.displayName = "SidebarMenuAction";

export type SidebarMenuBadgeElement = HTMLDivElement;
export interface SidebarMenuBadgeProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const SidebarMenuBadge = React.forwardRef<
  SidebarMenuBadgeElement,
  SidebarMenuBadgeProps
>(
  (
    { className, ...props }: SidebarMenuBadgeProps,
    ref: React.ForwardedRef<SidebarMenuBadgeElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "text-sidebar-foreground pointer-events-none absolute flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none ltr:right-1 rtl:left-1",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
);
SidebarMenuBadge.displayName = "SidebarMenuBadge";

export type SidebarMenuSkeletonElement = HTMLDivElement;
export interface SidebarMenuSkeletonProps
  extends React.ComponentPropsWithoutRef<"div"> {
  showIcon?: boolean;
}

const SidebarMenuSkeleton = React.forwardRef<
  SidebarMenuSkeletonElement,
  SidebarMenuSkeletonProps
>(
  (
    { className, showIcon = false, ...props }: SidebarMenuSkeletonProps,
    ref: React.ForwardedRef<SidebarMenuSkeletonElement>
  ): React.JSX.Element => {
    const width = React.useMemo(() => {
      return `${Math.floor(Math.random() * 40) + 50}%`;
    }, []);

    return (
      <div
        ref={ref}
        data-slot="sidebar-menu-skeleton"
        data-sidebar="menu-skeleton"
        className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
        {...props}
      >
        {showIcon && (
          <Skeleton
            className="size-4 rounded-md"
            data-sidebar="menu-skeleton-icon"
          />
        )}
        <Skeleton
          className="h-4 max-w-(--skeleton-width) flex-1"
          data-sidebar="menu-skeleton-text"
          style={
            {
              "--skeleton-width": width,
            } as React.CSSProperties
          }
        />
      </div>
    );
  }
);
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";

export type SidebarMenuSubElement = HTMLUListElement;
export interface SidebarMenuSubProps
  extends React.ComponentPropsWithoutRef<"ul"> {}

const SidebarMenuSub = React.forwardRef<
  SidebarMenuSubElement,
  SidebarMenuSubProps
>(
  (
    { className, ...props }: SidebarMenuSubProps,
    ref: React.ForwardedRef<SidebarMenuSubElement>
  ): React.JSX.Element => (
    <ul
      ref={ref}
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "border-sidebar-border mx-3.5 flex min-w-0 ltr:translate-x-px rtl:-translate-x-px flex-col gap-1 ltr:border-l rtl:border-r px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className
      )}
      {...props}
    />
  )
);
SidebarMenuSub.displayName = "SidebarMenuSub";

export type SidebarMenuSubItemElement = HTMLLIElement;
export interface SidebarMenuSubItemProps
  extends React.ComponentPropsWithoutRef<"li"> {}

const SidebarMenuSubItem = React.forwardRef<
  SidebarMenuSubItemElement,
  SidebarMenuSubItemProps
>(
  (
    { className, ...props }: SidebarMenuSubItemProps,
    ref: React.ForwardedRef<SidebarMenuSubItemElement>
  ): React.JSX.Element => (
    <li
      ref={ref}
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props}
    />
  )
);
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

export type SidebarMenuSubButtonElement = HTMLAnchorElement;
export interface SidebarMenuSubButtonProps
  extends React.ComponentPropsWithoutRef<"a"> {
  asChild?: boolean;
  size?: "sm" | "md";
  isActive?: boolean;
}

const SidebarMenuSubButton = React.forwardRef<
  SidebarMenuSubButtonElement,
  SidebarMenuSubButtonProps
>(
  (
    {
      asChild = false,
      size = "md",
      isActive = false,
      className,
      ...props
    }: SidebarMenuSubButtonProps,
    ref: React.ForwardedRef<SidebarMenuSubButtonElement>
  ): React.JSX.Element => {
    const Comp = asChild ? Slot : "a";

    return (
      <Comp
        ref={ref}
        data-slot="sidebar-menu-sub-button"
        data-sidebar="menu-sub-button"
        data-size={size}
        data-active={isActive}
        className={cn(
          "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 ltr:-translate-x-px rtl:translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 ltr:text-left rtl:text-right",
          "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          "group-data-[collapsible=icon]:hidden",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};