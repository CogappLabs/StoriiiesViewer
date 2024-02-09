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

export function nl2br(dirty: string): string {
  return dirty.replace(/(?:\r\n|\r|\n)/g, "<br/>");
}

/**
 * If string starts with < and ends with >, it's probably HTML
 * See: https://iiif.io/api/cookbook/recipe/0007-string-formats/#implementation-notes
 */
export function IIIFSaysThisIsHTML(str: string): boolean {
  return /^<[\s\S]*>$/gi.test(str);
}
