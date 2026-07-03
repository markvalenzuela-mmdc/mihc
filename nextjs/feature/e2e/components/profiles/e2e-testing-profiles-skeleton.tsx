import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const skeletonRows = [1, 2, 3, 4, 5];

export function E2eTestingProfilesSkeleton() {
  return (
    <section className="space-y-3" aria-label="Loading test profiles">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Card className="overflow-hidden">
        <div className="space-y-0 divide-y">
          {skeletonRows.map((row) => (
            <div
              key={row}
              className="grid gap-4 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_2rem]"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="size-4 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
