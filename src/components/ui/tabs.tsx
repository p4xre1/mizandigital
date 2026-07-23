"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "../../lib/utils";

export type TabsElement = React.ElementRef<typeof TabsPrimitive.Root>;
export type TabsProps = React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Root
>;

const Tabs = React.forwardRef<TabsElement, TabsProps>(
  (
    { className, ...props }: TabsProps,
    ref: React.ForwardedRef<TabsElement>
  ): React.JSX.Element => (
    <TabsPrimitive.Root
      ref={ref}
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
);
Tabs.displayName = TabsPrimitive.Root.displayName;

export type TabsListElement = React.ElementRef<typeof TabsPrimitive.List>;
export type TabsListProps = React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.List
>;

const TabsList = React.forwardRef<TabsListElement, TabsListProps>(
  (
    { className, ...props }: TabsListProps,
    ref: React.ForwardedRef<TabsListElement>
  ): React.JSX.Element => (
    <TabsPrimitive.List
      ref={ref}
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px]",
        className
      )}
      {...props}
    />
  )
);
TabsList.displayName = TabsPrimitive.List.displayName;

export type TabsTriggerElement = React.ElementRef<
  typeof TabsPrimitive.Trigger
>;
export type TabsTriggerProps = React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Trigger
>;

const TabsTrigger = React.forwardRef<TabsTriggerElement, TabsTriggerProps>(
  (
    { className, ...props }: TabsTriggerProps,
    ref: React.ForwardedRef<TabsTriggerElement>
  ): React.JSX.Element => (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-card dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export type TabsContentElement = React.ElementRef<
  typeof TabsPrimitive.Content
>;
export type TabsContentProps = React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Content
>;

const TabsContent = React.forwardRef<TabsContentElement, TabsContentProps>(
  (
    { className, ...props }: TabsContentProps,
    ref: React.ForwardedRef<TabsContentElement>
  ): React.JSX.Element => (
    <TabsPrimitive.Content
      ref={ref}
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };