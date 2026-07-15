import { XMLValidator } from "fast-xml-parser";

export interface XmlValidationResult {
  valid: boolean;
  error?: string;
  line?: number;
  column?: number;
}

/** Parses the feed back and reports the first well-formedness error, if
 * any — used by the "Validate XML" action and by tests that assert the
 * generator never produces broken markup. */
export function validateXml(xml: string): XmlValidationResult {
  const result = XMLValidator.validate(xml, { allowBooleanAttributes: true });
  if (result === true) return { valid: true };

  return {
    valid: false,
    error: result.err.msg,
    line: result.err.line,
    column: result.err.col,
  };
}
