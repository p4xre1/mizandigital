import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "../../lib/utils";

export type BreadcrumbElement = React.ElementRef<"nav">;
export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {}

const Breadcrumb = React.forwardRef<BreadcrumbElement, BreadcrumbProps>((
  { ...props }: BreadcrumbProps,
  ref: React.ForwardedRef<BreadcrumbElement>
): React.JSX.Element => (
  <nav ref={ref} aria-label="breadcrumb" data-slot="breadcrumb" {...props} />
));
Breadcrumb.displayName = "Breadcrumb";

export type BreadcrumbListElement = React.ElementRef<"ol">;
export interface BreadcrumbListProps extends React.ComponentPropsWithoutRef<"ol"> {}

const BreadcrumbList = React.forwardRef<BreadcrumbListElement, BreadcrumbListProps>((
  { className, ...props }: BreadcrumbListProps,
  ref: React.ForwardedRef<BreadcrumbListElement>
): React.JSX.Element => (
  <ol
    ref={ref}
    data-slot="breadcrumb-list"
    className={cn(
      "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
      className
    )}
    {...props}
  />
));
BreadcrumbList.displayName = "BreadcrumbList";

export type BreadcrumbItemElement = React.ElementRef<"li">;
export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<"li"> {}

const BreadcrumbItem = React.forwardRef<BreadcrumbItemElement, BreadcrumbItemProps>((
  { className, ...props }: BreadcrumbItemProps,
  ref: React.ForwardedRef<BreadcrumbItemElement>
): React.JSX.Element => (
  <li
    ref={ref}
    data-slot="breadcrumb-item"
    className={cn("inline-flex items-center gap-1.5", className)}
    {...props}
  />
));
BreadcrumbItem.displayName = "BreadcrumbItem";

export type BreadcrumbLinkElement = React.ElementRef<"a">;
export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  asChild?: boolean;
}

const BreadcrumbLink = React.forwardRef<BreadcrumbLinkElement, BreadcrumbLinkProps>((
  { asChild = false, className, ...props }: BreadcrumbLinkProps,
  ref: React.ForwardedRef<BreadcrumbLinkElement>
): React.JSX.Element => {
  const Comp: React.ElementType = asChild ? Slot : "a";

  return (
    <Comp
      ref={ref}
      data-slot="breadcrumb-link"
      className={cn("hover:text-foreground transition-colors duration-200", className)}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

export type BreadcrumbPageElement = React.ElementRef<"span">;
export interface BreadcrumbPageProps extends React.ComponentPropsWithoutRef<"span"> {}

const BreadcrumbPage = React.forwardRef<BreadcrumbPageElement, BreadcrumbPageProps>((
  { className, ...props }: BreadcrumbPageProps,
  ref: React.ForwardedRef<BreadcrumbPageElement>
): React.JSX.Element => (
  <span
    ref={ref}
    data-slot="breadcrumb-page"
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn("text-foreground font-normal select-none", className)}
    {...props}
  />
));
BreadcrumbPage.displayName = "BreadcrumbPage";

export type BreadcrumbSeparatorElement = React.ElementRef<"li">;
export interface BreadcrumbSeparatorProps extends React.ComponentPropsWithoutRef<"li"> {}

const BreadcrumbSeparator = React.forwardRef<BreadcrumbSeparatorElement, BreadcrumbSeparatorProps>((
  { children, className, ...props }: BreadcrumbSeparatorProps,
  ref: React.ForwardedRef<BreadcrumbSeparatorElement>
): React.JSX.Element => (
  <li
    ref={ref}
    data-slot="breadcrumb-separator"
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:size-3.5 [&>svg]:rtl:rotate-180 transition-transform duration-200", className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
));
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

export type BreadcrumbEllipsisElement = React.ElementRef<"span">;
export interface BreadcrumbEllipsisProps extends React.ComponentPropsWithoutRef<"span"> {}

const BreadcrumbEllipsis = React.forwardRef<BreadcrumbEllipsisElement, BreadcrumbEllipsisProps>((
  { className, ...props }: BreadcrumbEllipsisProps,
  ref: React.ForwardedRef<BreadcrumbEllipsisElement>
): React.JSX.Element => (
  <span
    ref={ref}
    data-slot="breadcrumb-ellipsis"
    role="presentation"
    aria-hidden="true"
    className={cn("flex size-9 items-center justify-center select-none", className)}
    {...props}
  >
    <MoreHorizontal className="size-4" />
    <span className="sr-only">More</span>
  </span>
));
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};