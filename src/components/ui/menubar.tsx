"use client";

import * as React from "react";
import * as MenubarPrimitive from "@radix-ui/react-menubar";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";

import { cn } from "../../lib/utils";

export type MenubarElement = React.ElementRef<typeof MenubarPrimitive.Root>;
export interface MenubarProps
  extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root> {}

const Menubar = React.forwardRef<MenubarElement, MenubarProps>(
  (
    { className, ...props }: MenubarProps,
    ref: React.ForwardedRef<MenubarElement>
  ): React.JSX.Element => (
    <MenubarPrimitive.Root
      ref={ref}
      data-slot="menubar"
      className={cn(
        "bg-card text-foreground border-border flex h-10 items-center gap-1 rounded-lg border p-1 shadow-xs",
        className
      )}
      {...props}
    />
  )
);
Menubar.displayName = MenubarPrimitive.Root.displayName;

const MenubarMenu = MenubarPrimitive.Menu;
const MenubarGroup = MenubarPrimitive.Group;
const MenubarPortal = MenubarPrimitive.Portal;
const MenubarRadioGroup = MenubarPrimitive.RadioGroup;
const MenubarSub = MenubarPrimitive.Sub;

export type MenubarTriggerElement = React.ElementRef<typeof MenubarPrimitive.Trigger>;
export interface MenubarTriggerProps
  extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger> {}

const MenubarTrigger = React.forwardRef<MenubarTriggerElement, MenubarTriggerProps>(
  (
    { className, ...props }: MenubarTriggerProps,
    ref: React.ForwardedRef<MenubarTriggerElement>
  ): React.JSX.Element => (
    <MenubarPrimitive.Trigger
      ref={ref}
      data-slot="menubar-trigger"
      className={cn(
        "text-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground flex cursor-pointer items-center rounded-md px-3 py-1.5 text-sm font-medium outline-none select-none transition-colors",
        className
      )}
      {...props}
    />
  )
);
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName;

export type MenubarSubTriggerElement = React.ElementRef<typeof MenubarPrimitive.SubTrigger>;
export interface MenubarSubTriggerProps
  extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> {
  inset?: boolean;
}

const MenubarSubTrigger = React.forwardRef<MenubarSubTriggerElement, MenubarSubTriggerProps>(
  (
    { className, inset, children, ...props }: MenubarSubTriggerProps,
    ref: React.ForwardedRef<MenubarSubTriggerElement>
  ): React.JSX.Element => (
    <MenubarPrimitive.SubTrigger
      ref={ref}
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-muted focus:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[inset]:ltr:pl-8 data-[inset]:rtl:pr-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="size-4 ltr:ml-auto rtl:mr-auto rtl:rotate-180" />
    </MenubarPrimitive.SubTrigger>
  )
);
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName;

export type MenubarSubContentElement = React.ElementRef<typeof MenubarPrimitive.SubContent>;
export interface MenubarSubContentProps
  extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent> {}

const MenubarSubContent = React.forwardRef<MenubarSubContentElement, MenubarSubContentProps>(
  (
    { className, ...props }: MenubarSubContentProps,
    ref: React.ForwardedRef<MenubarSubContentElement>
  ): React.JSX.Element => (
    <MenubarPrimitive.SubContent
      ref={ref}
      data-slot="menubar-sub-content"
      className={cn(
        "bg-popover text-popover-foreground border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg",
        className
      )}
      {...props}
    />
  )
);
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName;

export type MenubarContentElement = React.ElementRef<typeof MenubarPrimitive.Content>;
export interface MenubarContentProps
  extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content> {}

const MenubarContent = React.forwardRef<MenubarContentElement, MenubarContentProps>(
  (
    {
      className,
      align = "start",
      alignOffset = -4,
      sideOffset = 8,
      ...props
    }: MenubarContentProps,
    ref: React.ForwardedRef<MenubarContentElement>
  ): React.JSX.Element => (
    <MenubarPortal>
      <MenubarPrimitive.Content
        ref={ref}
        data-slot="menubar-content"
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground border-border data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[12rem] overflow-hidden rounded-md border p-1 shadow-md",
          className
        )}
        {...props}
      />
    </MenubarPortal>
  )
);
MenubarContent.displayName = MenubarPrimitive.Content.displayName;

export type MenubarItemElement = React.ElementRef<typeof MenubarPrimitive.Item>;
export interface MenubarItemProps
  extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> {
  inset?: boolean;
  variant?: "default" | "destructive";
}

const MenubarItem = React.forwardRef<MenubarItemElement, MenubarItemProps>(
  (
    { className, inset, variant = "default", ...props }: MenubarItemProps,
    ref: React.ForwardedRef<MenubarItemElement>
  ): React.JSX.Element => (
    <MenubarPrimitive.Item
      ref={ref}
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-muted focus:text-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:ltr:pl-8 data-[inset]:rtl:pr-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
);
MenubarItem.displayName = MenubarPrimitive.Item.displayName;

export type MenubarCheckboxItemElement = React.ElementRef<typeof MenubarPrimitive.CheckboxItem>;
export interface MenubarCheckboxItemProps
  extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem> {}

const MenubarCheckboxItem = React.forwardRef<
  MenubarCheckboxItemElement,
  MenubarCheckboxItemProps
>(
  (
    { className, children, checked, ...props }: MenubarCheckboxItemProps,
    ref: React.ForwardedRef<MenubarCheckboxItemElement>
  ): React.JSX.Element => (
    <MenubarPrimitive.CheckboxItem
      ref={ref}
      data-slot="menubar-checkbox-item"
      className={cn(
        "focus:bg-muted focus:text-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ltr:pl-8 ltr:pr-2 rtl:pr-8 rtl:pl-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute flex size-3.5 items-center justify-center ltr:left-2 rtl:right-2">
        <MenubarPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  )
);
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName;

export type MenubarRadioItemElement = React.ElementRef<typeof MenubarPrimitive.RadioItem>;
export interface MenubarRadioItemProps
  extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem> {}

const MenubarRadioItem = React.forwardRef<MenubarRadioItemElement, MenubarRadioItemProps>(
  (
    { className, children, ...props }: MenubarRadioItemProps,
    ref: React.ForwardedRef<MenubarRadioItemElement>
  ): React.JSX.Element => (
    <MenubarPrimitive.RadioItem
      ref={ref}
      data-slot="menubar-radio-item"
      className={cn(
        "focus:bg-muted focus:text-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ltr:pl-8 ltr:pr-2 rtl:pr-8 rtl:pl-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute flex size-3.5 items-center justify-center ltr:left-2 rtl:right-2">
        <MenubarPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  )
);
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName;

export type MenubarLabelElement = React.ElementRef<typeof MenubarPrimitive.Label>;
export interface MenubarLabelProps
  extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> {
  inset?: boolean;
}

const MenubarLabel = React.forwardRef<MenubarLabelElement, MenubarLabelProps>(
  (
    { className, inset, ...props }: MenubarLabelProps,
    ref: React.ForwardedRef<MenubarLabelElement>
  ): React.JSX.Element => (
    <MenubarPrimitive.Label
      ref={ref}
      data-slot="menubar-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-sm font-medium text-foreground data-[inset]:ltr:pl-8 data-[inset]:rtl:pr-8",
        className
      )}
      {...props}
    />
  )
);
MenubarLabel.displayName = MenubarPrimitive.Label.displayName;

export type MenubarSeparatorElement = React.ElementRef<typeof MenubarPrimitive.Separator>;
export interface MenubarSeparatorProps
  extends React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator> {}

const MenubarSeparator = React.forwardRef<MenubarSeparatorElement, MenubarSeparatorProps>(
  (
    { className, ...props }: MenubarSeparatorProps,
    ref: React.ForwardedRef<MenubarSeparatorElement>
  ): React.JSX.Element => (
    <MenubarPrimitive.Separator
      ref={ref}
      data-slot="menubar-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
);
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName;

export type MenubarShortcutElement = HTMLSpanElement;
export interface MenubarShortcutProps
  extends React.ComponentPropsWithoutRef<"span"> {}

const MenubarShortcut = React.forwardRef<MenubarShortcutElement, MenubarShortcutProps>(
  (
    { className, ...props }: MenubarShortcutProps,
    ref: React.ForwardedRef<MenubarShortcutElement>
  ): React.JSX.Element => (
    <span
      ref={ref}
      data-slot="menubar-shortcut"
      className={cn(
        "text-muted-foreground text-xs tracking-widest ltr:ml-auto rtl:mr-auto",
        className
      )}
      {...props}
    />
  )
);
MenubarShortcut.displayName = "MenubarShortcut";

export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
};