/**
 * Contract-driven driver for the live EnrollMate "Apply Now" wizard.
 *
 * The wizard is rendered from the same definition we own
 * (`@mihc/enrollmate-contract`), so we fill it generically off the flow
 * definition rather than hand-coding each field — one driver serves both the
 * `bachelors` and `microcredentials` flows.
 *
 * These functions never throw: each returns a `StepOutcome` so the spec can
 * record one human-readable check per step (pass/fail + message) into the
 * results reporter. Selectors/labels are best-effort against the live UAT DOM;
 * expect a couple of iterations here when running against the real form.
 */
import { join } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import type {
  EnrollmateField,
  EnrollmateFlowDefinition,
} from '@mihc/enrollmate-contract';

type FlowStep = EnrollmateFlowDefinition['steps'][number];

export type FormData = Record<string, unknown>;

export interface StepOutcome {
  ok: boolean;
  message?: string;
}

const FILES_DIR = join(
  process.cwd(),
  'tests',
  'e2e',
  'enrollmate',
  'fixtures',
  'files',
);

async function run(fn: () => Promise<void>): Promise<StepOutcome> {
  try {
    await fn();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: String(error).slice(0, 200) };
  }
}

/** A step carries form input when any of its sections declares fields. */
export function hasFields(step: FlowStep): boolean {
  return step.sections.some((section) => section.fields.length > 0);
}

/** We ship a single PDF sample; all document fields accept `.pdf`. */
function pickUploadFile(_field: EnrollmateField): string {
  return join(FILES_DIR, 'sample.pdf');
}

async function resolveLocator(
  page: Page,
  field: EnrollmateField,
): Promise<Locator> {
  const byName = page.locator(`[name="${field.name}"]`);
  if ((await byName.count()) > 0) return byName.first();

  // Attribute selector (not `#id`) so ids with spaces/slashes — as checkbox-group
  // fields have — don't break the CSS selector. File inputs are keyed by id.
  const byId = page.locator(`[id="${field.id}"]`);
  if ((await byId.count()) > 0) return byId.first();

  // Checkbox-group and unnamed (e.g. date) controls fall back to the a11y name.
  if (field.type === 'checkbox') {
    return page.getByRole('checkbox', { name: field.label, exact: false }).first();
  }
  return page.getByLabel(field.label, { exact: false }).first();
}

async function setSelectLike(
  page: Page,
  locator: Locator,
  value: string,
): Promise<void> {
  // Native <select> first — a plain string matches by option value OR label,
  // and the contract value equals the visible option text. Cascade options
  // (city/barangay) auto-populate after the parent select, so selectOption
  // retries until the option appears. Fall back to a custom listbox widget.
  try {
    await locator.selectOption(value);
    return;
  } catch {
    await locator.click();
    await page
      .getByRole('option', { name: value, exact: false })
      .first()
      .click();
  }
}

async function setField(
  page: Page,
  field: EnrollmateField,
  value: unknown,
): Promise<void> {
  // External async-search comboboxes (e.g. Last School Attended) are driven via
  // their "not found" checkbox + free-text companion field instead — there is
  // nothing to enter into the combobox itself.
  if (field.type === 'combobox' && field.optionSource?.kind === 'external') {
    return;
  }

  const locator = await resolveLocator(page, field);
  await locator.scrollIntoViewIfNeeded().catch(() => {});

  switch (field.type) {
    case 'checkbox':
      if (value === true) await locator.check();
      else await locator.uncheck();
      return;
    case 'file':
      await locator.setInputFiles(pickUploadFile(field));
      return;
    case 'select':
    case 'combobox':
      await setSelectLike(page, locator, String(value));
      return;
    default:
      await locator.fill(String(value));
  }
}

/** Fill every field of a step that has a value in the fixture payload. */
export async function fillStep(
  page: Page,
  step: FlowStep,
  data: FormData,
): Promise<StepOutcome> {
  for (const section of step.sections) {
    let groupHasSelection = false;

    for (const field of section.fields) {
      const value = data[field.name];
      if (value === undefined) continue;
      try {
        await setField(page, field, value);
        if (field.type === 'checkbox' && value === true) groupHasSelection = true;
      } catch (error) {
        return {
          ok: false,
          message: `field "${field.name}": ${String(error).slice(0, 160)}`,
        };
      }
    }

    // A required checkbox group needs at least one selection, but its individual
    // options aren't required — so the fixture leaves them all off. Tick the
    // first option to satisfy the group.
    if (section.type === 'checkboxGroup' && section.required && !groupHasSelection) {
      const first = section.fields[0];
      if (first) {
        try {
          await setField(page, first, true);
        } catch (error) {
          return {
            ok: false,
            message: `checkbox group "${section.label}": ${String(error).slice(0, 140)}`,
          };
        }
      }
    }
  }
  return { ok: true };
}

/** Advance to the next wizard step, verifying the form actually moved on. */
export async function advanceStep(page: Page): Promise<StepOutcome> {
  return run(async () => {
    await page.getByRole('button', { name: /next|continue/i }).first().click();
    // The form validates on Next: a missing/invalid field pops an "Oops!
    // Something's Missing" dialog and keeps you on the same step. Detect that so
    // we fail here with a clear message instead of flailing on the next step.
    await page.waitForTimeout(2000);
    const blocked = await page
      .getByText(/Something.?s Missing|Oops/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (blocked) {
      throw new Error('form did not advance — a required field is missing or invalid');
    }
    await page.waitForLoadState('networkidle').catch(() => {});
  });
}

/** Submit the completed application from the confirmation step. */
export async function submitForm(page: Page): Promise<StepOutcome> {
  return run(async () => {
    await page
      .getByRole('button', { name: /submit|finish|apply/i })
      .first()
      .click();
    await page.waitForLoadState('networkidle').catch(() => {});
  });
}

/** Wait for a post-submit success indicator. */
export async function confirmSubmission(page: Page): Promise<StepOutcome> {
  return run(async () => {
    await page
      .getByText(/thank you|submitted|received|success|confirmation/i)
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 });
  });
}
