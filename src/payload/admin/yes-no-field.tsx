"use client";

import {
  FieldDescription,
  FieldError,
  FieldLabel,
  useField,
} from "@payloadcms/ui";
import type { CheckboxFieldClientComponent } from "payload";

/**
 * A checkbox field shown as a required Yes / No choice, so it is an explicit
 * answer rather than an easily missed tick box.
 */
export const YesNoField: CheckboxFieldClientComponent = ({
  field,
  path,
  readOnly,
}) => {
  const { value, setValue, showError } = useField<boolean | null>({ path });
  const name = path ?? field.name;
  const description = field.admin?.description;

  return (
    <div className="field-type sb-yes-no">
      <FieldLabel
        label={field.label}
        path={name}
        required={field.required}
        as="span"
      />
      <FieldError path={name} showError={showError} />
      <div role="radiogroup" className="sb-yes-no__options">
        {[
          { label: "Yes", checked: value === true },
          { label: "No", checked: value === false },
        ].map((option) => (
          <label key={option.label} className="sb-yes-no__option">
            <input
              type="radio"
              name={name}
              checked={option.checked}
              disabled={readOnly}
              onChange={() => setValue(option.label === "Yes")}
            />
            {option.label}
          </label>
        ))}
      </div>
      {typeof description === "string" && (
        <FieldDescription description={description} path={name} />
      )}
    </div>
  );
};
