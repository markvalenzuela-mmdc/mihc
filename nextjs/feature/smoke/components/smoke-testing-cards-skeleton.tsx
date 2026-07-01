import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const skeletonCards = [1, 2, 3, 4];
const recentRunBars = [1, 2, 3, 4, 5];

export function SmokeTestingCardsSkeleton() {
  return (
    <section
      aria-label="Loading monitored applications"
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
    >
      {skeletonCards.map((card) => (
        <Card key={card} className="h-full bg-card/70">
          <CardHeader className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-5 w-32 max-w-[65%]" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="min-h-8 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-36 max-w-full" />
              </div>
              <Skeleton className="size-4 rounded-full" />
            </div>
            <div
              className="flex gap-1"
              aria-label="Loading recent run statuses"
            >
              {recentRunBars.map((bar) => (
                <Skeleton key={bar} className="h-1.5 flex-1 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-3 w-40 max-w-full" />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
