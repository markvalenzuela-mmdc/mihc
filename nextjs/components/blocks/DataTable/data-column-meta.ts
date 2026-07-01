import { RowData } from "@tanstack/react-table";

type MobileAlign = "left" | "right";

interface MobileMeta {
  mobile?: {
    align: MobileAlign;
    hidden?: boolean;
  };
}

interface SortMeta {
  sort?: {
    enabled?: boolean;
    key?: string;
  };
}

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {}
  interface ColumnMeta<TData extends RowData, TValue>
    extends MobileMeta, SortMeta {}
}
