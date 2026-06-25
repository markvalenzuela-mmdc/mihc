import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Minimal frontend-only settings for the testing dashboard mock.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Runtime Defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <p className="font-medium">Environment</p>
                <p className="text-muted-foreground">Staging</p>
              </div>
              <Badge variant="outline">mock</Badge>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <p className="font-medium">Default runner mode</p>
                <p className="text-muted-foreground">Automated runs first</p>
              </div>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <p className="font-medium">Integrations</p>
                <p className="text-muted-foreground">
                  Frontend-only mock, no backend connected.
                </p>
              </div>
              <Badge variant="secondary">offline</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
