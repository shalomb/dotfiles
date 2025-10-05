#!/usr/bin/env python3
import http.server
import socketserver
import os
import urllib.parse
import re

class MarkdownHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse the path
        parsed_path = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed_path.path)
        
        # Remove leading slash
        if path.startswith('/'):
            path = path[1:]
        
        # Handle root directory
        if path == '' or path == '/':
            self.send_directory_listing('.')
        elif path.endswith('/'):
            # Directory listing
            self.send_directory_listing(path.rstrip('/'))
        elif path.endswith('.md'):
            self.send_markdown_file(path)
        else:
            # Serve other files normally
            super().do_GET()
    
    def send_directory_listing(self, dir_path):
        try:
            if not os.path.exists(dir_path) or not os.path.isdir(dir_path):
                self.send_error(404, "Directory not found")
                return
                
            files = []
            dirs = []
            for item in sorted(os.listdir(dir_path)):
                if item.startswith('.'):
                    continue
                item_path = os.path.join(dir_path, item)
                if os.path.isdir(item_path):
                    dirs.append((item, '📁'))
                elif item.endswith('.md'):
                    files.append((item, '📝'))
                else:
                    files.append((item, '📄'))
            
            # Create relative path for links
            if dir_path == '.':
                base_path = ''
            else:
                base_path = dir_path + '/'
            
            html = f'''<!DOCTYPE html>
<html><head><title>Directory Listing - {os.path.basename(dir_path) if dir_path != '.' else 'Root'}</title>
<style>
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:40px;background:#fafafa;color:#333;line-height:1.6;}}
h1{{color:#2c3e50;border-bottom:3px solid #3498db;padding-bottom:15px;margin-bottom:30px;font-size:2.2em;font-weight:600;}}
.file-list{{list-style:none;padding:0;margin:0;}}
.file-list li{{margin:12px 0;padding:8px 12px;border-radius:6px;transition:background-color 0.2s;}}
.file-list li:hover{{background:#f8f9fa;}}
.file-list a{{text-decoration:none;font-size:16px;font-weight:500;display:flex;align-items:center;gap:8px;}}
.markdown{{color:#e74c3c;font-weight:600;}}
.directory{{color:#f39c12;font-weight:500;}}
.file{{color:#7f8c8d;}}
.path{{color:#95a5a6;font-size:14px;margin-bottom:25px;background:#fff;padding:12px;border-radius:6px;border-left:4px solid #3498db;}}
</style></head><body>
<h1>📁 {os.path.basename(dir_path) if dir_path != '.' else 'Root'}</h1>
<div class="path">📍 {os.path.abspath(dir_path)}</div>
<ul class="file-list">'''
            
            for name, icon in dirs:
                html += f'<li>{icon} <a href="/{base_path}{urllib.parse.quote(name)}/" class="directory">{name}/</a></li>'
            for name, icon in files:
                if icon == '📝':
                    html += f'<li>{icon} <a href="/{base_path}{urllib.parse.quote(name)}" class="markdown">{name}</a></li>'
                else:
                    html += f'<li>{icon} <a href="/{base_path}{urllib.parse.quote(name)}" class="file">{name}</a></li>'
            
            html += '</ul></body></html>'
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.encode('utf-8'))
        except Exception as e:
            self.send_error(500, f"Error listing directory: {e}")
    
    def send_markdown_file(self, file_path):
        try:
            if not os.path.exists(file_path):
                self.send_error(404, "File not found")
                return
                
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Enhanced markdown rendering
            # Headers
            content = re.sub(r'^###### (.*)$', r'<h6>\1</h6>', content, flags=re.MULTILINE)
            content = re.sub(r'^##### (.*)$', r'<h5>\1</h5>', content, flags=re.MULTILINE)
            content = re.sub(r'^#### (.*)$', r'<h4>\1</h4>', content, flags=re.MULTILINE)
            content = re.sub(r'^### (.*)$', r'<h3>\1</h3>', content, flags=re.MULTILINE)
            content = re.sub(r'^## (.*)$', r'<h2>\1</h2>', content, flags=re.MULTILINE)
            content = re.sub(r'^# (.*)$', r'<h1>\1</h1>', content, flags=re.MULTILINE)
            
            # Code blocks (handle before inline code)
            content = re.sub(r'```(\w+)?\n(.*?)\n```', r'<pre><code class="language-\1">\2</code></pre>', content, flags=re.DOTALL)
            
            # Inline code
            content = re.sub(r'`([^`]+)`', r'<code>\1</code>', content)
            
            # Bold and italic
            content = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', content)
            content = re.sub(r'\*(.*?)\*', r'<em>\1</em>', content)
            content = re.sub(r'__(.*?)__', r'<strong>\1</strong>', content)
            content = re.sub(r'_(.*?)_', r'<em>\1</em>', content)
            
            # Links
            content = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', content)
            
            # Blockquotes
            content = re.sub(r'^> (.*)$', r'<blockquote>\1</blockquote>', content, flags=re.MULTILINE)
            
            # Horizontal rules
            content = re.sub(r'^---$', r'<hr>', content, flags=re.MULTILINE)
            content = re.sub(r'^\*\*\*$', r'<hr>', content, flags=re.MULTILINE)
            
            # Lists (basic support)
            lines = content.split('\n')
            in_list = False
            result_lines = []
            
            for line in lines:
                if re.match(r'^\s*[-*+]\s+', line):
                    if not in_list:
                        result_lines.append('<ul>')
                        in_list = True
                    item = re.sub(r'^\s*[-*+]\s+', '', line)
                    result_lines.append(f'<li>{item}</li>')
                elif re.match(r'^\s*\d+\.\s+', line):
                    if not in_list:
                        result_lines.append('<ol>')
                        in_list = True
                    item = re.sub(r'^\s*\d+\.\s+', '', line)
                    result_lines.append(f'<li>{item}</li>')
                else:
                    if in_list:
                        result_lines.append('</ul>' if 'ul' in result_lines[-1] else '</ol>')
                        in_list = False
                    result_lines.append(line)
            
            if in_list:
                result_lines.append('</ul>')
            
            content = '\n'.join(result_lines)
            
            # Convert remaining line breaks to <br> (but not inside code blocks)
            content = re.sub(r'\n(?![^<]*</code>)', '<br>\n', content)
            
            # Get directory for back link
            dir_path = os.path.dirname(file_path)
            if dir_path == '' or dir_path == '.':
                back_link = '/'
            else:
                back_link = f'/{dir_path}/'
            
            html = f'''<!DOCTYPE html>
<html><head><title>{os.path.basename(file_path)} - browse-md</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;max-width:900px;margin:0 auto;padding:40px 20px;line-height:1.7;background:#fff;color:#333;}}
h1,h2,h3,h4,h5,h6{{color:#2c3e50;margin-top:40px;margin-bottom:20px;font-weight:600;}}
h1{{border-bottom:3px solid #3498db;padding-bottom:15px;font-size:2.5em;margin-top:0;}}
h2{{border-bottom:2px solid #ecf0f1;padding-bottom:10px;font-size:2em;}}
h3{{font-size:1.5em;color:#34495e;}}
h4{{font-size:1.3em;color:#34495e;}}
h5{{font-size:1.1em;color:#34495e;}}
h6{{font-size:1em;color:#7f8c8d;}}
p{{margin-bottom:20px;}}
code{{background:#f1f3f4;color:#d73a49;padding:3px 6px;border-radius:4px;font-family:'SFMono-Regular','Monaco','Inconsolata','Roboto Mono','Source Code Pro',monospace;font-size:0.9em;border:1px solid #e1e4e8;}}
pre{{background:#f6f8fa;border:1px solid #e1e4e8;border-radius:8px;padding:20px;overflow-x:auto;margin:20px 0;font-family:'SFMono-Regular','Monaco','Inconsolata','Roboto Mono','Source Code Pro',monospace;font-size:14px;line-height:1.5;}}
pre code{{background:none;padding:0;border:none;color:#24292e;font-size:inherit;}}
blockquote{{border-left:4px solid #dfe2e5;padding-left:20px;margin:20px 0;color:#6a737d;font-style:italic;}}
a{{color:#0366d6;text-decoration:none;border-bottom:1px solid transparent;transition:border-bottom 0.2s;}}
a:hover{{border-bottom:1px solid #0366d6;text-decoration:none;}}
ul,ol{{margin-bottom:20px;padding-left:30px;}}
li{{margin-bottom:8px;}}
table{{border-collapse:collapse;width:100%;margin:20px 0;}}
th,td{{border:1px solid #dfe2e5;padding:12px;text-align:left;}}
th{{background:#f6f8fa;font-weight:600;color:#24292e;}}
.header{{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:25px;border-radius:10px;margin-bottom:40px;box-shadow:0 4px 6px rgba(0,0,0,0.1);}}
.file-info{{font-size:16px;margin-bottom:10px;opacity:0.9;}}
.back-link{{color:#fff;text-decoration:none;font-weight:500;display:inline-flex;align-items:center;gap:8px;transition:opacity 0.2s;}}
.back-link:hover{{opacity:0.8;text-decoration:none;}}
.content{{background:#fff;padding:0;}}
hr{{border:none;height:2px;background:linear-gradient(to right,transparent,#e1e4e8,transparent);margin:40px 0;}}
img{{max-width:100%;height:auto;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}}
</style></head><body>
<div class="header">
<div class="file-info">📝 {file_path}</div>
<a href="{back_link}" class="back-link">← Back to directory</a>
</div>
<div class="content">{content}</div>
</body></html>'''
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(html.encode('utf-8'))
        except Exception as e:
            self.send_error(500, f'Error reading markdown file: {e}')
    

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1])
    directory = sys.argv[2]
    os.chdir(directory)
    
    with socketserver.TCPServer(("", port), MarkdownHandler) as httpd:
        httpd.serve_forever()