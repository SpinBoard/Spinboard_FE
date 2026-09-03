"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import "./freebiz-primitives.css";

// design/freebiz-mockup.html's table/th/td rules are bare element
// selectors (safe there — it's a single static prototype page). Scoped
// here under .fb-table instead, since this stylesheet loads into a real
// app where an unscoped `table{}`/`th{}`/`td{}` rule would restyle any
// unrelated table on any screen that happens to import one of these
// components.
export const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => <table ref={ref} className={cn("fb-table", className)} {...props} />
);
Table.displayName = "Table";

export const TableHead = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>((props, ref) => <thead ref={ref} {...props} />);
TableHead.displayName = "TableHead";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>((props, ref) => <tbody ref={ref} {...props} />);
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  (props, ref) => <tr ref={ref} {...props} />
);
TableRow.displayName = "TableRow";

export const TableHeadCell = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>((props, ref) => <th ref={ref} {...props} />);
TableHeadCell.displayName = "TableHeadCell";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>((props, ref) => <td ref={ref} {...props} />);
TableCell.displayName = "TableCell";
