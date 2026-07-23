"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";

import { cn } from "../../lib/utils";

const ContextMenu = ContextMenuPrimitive.Root;

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

export type ContextMenuSubTriggerElement = React.ElementRef<
  typeof ContextMenuPrimitive.SubTrigger
>;
export interface ContextMenuSubTriggerProps
  extends React.ComponentPropsWithoutRef<
    typeof ContextMenuPrimitive.SubTrigger
  > {
  inset?: boolean;
}

const ContextMenuSubTrigger = React.forwardRef<
  ContextMenuSubTriggerElement,
  ContextMenuSubTriggerProps
>(
  (
    { className, inset, children, ...props }: ContextMenuSubTriggerProps,
    ref: React.ForwardedRef<ContextMenuSubTriggerElement>
  ): React.JSX.Element => (
    <ContextMenuPrimitive.SubTrigger
      ref={ref}
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground data-[inset]:ltr:pl-8 data-[inset]:rtl:pr-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ltr:ml-auto rtl:mr-auto rtl:rotate-180" />
    </ContextMenuPrimitive.SubTrigger>
  )
);
ContextMenuSubTrigger.displayName =
  ContextMenuPrimitive.SubTrigger.displayName;

export type ContextMenuSubContentElement = React.ElementRef<
  typeof ContextMenuPrimitive.SubContent
>;
export interface ContextMenuSubContentProps
  extends React.ComponentPropsWithoutRef<
    typeof ContextMenuPrimitive.SubContent
  > {}

const ContextMenuSubContent = React.forwardRef<
  ContextMenuSubContentElement,
  ContextMenuSubContentProps
>(
  (
    { className, ...props }: ContextMenuSubContentProps,
    ref: React.ForwardedRef<ContextMenuSubContentElement>
  ): React.JSX.Element => (
    <ContextMenuPrimitive.SubContent
      ref={ref}
      data-slot="context-menu-sub-content"
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  )
);
ContextMenuSubContent.displayName =
  ContextMenuPrimitive.SubContent.displayName;

export type ContextMenuContentElement = React.ElementRef<
  typeof ContextMenuPrimitive.Content
>;
export interface ContextMenuContentProps
  extends React.ComponentPropsWithoutRef<
    typeof ContextMenuPrimitive.Content
  > {}

const ContextMenuContent = React.forwardRef<
  ContextMenuContentElement,
  ContextMenuContentProps
>(
  (
    { className, ...props }: ContextMenuContentProps,
    ref: React.ForwardedRef<ContextMenuContentElement>
  ): React.JSX.Element => (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        ref={ref}
        data-slot="context-menu-content"
        className={cn(
          "z-50 max-h-[var(--radix-context-menu-content-available-height)] min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  )
);
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

export type ContextMenuItemElement = React.ElementRef<
  typeof ContextMenuPrimitive.Item
>;
export interface ContextMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> {
  inset?: boolean;
  variant?: "default" | "destructive";
}

const ContextMenuItem = React.forwardRef<
  ContextMenuItemElement,
  ContextMenuItemProps
>(
  (
    { className, inset, variant = "default", ...props }: ContextMenuItemProps,
    ref: React.ForwardedRef<ContextMenuItemElement>
  ): React.JSX.Element => (
    <ContextMenuPrimitive.Item
      ref={ref}
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:ltr:pl-8 data-[inset]:rtl:pr-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
);
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

export type ContextMenuCheckboxItemElement = React.ElementRef<
  typeof ContextMenuPrimitive.CheckboxItem
>;
export interface ContextMenuCheckboxItemProps
  extends React.ComponentPropsWithoutRef<
    typeof ContextMenuPrimitive.CheckboxItem
  > {}

const ContextMenuCheckboxItem = React.forwardRef<
  ContextMenuCheckboxItemElement,
  ContextMenuCheckboxItemProps
>(
  (
    { className, children, checked, ...props }: ContextMenuCheckboxItemProps,
    ref: React.ForwardedRef<ContextMenuCheckboxItemElement>
  ): React.JSX.Element => (
    <ContextMenuPrimitive.CheckboxItem
      ref={ref}
      data-slot="context-menu-checkbox-item"
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 ltr:pl-8 ltr:pr-2 rtl:pr-8 rtl:pl-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute ltr:left-2 rtl:right-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
);
ContextMenuCheckboxItem.displayName =
  ContextMenuPrimitive.CheckboxItem.displayName;

export type ContextMenuRadioItemElement = React.ElementRef<
  typeof ContextMenuPrimitive.RadioItem
>;
export interface ContextMenuRadioItemProps
  extends React.ComponentPropsWithoutRef<
    typeof ContextMenuPrimitive.RadioItem
  > {}

const ContextMenuRadioItem = React.forwardRef<
  ContextMenuRadioItemElement,
  ContextMenuRadioItemProps
>(
  (
    { className, children, ...props }: ContextMenuRadioItemProps,
    ref: React.ForwardedRef<ContextMenuRadioItemElement>
  ): React.JSX.Element => (
    <ContextMenuPrimitive.RadioItem
      ref={ref}
      data-slot="context-menu-radio-item"
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 ltr:pl-8 ltr:pr-2 rtl:pr-8 rtl:pl-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute ltr:left-2 rtl:right-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
);
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

export type ContextMenuLabelElement = React.ElementRef<
  typeof ContextMenuPrimitive.Label
>;
export interface ContextMenuLabelProps
  extends React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> {
  inset?: boolean;
}

const ContextMenuLabel = React.forwardRef<
  ContextMenuLabelElement,
  ContextMenuLabelProps
>(
  (
    { className, inset, ...props }: ContextMenuLabelProps,
    ref: React.ForwardedRef<ContextMenuLabelElement>
  ): React.JSX.Element => (
    <ContextMenuPrimitive.Label
      ref={ref}
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-sm font-semibold text-foreground data-[inset]:ltr:pl-8 data-[inset]:rtl:pr-8",
        className
      )}
      {...props}
    />
  )
);
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

export type ContextMenuSeparatorElement = React.ElementRef<
  typeof ContextMenuPrimitive.Separator
>;
export interface ContextMenuSeparatorProps
  extends React.ComponentPropsWithoutRef<
    typeof ContextMenuPrimitive.Separator
  > {}

const ContextMenuSeparator = React.forwardRef<
  ContextMenuSeparatorElement,
  ContextMenuSeparatorProps
>(
  (
    { className, ...props }: ContextMenuSeparatorProps,
    ref: React.ForwardedRef<ContextMenuSeparatorElement>
  ): React.JSX.Element => (
    <ContextMenuPrimitive.Separator
      ref={ref}
      data-slot="context-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
);
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

export interface ContextMenuShortcutProps
  extends React.ComponentProps<"span"> {}

function ContextMenuShortcut({
  className,
  ...props
}: ContextMenuShortcutProps): React.JSX.Element {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(
        "ltr:ml-auto rtl:mr-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};