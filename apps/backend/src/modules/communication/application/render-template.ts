/** Replace `{{key}}` placeholders. Unknown keys stay as-is. */
export function renderTemplate(
  template: string,
  variables: Record<string, string> = {},
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_m, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : `{{${key}}}`;
  });
}
