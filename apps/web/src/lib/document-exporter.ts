import { JSONContent } from "@tiptap/react";

/**
 * Converts Tiptap JSON content to Markdown format text.
 */
export function jsonToMarkdown(content: JSONContent): string {
  if (!content || !content.content) return "";

  let markdown = "";

  for (const node of content.content) {
    switch (node.type) {
      case "heading": {
        const level = node.attrs?.level || 1;
        const prefix = "#".repeat(level);
        const text = getNodeText(node);
        markdown += `${prefix} ${text}\n\n`;
        break;
      }
      case "paragraph": {
        const text = getNodeText(node);
        if (text.trim()) {
          markdown += `${text}\n\n`;
        } else {
          markdown += `\n`;
        }
        break;
      }
      case "bulletList": {
        if (node.content) {
          for (const item of node.content) {
            const text = getNodeText(item);
            markdown += `- ${text}\n`;
          }
          markdown += `\n`;
        }
        break;
      }
      case "orderedList": {
        if (node.content) {
          node.content.forEach((item, idx) => {
            const text = getNodeText(item);
            markdown += `${idx + 1}. ${text}\n`;
          });
          markdown += `\n`;
        }
        break;
      }
      case "blockquote": {
        const text = getNodeText(node);
        markdown += `> ${text}\n\n`;
        break;
      }
      case "codeBlock": {
        const text = getNodeText(node);
        markdown += `\`\`\`\n${text}\n\`\`\`\n\n`;
        break;
      }
      case "horizontalRule": {
        markdown += `---\n\n`;
        break;
      }
      default: {
        const text = getNodeText(node);
        if (text) markdown += `${text}\n\n`;
        break;
      }
    }
  }

  return markdown.trim();
}

function getNodeText(node: JSONContent): string {
  if (!node) return "";
  if (node.text) {
    let text = node.text;
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "bold") text = `**${text}**`;
        if (mark.type === "italic") text = `*${text}*`;
        if (mark.type === "code") text = `\`${text}\``;
        if (mark.type === "strike") text = `~~${text}~~`;
      }
    }
    return text;
  }
  if (node.content) {
    return node.content.map(getNodeText).join("");
  }
  return "";
}

/**
 * Downloads plain text content as a file with specified filename and mime type.
 */
export function downloadFile(filename: string, content: string, mimeType: string = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers browser print dialog formatted specifically for document PDF printing.
 */
export function printDocument(title: string, htmlContent: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!Valid HTML>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
          h1 { font-size: 28px; font-weight: 800; margin-bottom: 20px; }
          h2 { font-size: 22px; font-weight: 700; margin-top: 24px; }
          p { margin-bottom: 12px; }
          blockquote { border-left: 3px solid #6366f1; padding-left: 12px; color: #64748b; font-style: italic; }
          code { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
          pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; font-family: monospace; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
        <div>${htmlContent}</div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
