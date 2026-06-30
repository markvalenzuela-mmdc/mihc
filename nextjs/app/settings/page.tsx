import { AppShell } from "@/components/app-shell";
import { DatabaseZapIcon, ShieldCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Runtime context for this frontend-only dashboard phase.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Frontend data mode</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div className="flex items-start gap-3">
                <DatabaseZapIcon className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Schema-aligned fixtures</p>
                  <p className="text-muted-foreground">Local records mirror the planned frontend query shape.</p>
                </div>
              </div>
              <Badge variant="secondary">active</Badge>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Backend integration</p>
                  <p className="text-muted-foreground">Server actions, authentication, persistence, and network states are pending.</p>
                </div>
              </div>
              <Badge variant="outline">not connected</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
