import * as React from "react";

import { cn } from "@/lib/utils";

/* ==========================================================================
   CARD COMPONENTS (حاويات الكروت والهياكل الفرعية)
   ========================================================================== */

export type CardElement = React.ElementRef<"div">;
export interface CardProps extends React.ComponentPropsWithoutRef<"div"> {}

const Card = React.forwardRef<CardElement, CardProps>(
  ({ className, ...props }: CardProps, ref: React.ForwardedRef<CardElement>): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";


export type CardHeaderElement = React.ElementRef<"div">;
export interface CardHeaderProps extends React.ComponentPropsWithoutRef<"div"> {}

const CardHeader = React.forwardRef<CardHeaderElement, CardHeaderProps>(
  ({ className, ...props }: CardHeaderProps, ref: React.ForwardedRef<CardHeaderElement>): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";


export type CardTitleElement = React.ElementRef<"h4">;
export interface CardTitleProps extends React.ComponentPropsWithoutRef<"h4"> {}

const CardTitle = React.forwardRef<CardTitleElement, CardTitleProps>(
  ({ className, ...props }: CardTitleProps, ref: React.ForwardedRef<CardTitleElement>): React.JSX.Element => (
    <h4
      ref={ref}
      data-slot="card-title"
      className={cn("leading-none", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";


export type CardDescriptionElement = React.ElementRef<"p">;
export interface CardDescriptionProps extends React.ComponentPropsWithoutRef<"p"> {}

const CardDescription = React.forwardRef<CardDescriptionElement, CardDescriptionProps>(
  ({ className, ...props }: CardDescriptionProps, ref: React.ForwardedRef<CardDescriptionElement>): React.JSX.Element => (
    <p
      ref={ref}
      data-slot="card-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";


export type CardActionElement = React.ElementRef<"div">;
export interface CardActionProps extends React.ComponentPropsWithoutRef<"div"> {}

const CardAction = React.forwardRef<CardActionElement, CardActionProps>(
  ({ className, ...props }: CardActionProps, ref: React.ForwardedRef<CardActionElement>): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
);
CardAction.displayName = "CardAction";


export type CardContentElement = React.ElementRef<"div">;
export interface CardContentProps extends React.ComponentPropsWithoutRef<"div"> {}

const CardContent = React.forwardRef<CardContentElement, CardContentProps>(
  ({ className, ...props }: CardContentProps, ref: React.ForwardedRef<CardContentElement>): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";


export type CardFooterElement = React.ElementRef<"div">;
export interface CardFooterProps extends React.ComponentPropsWithoutRef<"div"> {}

const CardFooter = React.forwardRef<CardFooterElement, CardFooterProps>(
  ({ className, ...props }: CardFooterProps, ref: React.ForwardedRef<CardFooterElement>): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};