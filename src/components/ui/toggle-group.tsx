"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { toggleVariants } from "./toggle";

export type ToggleGroupContextValue = VariantProps<typeof toggleVariants>;

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: "default",
  variant: "default",
});

export type ToggleGroupElement = React.ElementRef<
  typeof ToggleGroupPrimitive.Root
>;

export type ToggleGroupProps = React.ComponentPropsWithoutRef<
  typeof ToggleGroupPrimitive.Root
> &
  VariantProps<typeof toggleVariants>;

const ToggleGroup = React.forwardRef<ToggleGroupElement, ToggleGroupProps>(
  (
    { className, variant, size, children, ...props }: ToggleGroupProps,
    ref: React.ForwardedRef<ToggleGroupElement>
  ): React.JSX.Element => (
    <ToggleGroupPrimitive.Root
      ref={ref}
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn(
        "group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
);
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

export type ToggleGroupItemElement = React.ElementRef<
  typeof ToggleGroupPrimitive.Item
>;

export type ToggleGroupItemProps = React.ComponentPropsWithoutRef<
  typeof ToggleGroupPrimitive.Item
> &
  VariantProps<typeof toggleVariants>;

const ToggleGroupItem = React.forwardRef<
  ToggleGroupItemElement,
  ToggleGroupItemProps
>(
  (
    { className, children, variant, size, ...props }: ToggleGroupItemProps,
    ref: React.ForwardedRef<ToggleGroupItemElement>
  ): React.JSX.Element => {
    const context = React.useContext(ToggleGroupContext);

    return (
      <ToggleGroupPrimitive.Item
        ref={ref}
        data-slot="toggle-group-item"
        data-variant={context.variant || variant}
        data-size={context.size || size}
        className={cn(
          toggleVariants({
            variant: context.variant || variant,
            size: context.size || size,
          }),
          "min-w-0 flex-1 shrink-0 rounded-none shadow-none focus:z-10 focus-visible:z-10",
          "ltr:first:rounded-l-md ltr:last:rounded-r-md rtl:first:rounded-r-md rtl:last:rounded-l-md",
          "ltr:data-[variant=outline]:border-l-0 ltr:data-[variant=outline]:first:border-l",
          "rtl:data-[variant=outline]:border-r-0 rtl:data-[variant=outline]:first:border-r",
          className
        )}
        {...props}
      >
        {children}
      </ToggleGroupPrimitive.Item>
    );
  }
);
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };