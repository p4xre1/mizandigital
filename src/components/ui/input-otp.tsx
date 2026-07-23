"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";

import { cn } from "../../lib/utils";

export type InputOTPElement = React.ElementRef<typeof OTPInput>;
export type InputOTPProps = React.ComponentPropsWithoutRef<typeof OTPInput> & {
  containerClassName?: string;
};

const InputOTP = React.forwardRef<InputOTPElement, InputOTPProps>(
  (
    { className, containerClassName, ...props }: InputOTPProps,
    ref: React.ForwardedRef<InputOTPElement>
  ): React.JSX.Element => (
    <OTPInput
      ref={ref}
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
);
InputOTP.displayName = "InputOTP";

export type InputOTPGroupElement = HTMLDivElement;
export interface InputOTPGroupProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const InputOTPGroup = React.forwardRef<
  InputOTPGroupElement,
  InputOTPGroupProps
>(
  (
    { className, ...props }: InputOTPGroupProps,
    ref: React.ForwardedRef<InputOTPGroupElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="input-otp-group"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
);
InputOTPGroup.displayName = "InputOTPGroup";

export type InputOTPSlotElement = HTMLDivElement;
export interface InputOTPSlotProps
  extends React.ComponentPropsWithoutRef<"div"> {
  index: number;
}

const InputOTPSlot = React.forwardRef<
  InputOTPSlotElement,
  InputOTPSlotProps
>(
  (
    { index, className, ...props }: InputOTPSlotProps,
    ref: React.ForwardedRef<InputOTPSlotElement>
  ): React.JSX.Element => {
    const inputOTPContext = React.useContext(OTPInputContext);
    const { char, hasFakeCaret, isActive } =
      inputOTPContext?.slots[index] ?? {};

    return (
      <div
        ref={ref}
        data-slot="input-otp-slot"
        data-active={isActive}
        className={cn(
          "data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex h-9 w-9 items-center justify-center border-y border-r text-sm bg-input-background transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]",
          className
        )}
        {...props}
      >
        {char}
        {hasFakeCaret && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
          </div>
        )}
      </div>
    );
  }
);
InputOTPSlot.displayName = "InputOTPSlot";

export type InputOTPSeparatorElement = HTMLDivElement;
export interface InputOTPSeparatorProps
  extends React.ComponentPropsWithoutRef<"div"> {}

const InputOTPSeparator = React.forwardRef<
  InputOTPSeparatorElement,
  InputOTPSeparatorProps
>(
  (
    { className, ...props }: InputOTPSeparatorProps,
    ref: React.ForwardedRef<InputOTPSeparatorElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="input-otp-separator"
      role="separator"
      className={cn("text-muted-foreground", className)}
      {...props}
    >
      <MinusIcon className="h-4 w-4" />
    </div>
  )
);
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };