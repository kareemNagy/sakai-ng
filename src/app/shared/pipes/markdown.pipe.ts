import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';

    // Simple markdown to HTML conversion
    let html = value
      // Escape HTML tags first
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      
      // Italic
      .replace(/\_(.*?)\_/g, '<em>$1</em>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      
      // Unordered lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      
      // Line breaks
      .replace(/\n/g, '<br/>');

    // Wrap list items in ul tags
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    return this.sanitizer.sanitize(1, html) || '';
  }
}

