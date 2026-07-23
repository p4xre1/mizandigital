"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type TableElement = HTMLTableElement;
export interface TableProps extends React.ComponentPropsWithoutRef<"table"> {}

const Table = React.forwardRef<TableElement, TableProps>(
  (
    { className, ...props }: TableProps,
    ref: React.ForwardedRef<TableElement>
  ): React.JSX.Element => (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        ref={ref}
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

export type TableHeaderElement = HTMLTableSectionElement;
export interface TableHeaderProps
  extends React.ComponentPropsWithoutRef<"thead"> {}

const TableHeader = React.forwardRef<TableHeaderElement, TableHeaderProps>(
  (
    { className, ...props }: TableHeaderProps,
    ref: React.ForwardedRef<TableHeaderElement>
  ): React.JSX.Element => (
    <thead
      ref={ref}
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
);
TableHeader.displayName = "TableHeader";

export type TableBodyElement = HTMLTableSectionElement;
export interface TableBodyProps
  extends React.ComponentPropsWithoutRef<"tbody"> {}

const TableBody = React.forwardRef<TableBodyElement, TableBodyProps>(
  (
    { className, ...props }: TableBodyProps,
    ref: React.ForwardedRef<TableBodyElement>
  ): React.JSX.Element => (
    <tbody
      ref={ref}
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
);
TableBody.displayName = "TableBody";

export type TableFooterElement = HTMLTableSectionElement;
export interface TableFooterProps
  extends React.ComponentPropsWithoutRef<"tfoot"> {}

const TableFooter = React.forwardRef<TableFooterElement, TableFooterProps>(
  (
    { className, ...props }: TableFooterProps,
    ref: React.ForwardedRef<TableFooterElement>
  ): React.JSX.Element => (
    <tfoot
      ref={ref}
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
);
TableFooter.displayName = "TableFooter";

export type TableRowElement = HTMLTableRowElement;
export interface TableRowProps extends React.ComponentPropsWithoutRef<"tr"> {}

const TableRow = React.forwardRef<TableRowElement, TableRowProps>(
  (
    { className, ...props }: TableRowProps,
    ref: React.ForwardedRef<TableRowElement>
  ): React.JSX.Element => (
    <tr
      ref={ref}
      data-slot="table-row"
      className={cn(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

export type TableHeadElement = HTMLTableCellElement;
export interface TableHeadProps extends React.ComponentPropsWithoutRef<"th"> {}

const TableHead = React.forwardRef<TableHeadElement, TableHeadProps>(
  (
    { className, ...props }: TableHeadProps,
    ref: React.ForwardedRef<TableHeadElement>
  ): React.JSX.Element => (
    <th
      ref={ref}
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 ltr:text-left rtl:text-right align-middle font-medium whitespace-nowrap ltr:[&:has([role=checkbox])]:pr-0 rtl:[&:has([role=checkbox])]:pl-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

export type TableCellElement = HTMLTableCellElement;
export interface TableCellProps
  extends React.ComponentPropsWithoutRef<"td"> {}

const TableCell = React.forwardRef<TableCellElement, TableCellProps>(
  (
    { className, ...props }: TableCellProps,
    ref: React.ForwardedRef<TableCellElement>
  ): React.JSX.Element => (
    <td
      ref={ref}
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap ltr:[&:has([role=checkbox])]:pr-0 rtl:[&:has([role=checkbox])]:pl-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
);
TableCell.displayName = "TableCell";

export type TableCaptionElement = HTMLTableCaptionElement;
export interface TableCaptionProps
  extends React.ComponentPropsWithoutRef<"caption"> {}

const TableCaption = React.forwardRef<TableCaptionElement, TableCaptionProps>(
  (
    { className, ...props }: TableCaptionProps,
    ref: React.ForwardedRef<TableCaptionElement>
  ): React.JSX.Element => (
    <caption
      ref={ref}
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
);
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};