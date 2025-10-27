// lib/sanitize.ts
import { JSDOM } from 'jsdom';
import * as createDOMPurify from 'dompurify';  // ES6 import-syntaksi

const { window } = new JSDOM('<!DOCTYPE html>');
// Huom: TypeScript saattaa vaatia .default käyttöä riippuen kirjaston exporteista
const DOMPurify = createDOMPurify.default(window);

export const sanitizeHTML = (dirty: string) => DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'li', 'ol', 'br'],
  ALLOWED_ATTR: ['class', 'style'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form'],
  FORBID_ATTR: ['onclick', 'onerror', 'onload']
});

export const sanitizePlainText = (input: string) => DOMPurify.sanitize(input, {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: []
});