import { CSSProperties } from "react";

interface ClassNameProp {
  className?: string;
}

interface ClassNamesProp<T> {
  classNames?: Partial<T>;
}

interface ClassProps<T> extends ClassNameProp, ClassNamesProp<T> {}

interface StyleProp {
  style?: CSSProperties;
}

interface StylesProp<T> {
  styles?: Partial<T>;
}

interface StyleProps<T> extends StyleProp, StylesProp<T> {}

export type {
  ClassNameProp,
  ClassNamesProp,
  ClassProps,
  StyleProp,
  StylesProp,
  StyleProps,
};
