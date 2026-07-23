"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "../../lib/utils";
import { Label } from "./label";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>): React.JSX.Element => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
);

export type FormItemElement = HTMLDivElement;
export interface FormItemProps extends React.ComponentPropsWithoutRef<"div"> {}

const FormItem = React.forwardRef<FormItemElement, FormItemProps>(
  (
    { className, ...props }: FormItemProps,
    ref: React.ForwardedRef<FormItemElement>
  ): React.JSX.Element => {
    const id = React.useId();

    return (
      <FormItemContext.Provider value={{ id }}>
        <div
          ref={ref}
          data-slot="form-item"
          className={cn("grid gap-2", className)}
          {...props}
        />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = "FormItem";

export type FormLabelElement = React.ElementRef<typeof LabelPrimitive.Root>;
export interface FormLabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {}

const FormLabel = React.forwardRef<FormLabelElement, FormLabelProps>(
  (
    { className, ...props }: FormLabelProps,
    ref: React.ForwardedRef<FormLabelElement>
  ): React.JSX.Element => {
    const { error, formItemId } = useFormField();

    return (
      <Label
        ref={ref}
        data-slot="form-label"
        data-error={!!error}
        className={cn("data-[error=true]:text-destructive", className)}
        htmlFor={formItemId}
        {...props}
      />
    );
  }
);
FormLabel.displayName = "FormLabel";

export type FormControlElement = React.ElementRef<typeof Slot>;
export interface FormControlProps
  extends React.ComponentPropsWithoutRef<typeof Slot> {}

const FormControl = React.forwardRef<FormControlElement, FormControlProps>(
  (
    { ...props }: FormControlProps,
    ref: React.ForwardedRef<FormControlElement>
  ): React.JSX.Element => {
    const { error, formItemId, formDescriptionId, formMessageId } =
      useFormField();

    return (
      <Slot
        ref={ref}
        data-slot="form-control"
        id={formItemId}
        aria-describedby={
          !error
            ? `${formDescriptionId}`
            : `${formDescriptionId} ${formMessageId}`
        }
        aria-invalid={!!error}
        {...props}
      />
    );
  }
);
FormControl.displayName = "FormControl";

export type FormDescriptionElement = HTMLParagraphElement;
export interface FormDescriptionProps
  extends React.ComponentPropsWithoutRef<"p"> {}

const FormDescription = React.forwardRef<
  FormDescriptionElement,
  FormDescriptionProps
>(
  (
    { className, ...props }: FormDescriptionProps,
    ref: React.ForwardedRef<FormDescriptionElement>
  ): React.JSX.Element => {
    const { formDescriptionId } = useFormField();

    return (
      <p
        ref={ref}
        data-slot="form-description"
        id={formDescriptionId}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
      />
    );
  }
);
FormDescription.displayName = "FormDescription";

export type FormMessageElement = HTMLParagraphElement;
export interface FormMessageProps
  extends React.ComponentPropsWithoutRef<"p"> {}

const FormMessage = React.forwardRef<FormMessageElement, FormMessageProps>(
  (
    { className, children, ...props }: FormMessageProps,
    ref: React.ForwardedRef<FormMessageElement>
  ): React.JSX.Element | null => {
    const { error, formMessageId } = useFormField();
    const body = error ? String(error?.message ?? "") : children;

    if (!body) {
      return null;
    }

    return (
      <p
        ref={ref}
        data-slot="form-message"
        id={formMessageId}
        className={cn("text-sm text-destructive font-medium", className)}
        {...props}
      >
        {body}
      </p>
    );
  }
);
FormMessage.displayName = "FormMessage";

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};