import { ReactNode, Suspense } from "react";

interface SuspenserProps<T> {
  promise: Promise<T>;
  fallback: ReactNode;
  children: (data: T) => ReactNode;
}

export default async function Suspenser<T>({
  promise,
  fallback,
  children,
}: SuspenserProps<T>) {
  return (
    <Suspense fallback={fallback}>
      <DataLoader promise={promise} children={children} />
    </Suspense>
  );
}

interface DataLoaderProps<T> {
  promise: Promise<T>;
  children: (data: T) => ReactNode;
}

async function DataLoader<T>({ promise, children }: DataLoaderProps<T>) {
  const data = await promise;

  return children(data);
}
