// Simple markdown parser for the widget (no external dependencies)

export function parseMarkdown(text: string): string {
  let html = escapeHtml(text);

  // Code blocks (must be before inline code)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Unordered lists
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  // This is a simple approach - it may create nested ul/ol incorrectly in edge cases

  // Headings (h1-h3)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Line breaks - convert double newlines to paragraphs
  html = html
    .split(/\n\n+/)
    .map(para => {
      para = para.trim();
      if (!para) return '';
      // Don't wrap if already wrapped in a block element
      if (/^<(ul|ol|pre|h[1-6]|blockquote)/.test(para)) {
        return para;
      }
      return `<p>${para}</p>`;
    })
    .join('');

  // Single newlines to <br> within paragraphs
  html = html.replace(/(<p>[\s\S]*?<\/p>)/g, (match) => {
    return match.replace(/\n/g, '<br>');
  });

  return html;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
