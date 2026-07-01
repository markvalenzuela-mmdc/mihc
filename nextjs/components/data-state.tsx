import { AlertCircle, FileX2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface DataStateProps<T> {
  data?: T[];
  isLoading?: boolean;
  error?: Error | string | null;
  loadingFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  children: (data: T[]) => React.ReactNode;
}

export function DataState<T>({
  data,
  isLoading,
  error,
  loadingFallback = <LoadingState />,
  emptyFallback = <EmptyState />,
  errorFallback,
  children,
}: DataStateProps<T>) {
  if (isLoading) return <>{loadingFallback}</>;

  if (error) {
    return <>{errorFallback ?? <ErrorState error={error} />}</>;
  }

  if (!data || data.length === 0) return <>{emptyFallback}</>;

  return <>{children(data)}</>;
}

function LoadingState() {
  return (
    <div className="flex h-40 w-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-background p-8 text-center animate-in fade-in-50">
      <Spinner className="size-8 text-primary" />
      <p className="text-sm text-muted-foreground">Loading data...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <Empty className="h-40 border-dashed">
      <EmptyMedia variant="icon" className="mx-auto">
        <FileX2 className="size-6 text-muted-foreground" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>
          Try adjusting your filters or search query.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function ErrorState({ error }: { error: Error | string | null }) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-destructive/50 bg-destructive/5 p-8 text-destructive animate-in fade-in-50">
      <div className="rounded-full bg-destructive/10 p-3">
        <AlertCircle className="size-6" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">Something went wrong</p>
        <p className="text-xs opacity-90 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
