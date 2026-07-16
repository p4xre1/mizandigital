"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "./utils";

/* ==========================================================================
   1. AVATAR ROOT COMPONENT (المكوّن الجذري للأفاتار)
   ========================================================================== */

/**
 * التحديد الصريح لنوع عنصر الـ DOM المرجعي للجذر
 */
export type AvatarElement = React.ElementRef<typeof AvatarPrimitive.Root>;

/**
 * الواجهة البرمجية الصريحة لخصائص مكوّن الأفاتار للجذر
 */
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
      "relative flex size-10 shrink-0 overflow-hidden rounded-full border border-border/80 bg-background select-none shadow-sm",
      className
    )}
    {...props}
  />
));

Avatar.displayName = AvatarPrimitive.Root.displayName ?? "Avatar";


/* ==========================================================================
   2. AVATAR IMAGE COMPONENT (مكوّن الصورة)
   ========================================================================== */

/**
 * التحديد الصريح لنوع عنصر الـ DOM المرجعي للصورة
 */
export type AvatarImageElement = React.ElementRef<typeof AvatarPrimitive.Image>;

/**
 * الواجهة البرمجية الصريحة لخصائص مكوّن الصورة
 */
export interface AvatarImageProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {}

const AvatarImage = React.forwardRef<AvatarImageElement, AvatarImageProps>((
  { className, ...props }: AvatarImageProps,
  ref: React.ForwardedRef<AvatarImageElement>
): React.JSX.Element => (
  <AvatarPrimitive.Image
    ref={ref}
    data-slot="avatar-image"
    className={cn(
      "aspect-square size-full object-cover opacity-0 data-[state=loaded]:opacity-100 transition-opacity duration-300",
      className
    )}
    {...props}
  />
));

AvatarImage.displayName = AvatarPrimitive.Image.displayName ?? "AvatarImage";


/* ==========================================================================
   3. AVATAR FALLBACK COMPONENT (مكوّن الاحتياط البصري)
   ========================================================================== */

/**
 * التحديد الصريح لنوع عنصر الـ DOM المرجعي للحاوية الاحتياطية
 */
export type AvatarFallbackElement = React.ElementRef<typeof AvatarPrimitive.Fallback>;

/**
 * الواجهة البرمجية الصريحة لخصائص مكوّن الاحتياط البصري
 */
export interface AvatarFallbackProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {}

const AvatarFallback = React.forwardRef<AvatarFallbackElement, AvatarFallbackProps>((
  { className, children, ...props }: AvatarFallbackProps,
  ref: React.ForwardedRef<AvatarFallbackElement>
): React.JSX.Element => (
  <AvatarPrimitive.Fallback
    ref={ref}
    data-slot="avatar-fallback"
    className={cn(
      "bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wider select-none",
      className
    )}
    {...props}
  >
    {children ?? (
      <svg
        className="size-1/2 text-muted-foreground/60 transition-transform duration-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    )}
  </AvatarPrimitive.Fallback>
));

AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName ?? "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };