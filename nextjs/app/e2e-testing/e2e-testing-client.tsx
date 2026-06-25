"use client";

import { type KeyboardEvent, useMemo, useState } from "react";
import { PlayIcon, StepForwardIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type {
  E2eRunStep,
  Profile,
  Scenario,
} from "@/lib/mock-testing-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function createQueuedSteps(scenarios: Scenario[]): E2eRunStep[] {
  return scenarios.map((scenario) => ({
    scenarioId: scenario.id,
    status: "queued",
    duration: "-",
    note: "Ready for selected run.",
  }));
}

function getInitialRunSteps(
  profileId: string | null,
  scenarios: Scenario[],
  profileRuns: Record<string, E2eRunStep[]>
) {
  if (!profileId) {
    return profileRuns["profile-001"] ?? createQueuedSteps(scenarios);
  }

  return profileRuns[profileId] ?? createQueuedSteps(scenarios);
}

export function E2eTestingClient({
  profiles,
  scenarios,
  profileRuns,
}: {
  profiles: Profile[];
  scenarios: Scenario[];
  profileRuns: Record<string, E2eRunStep[]>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedProfileId = searchParams.get("profile");
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>(
    scenarios.map((scenario) => scenario.id)
  );
  const [runSteps, setRunSteps] = useState<E2eRunStep[]>(() =>
    getInitialRunSteps(selectedProfileId, scenarios, profileRuns)
  );

  const selectedScenarios = useMemo(
    () => scenarios.filter((scenario) => selectedScenarioIds.includes(scenario.id)),
    [scenarios, selectedScenarioIds]
  );

  function openProfile(profileId: string) {
    router.push(`${pathname}?profile=${profileId}`);
    setRunSteps(getInitialRunSteps(profileId, scenarios, profileRuns));
  }

  function handleProfileKeyDown(
    event: KeyboardEvent<HTMLTableRowElement>,
    profileId: string
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openProfile(profileId);
  }

  function closeProfile() {
    router.push(pathname);
  }

  function toggleScenario(scenarioId: string) {
    setSelectedScenarioIds((current) =>
      current.includes(scenarioId)
        ? current.filter((id) => id !== scenarioId)
        : [...current, scenarioId]
    );
  }

  function runAutomated() {
    setRunSteps(
      selectedScenarios.map((scenario) => ({
        scenarioId: scenario.id,
        status: "success",
        duration: "52s",
        note: `${scenario.label} completed through automated mock execution.`,
      }))
    );
  }

  function runNextManualStep() {
    const completedIds = new Set(
      runSteps.filter((step) => step.status === "success").map((step) => step.scenarioId)
    );
    const nextScenario = selectedScenarios.find((scenario) => !completedIds.has(scenario.id));

    if (!nextScenario) return;

    setRunSteps((current) => {
      const existingByScenario = new Map(
        current.map((step) => [step.scenarioId, step])
      );

      existingByScenario.set(nextScenario.id, {
        scenarioId: nextScenario.id,
        status: "success",
        duration: "manual",
        note: `${nextScenario.label} marked complete by manual operator action.`,
      });

      return scenarios
        .filter((scenario) => existingByScenario.has(scenario.id))
        .map((scenario) => existingByScenario.get(scenario.id)!);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-normal">e2e Testing</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Select a profile, choose stages, and simulate automated or manual e2e
          scenario runs.
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profile</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Run</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow
                key={profile.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => openProfile(profile.id)}
                onKeyDown={(event) => handleProfileKeyDown(event, profile.id)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                </TableCell>
                <TableCell>{profile.program}</TableCell>
                <TableCell>{profile.cohort}</TableCell>
                <TableCell>
                  <Badge variant="outline">{profile.status}</Badge>
                </TableCell>
                <TableCell>{profile.lastRun}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={Boolean(selectedProfile)} onOpenChange={(open) => !open && closeProfile()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedProfile?.name ?? "Profile"}</SheetTitle>
          </SheetHeader>
          {selectedProfile ? (
            <div className="flex flex-col gap-4 px-4 pb-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Profile Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{selectedProfile.email}</p>
                  <p>
                    {selectedProfile.program} - {selectedProfile.cohort}
                  </p>
                  <p>Last run: {selectedProfile.lastRun}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Scenarios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {scenarios.map((scenario) => (
                    <label key={scenario.id} className="flex gap-3 rounded-md border p-3">
                      <Checkbox
                        checked={selectedScenarioIds.includes(scenario.id)}
                        onCheckedChange={() => toggleScenario(scenario.id)}
                      />
                      <span>
                        <span className="block text-sm font-medium">{scenario.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {scenario.description}
                        </span>
                      </span>
                    </label>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" onClick={runAutomated}>
                      <PlayIcon className="size-4" />
                      Run automated
                    </Button>
                    <Button type="button" variant="outline" onClick={runNextManualStep}>
                      <StepForwardIcon className="size-4" />
                      Run next manual stage
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Run Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {runSteps.map((step) => {
                    const scenario = scenarios.find((item) => item.id === step.scenarioId);
                    return (
                      <div key={step.scenarioId} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{scenario?.label}</p>
                          <Badge variant="outline">{step.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {step.duration} - {step.note}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
