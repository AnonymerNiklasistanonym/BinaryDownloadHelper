// Type imports
import type { ErrorObject } from "ajv";
// Package imports
import Ajv from "ajv";

export interface TypeErrors {
  errors?: ErrorObject[];
}

/**
 * Type guard to check if a JSON object is a type defined by a JSON schema string
 *
 * @param jsonObject JSON object to be validated
 * @param jsonSchema JSON schema string used to validate
 * @param errors Optional object to store type errors
 * @returns Boolean value "is type"
 */
export const isType = <TYPE>(
  jsonObject: unknown,
  jsonSchema: string,
  errors: TypeErrors = {}
): jsonObject is TYPE => {
  const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: true });
  const validate = ajv.compile(JSON.parse(jsonSchema));
  const valid = validate(jsonObject);
  if (validate.errors != null) {
    errors.errors = validate.errors;
  }
  return valid;
};
