"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps as SonnerToasterProps } from "sonner";

export type ToasterElement = React.ElementRef<typeof Sonner>;
export type ToasterProps = SonnerToasterProps;

const Toaster = React.forwardRef<ToasterElement, ToasterProps>(
  (
    { ...props }: ToasterProps,
    ref: React.ForwardedRef<ToasterElement>
  ): React.JSX.Element => {
    const { theme = "system" } = useTheme();

    return (
      <Sonner
        ref={ref}
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg ltr:text-left rtl:text-right",
            description: "group-[.toast]:text-muted-foreground",
            actionButton:
              "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium",
            cancelButton:
              "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-medium",
          },
        }}
        style={
          {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
          } as React.CSSProperties
        }
        {...props}
      />
    );
  }
);
Toaster.displayName = "Toaster";

export { Toaster };