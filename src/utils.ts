import DOMPurify from "dompurify";

/**
 * Takes a string of potentially unsafe HTML and returns a sanitised string
 */
export function sanitiseHTML(dirty: string, config: DOMPurify.Config): string {
  // Config could be anything, but we need to return a string
  return DOMPurify.sanitize(dirty, {
    ...config,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_IMPORT: false,
    RETURN_TRUSTED_TYPE: false,
  });
}
