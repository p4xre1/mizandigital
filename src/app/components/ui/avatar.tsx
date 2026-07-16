"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "./utils";

/* ==========================================================================
   1. AVATAR ROOT COMPONENT (الحاوية الهيكلية المستديرة)
   ========================================================================== */

export type AvatarElement = React.ElementRef<typeof AvatarPrimitive.Root>;
export interface AvatarProps 
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {}

const Avatar = React.forwardRef<AvatarElement, AvatarProps>((
  { className, ...props }: AvatarProps,
  ref: React.ForwardedRef<AvatarElement>
): React.JSX.Element => (
  <AvatarPrimitive.Root
    ref={ref}
    data-slot="avatar"
    className={cn(
      "relative flex size-10 shrink-0 overflow-hidden rounded-full bg-muted select-none items-center justify-center border border-border/40",
      className
    )}
    {...props}
  />
));
Avatar.displayName = "Avatar";


/* ==========================================================================
   2. AVATAR IMAGE COMPONENT (حاوية عرض الصورة السلسة)
   ========================================================================== */

export type AvatarImageElement = React.ElementRef<typeof AvatarPrimitive.Image>;
export interface AvatarImageProps 
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {}

const AvatarImage = React.forwardRef<AvatarImageElement, AvatarImageProps>((
  { className, ...props }: AvatarImageProps,
  ref: React.ForwardedRef<AvatarImageElement>
): React.JSX.Element => (
  <AvatarPrimitive.Image
    ref={ref}
    data-slot="avatar-image"
    // duration-300 تضمن تلاشي مرئي ناعم فور انتهاء خادم ميزان من جلب الصورة
    className={cn("aspect-square h-full w-full object-cover transition-opacity duration-300 ease-in-out", className)}
    {...props}
  />
));
AvatarImage.displayName = "AvatarImage";


/* ==========================================================================
   3. AVATAR FALLBACK COMPONENT (النص البديل المعزز هرمياً)
   ========================================================================== */

export type AvatarFallbackElement = React.ElementRef<typeof AvatarPrimitive.Fallback>;
export interface AvatarFallbackProps 
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {}

const AvatarFallback = React.forwardRef<AvatarFallbackElement, AvatarFallbackProps>((
  { className, ...props }: AvatarFallbackProps,
  ref: React.ForwardedRef<AvatarFallbackElement>
): React.JSX.Element => (
  <AvatarPrimitive.Fallback
    ref={ref}
    data-slot="avatar-fallback"
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-xs uppercase tracking-wider",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };