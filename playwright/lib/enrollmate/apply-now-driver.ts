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
    return { ok: false, message: String(error) };
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

/**
 * Drive an async-search combobox (e.g. Last School Attended) by typing the
 * target value and selecting it from the API-populated dropdown. If the value
 * isn't found (API slow, school unknown, etc.) the function returns without
 * throwing so the companion "not found" checkbox + free-text fallback fields
 * can handle the input.
 */
async function setAsyncCombobox(
  page: Page,
  field: EnrollmateField,
  value: string,
): Promise<void> {
  const locator = await resolveLocator(page, field);
  await locator.scrollIntoViewIfNeeded().catch(() => {});

  await locator.click();
  // The UAT combobox is an <input type="text" role="combobox">; filling it
  // triggers an XHR that populates a [role="listbox"] dropdown.
  await locator.fill(value);

  // Wait for the typeahead dropdown to appear (API round-trip).
  const listbox = page.getByRole('listbox');
  await listbox.waitFor({ state: 'visible', timeout: 10_000 });

  // Click the matching option.
  const option = page.getByRole('option', { name: value, exact: false });
  await option.first().click();

  // Wait for the dropdown to close.
  await listbox.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
}

async function setField(
  page: Page,
  field: EnrollmateField,
  value: unknown,
): Promise<void> {
  // Async-search comboboxes (e.g. Last School Attended) are typeahead inputs
  // driven by an API. Try the typeahead first; if the value isn't found in the
  // API, fall back silently so the companion "not found" checkbox + free-text
  // field (processed separately in fillStep) can handle the input.
  if (field.type === 'combobox' && field.optionSource?.kind !== 'inline') {
    try {
      await setAsyncCombobox(page, field, String(value));
    } catch {
      // Not found — the fallback fields (schoolNotFound + lastschOther) will
      // be processed when fillStep reaches them in the same section.
    }
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

      if (field.conditionalOn) {
        const conditionValue = data[field.conditionalOn.field];
        if (
          typeof conditionValue !== 'string' &&
          typeof conditionValue !== 'boolean'
        ) {
          continue;
        }
        if (!field.conditionalOn.equalsAny.includes(conditionValue)) {
          continue;
        }
      }

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

/** Attempt to extract the names of fields that failed validation. */
async function extractValidationErrors(page: Page): Promise<string | null> {
  try {
    // Strategy 1: aria-invalid on inputs (standard ARIA pattern)
    const invalidFields = page.locator('[aria-invalid="true"]');
    const ariaCount = await invalidFields.count();
    if (ariaCount > 0) {
      const entries: string[] = [];
      for (let i = 0; i < ariaCount; i++) {
        const field = invalidFields.nth(i);
        const tag = await field.evaluate((el) => el.tagName.toLowerCase()).catch(() => null);
        if (!tag || !['input', 'select', 'textarea'].includes(tag)) continue;
        const fieldName = await resolveFieldName(field);
        const errorMsg = await resolveFieldError(field);
        const entry = errorMsg ? `${fieldName}: ${errorMsg}` : fieldName;
        entries.push(entry);
      }
      if (entries.length > 0) return entries.join('; ');
    }

    // Strategy 2: error-text elements with a known class (UAT: text-mapua-red-400)
    // Each error element is a sibling of its associated input inside a shared
    // container (col-span-12 sm:col-span-3).
    const errorElements = page.locator('.text-mapua-red-400');
    const errorCount = await errorElements.count();
    if (errorCount > 0) {
      const entries: string[] = [];
      for (let i = 0; i < errorCount; i++) {
        const err = errorElements.nth(i);
        const result = await err.evaluate((el) => {
          const container = el.parentElement?.parentElement;
          if (!container) return null;
          const input = container.querySelector('input, select, textarea');
          const name = input?.getAttribute('name') ?? input?.getAttribute('aria-label') ?? null;
          const msg = el.textContent?.trim();
          if (!name || !msg) return null;
          return { name, msg };
        }).catch(() => null);
        if (result) entries.push(`${result.name}: ${result.msg}`);
      }
      if (entries.length > 0) return entries.join('; ');
    }

    // Strategy 3: standalone [role="alert"] elements
    const alerts = page.locator('[role="alert"]');
    const alertCount = await alerts.count();
    if (alertCount > 0) {
      const messages: string[] = [];
      for (let i = 0; i < alertCount; i++) {
        const text = await alerts.nth(i).textContent().catch(() => null);
        if (text && text.trim()) messages.push(text.trim());
      }
      if (messages.length > 0) return messages.join('; ');
    }

    return null;
  } catch {
    return null;
  }
}

async function resolveFieldName(field: Locator): Promise<string> {
  const name = await field.getAttribute('name').catch(() => null);
  if (name) return name;
  const ariaLabel = await field.getAttribute('aria-label').catch(() => null);
  if (ariaLabel) return ariaLabel;
  const placeholder = await field.getAttribute('placeholder').catch(() => null);
  if (placeholder) return placeholder;
  return 'unknown';
}

async function resolveFieldError(field: Locator): Promise<string | null> {
  return field.evaluate((el) => {
    const errorId = el.getAttribute('aria-describedby') ?? el.getAttribute('aria-errormessage');
    if (errorId) {
      const errorEl = document.getElementById(errorId);
      if (errorEl) {
        const text = errorEl.textContent?.trim();
        if (text && /is required|must be|is invalid|please enter|should be|enter a valid|enter your|can'?t be blank|is empty/i.test(text)) return text;
      }
    }

    const parent = el.parentElement;
    if (!parent) return null;

    for (const sibling of parent.children) {
      if (sibling === el) continue;
      const text = sibling.textContent?.trim();
      if (text && /is required|must be|is invalid|please enter|should be|enter a valid|enter your|can'?t be blank|is empty/i.test(text)) return text;
    }

    return null;
  }).catch(() => null);
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
      const detail = await extractValidationErrors(page);
      throw new Error(detail ? `required field(s) missing or invalid: ${detail}` : 'a required field is missing or invalid');
    }
    // Let the new step's content settle — dependent selects (province/city/barangay
    // cascades) fetch data on mount. Avoid networkidle which can hang when async
    // components fire continuous API calls (e.g. polling, debounced searches).
    await page.waitForTimeout(3_000);
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
