#!/usr/bin/env python3
"""
Markdown-focused HTTP server for browse-md command.
Renders .md files as HTML with syntax highlighting and navigation.
"""

import http.server
import socketserver
import os
import sys
import urllib.parse
from pathlib import Path
import mimetypes

# Try to import markdown, fall back to basic rendering if not available
try:
    import markdown
    MARKDOWN_AVAILABLE = True
except ImportError:
    MARKDOWN_AVAILABLE = False

class MarkdownHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=kwargs.pop('directory', '.'), **kwargs)
    
    def do_GET(self):
        # Parse the URL
        parsed_path = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed_path.path)
        
        # Remove leading slash
        if path.startswith('/'):
            path = path[1:]
        
        # Handle root directory
        if path == '' or path == '/':
            self.send_directory_listing()
            return
        
        # Check if file exists
        full_path = os.path.join(self.directory, path)
        if not os.path.exists(full_path):
            self.send_error(404, "File not found")
            return
        
        # Handle markdown files
        if path.lower().endswith('.md'):
            self.send_markdown_file(full_path, path)
        else:
            # Serve other files normally
            super().do_GET()
    
    def send_directory_listing(self):
        """Send a directory listing with markdown files highlighted."""
        try:
            files = []
            dirs = []
            
            for item in sorted(os.listdir(self.directory)):
                if item.startswith('.'):
                    continue
                item_path = os.path.join(self.directory, item)
                if os.path.isdir(item_path):
                    dirs.append((item, '📁'))
                elif item.lower().endswith('.md'):
                    files.append((item, '📝'))
                else:
                    files.append((item, '📄'))
            
            html = self.generate_directory_html(dirs, files)
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.encode('utf-8'))
        except Exception as e:
            self.send_error(500, f"Error listing directory: {e}")
    
    def generate_directory_html(self, dirs, files):
        """Generate HTML for directory listing."""
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Directory Listing - {os.path.basename(self.directory)}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }}
        h1 {{ color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }}
        .file-list {{ list-style: none; padding: 0; }}
        .file-list li {{ margin: 8px 0; }}
        .file-list a {{ text-decoration: none; color: #007acc; font-size: 16px; }}
        .file-list a:hover {{ text-decoration: underline; }}
        .markdown {{ color: #e74c3c; font-weight: bold; }}
        .directory {{ color: #f39c12; }}
        .file {{ color: #7f8c8d; }}
        .path {{ color: #95a5a6; font-size: 14px; margin-bottom: 20px; }}
    </style>
</head>
<body>
    <h1>📁 {os.path.basename(self.directory)}</h1>
    <div class="path">📍 {self.directory}</div>
    <ul class="file-list">"""
        
        # Add directories
        for name, icon in dirs:
            html += f'<li>{icon} <a href="{urllib.parse.quote(name)}/" class="directory">{name}/</a></li>'
        
        # Add markdown files (highlighted)
        for name, icon in files:
            if icon == '📝':
                html += f'<li>{icon} <a href="{urllib.parse.quote(name)}" class="markdown">{name}</a></li>'
            else:
                html += f'<li>{icon} <a href="{urllib.parse.quote(name)}" class="file">{name}</a></li>'
        
        html += """    </ul>
</body>
</html>"""
        return html
    
    def send_markdown_file(self, file_path, url_path):
        """Send a markdown file rendered as HTML."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if MARKDOWN_AVAILABLE:
                # Use markdown library for proper rendering
                html_content = markdown.markdown(content, extensions=['codehilite', 'fenced_code'])
            else:
                # Basic markdown rendering
                html_content = self.basic_markdown_render(content)
            
            html = self.generate_markdown_html(html_content, url_path, file_path)
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.encode('utf-8'))
        except Exception as e:
            self.send_error(500, f"Error reading markdown file: {e}")
    
    def basic_markdown_render(self, content):
        """Basic markdown rendering without external dependencies."""
        import re
        
        # Headers
        content = re.sub(r'^### (.*)$', r'<h3>\1</h3>', content, flags=re.MULTILINE)
        content = re.sub(r'^## (.*)$', r'<h2>\1</h2>', content, flags=re.MULTILINE)
        content = re.sub(r'^# (.*)$', r'<h1>\1</h1>', content, flags=re.MULTILINE)
        
        # Bold and italic
        content = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', content)
        content = re.sub(r'\*(.*?)\*', r'<em>\1</em>', content)
        
        # Code blocks
        content = re.sub(r'```(\w+)?\n(.*?)\n```', r'<pre><code class="language-\1">\2</code></pre>', content, flags=re.DOTALL)
        content = re.sub(r'`(.*?)`', r'<code>\1</code>', content)
        
        # Links
        content = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', content)
        
        # Line breaks
        content = content.replace('\n', '<br>\n')
        
        return content
    
    def generate_markdown_html(self, content, url_path, file_path):
        """Generate HTML wrapper for markdown content."""
        filename = os.path.basename(file_path)
        dirname = os.path.dirname(file_path)
        
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{filename} - browse-md</title>
    <style>
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            line-height: 1.6;
            color: #333;
        }}
        h1, h2, h3 {{ color: #2c3e50; margin-top: 30px; }}
        h1 {{ border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
        code {{ 
            background: #f8f9fa; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }}
        pre {{ 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            overflow-x: auto;
            border-left: 4px solid #3498db;
        }}
        pre code {{ background: none; padding: 0; }}
        a {{ color: #3498db; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
        .header {{ 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 30px;
            border-left: 4px solid #e74c3c;
        }}
        .file-info {{ color: #7f8c8d; font-size: 14px; }}
        .back-link {{ color: #95a5a6; text-decoration: none; }}
        .back-link:hover {{ color: #3498db; }}
    </style>
</head>
<body>
    <div class="header">
        <div class="file-info">📝 {filename}</div>
        <div class="file-info">📁 {dirname}</div>
        <a href="/" class="back-link">← Back to directory</a>
    </div>
    <div class="content">
        {content}
    </div>
</body>
</html>"""
        return html

def main():
    if len(sys.argv) < 3:
        print("Usage: markdown_server.py <port> <directory>")
        sys.exit(1)
    
    port = int(sys.argv[1])
    directory = sys.argv[2]
    
    if not os.path.exists(directory):
        print(f"Error: Directory '{directory}' does not exist")
        sys.exit(1)
    
    os.chdir(directory)
    
    handler = lambda *args, **kwargs: MarkdownHTTPRequestHandler(*args, directory=directory, **kwargs)
    
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"Markdown server running on port {port}")
        print(f"Serving directory: {os.path.abspath(directory)}")
        if not MARKDOWN_AVAILABLE:
            print("Note: markdown library not available, using basic rendering")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")

if __name__ == "__main__":
    main()