// Since standard extensions can't arbitrarily read local folders directly,
// the Context Manager receives files read by the Popup (via File System Access API)
// and prepares them into a single string bundle.

export function buildContextBundle(files: { name: string, content: string }[]): string {
  if (!files || files.length === 0) {
    return '';
  }
  
  let bundle = 'The user has provided the following files as context for this debate:\\n\\n';
  
  for (const file of files) {
    bundle += `--- START FILE: ${file.name} ---\\n`;
    // For very large files, this would be the place to truncate or summarize
    // In a future version, this might use a tokenizer to stay within limits
    bundle += file.content;
    bundle += `\\n--- END FILE: ${file.name} ---\\n\\n`;
  }
  
  return bundle.trim();
}
