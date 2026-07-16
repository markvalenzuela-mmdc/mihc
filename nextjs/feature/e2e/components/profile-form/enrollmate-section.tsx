import { Fragment, type ReactNode } from "react";

import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import type {
  E2eProfileFixture,
  E2eProfileFormEditorSection,
} from "@/feature/e2e/types/e2e-profile-form.types";
import type { EnrollmateFieldRenderProps } from "./enrollmate-field-renderer";

type EnrollmateSectionProps = {
  fixtures: readonly E2eProfileFixture[];
  renderField: (props: EnrollmateFieldRenderProps) => ReactNode;
  section: E2eProfileFormEditorSection;
  values: Record<string, unknown>;
};

function getHeadingId(section: E2eProfileFormEditorSection) {
  return `enrollmate-${section.id.replace(/[^a-zA-Z0-9_-]/g, "-")}-heading`;
}

function RequiredIndicator() {
  return (
    <span className="ml-2 font-normal text-muted-foreground">(required)</span>
  );
}

function renderFields({
  fixtures,
  renderField,
  section,
  values,
}: EnrollmateSectionProps) {
  return section.fields.map((definition) => (
    <Fragment key={definition.id}>
      {renderField({ definition, fixtures, values })}
    </Fragment>
  ));
}

export function EnrollmateSection({
  fixtures,
  renderField,
  section,
  values,
}: EnrollmateSectionProps) {
  const headingId = getHeadingId(section);

  if (section.type === "checkboxGroup") {
    return (
      <FieldSet className="gap-4">
        <FieldLegend>
          {section.label}
          {" "}
          {section.required && <RequiredIndicator />}
        </FieldLegend>
        {section.description && (
          <FieldDescription>{section.description}</FieldDescription>
        )}
        {section.notes && (
          <FieldDescription>{section.notes}</FieldDescription>
        )}
        <FieldGroup data-slot="checkbox-group">
          {renderFields({ fixtures, renderField, section, values })}
        </FieldGroup>
      </FieldSet>
    );
  }

  return (
    <section aria-labelledby={headingId} className="space-y-5">
      <div className="space-y-1.5">
        <h3 id={headingId} className="text-base font-medium">
          {section.label}
        </h3>
        {section.description && (
          <FieldDescription>{section.description}</FieldDescription>
        )}
        {section.notes && (
          <FieldDescription>{section.notes}</FieldDescription>
        )}
      </div>
      <FieldGroup>
        {renderFields({ fixtures, renderField, section, values })}
      </FieldGroup>
    </section>
  );
}
