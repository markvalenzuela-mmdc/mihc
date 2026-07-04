import { Skeleton } from "@/components/ui/skeleton";

const stepRows = [1, 2, 3, 4];

export default function E2eProfileWorkspaceSheetSkeleton() {
  return (
    <>
      <div className="space-y-3 border-b pb-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="space-y-7 px-4 pb-6">
        <section className="space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-36" />
          </div>
          <div className="space-y-2">
            {stepRows.map((row) => (
              <Skeleton key={row} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
