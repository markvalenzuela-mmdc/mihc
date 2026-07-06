"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  AlertCircleIcon,
  RefreshCcwIcon,
  SettingsIcon,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MainShell } from "@/components/main-shell";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface TestingRouteErrorStateProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
  title: string;
  subtitle: string;
  dataSourceLabel: string;
}

export function TestingRouteErrorState({
  error,
  unstable_retry,
  title,
  subtitle,
  dataSourceLabel,
}: TestingRouteErrorStateProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell>
      <MainShell title={title} subtitle={subtitle}>
        <Empty className="min-h-96 border bg-card/40">
          <EmptyMedia variant="icon" className="bg-destructive/10">
            <AlertCircleIcon className="size-6 text-destructive" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{dataSourceLabel} data is unavailable</EmptyTitle>
            <EmptyDescription>
              The database-backed data source did not respond. Try again after
              the connection recovers, or review the current runtime mode in
              settings.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-col justify-center sm:flex-row">
            <Button type="button" onClick={() => unstable_retry()}>
              <RefreshCcwIcon />
              Try again
            </Button>
            <Button
              type="button"
              variant="outline"
              render={<Link href="/settings" />}
            >
              <SettingsIcon />
              Settings
            </Button>
          </EmptyContent>
        </Empty>
      </MainShell>
    </AppShell>
  );
}
