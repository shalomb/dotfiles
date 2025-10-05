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
<style>body{{font-family:sans-serif;margin:40px;}}
h1{{color:#333;border-bottom:2px solid #007acc;}}
.file-list{{list-style:none;padding:0;}}
.file-list li{{margin:8px 0;}}
.file-list a{{text-decoration:none;color:#007acc;font-size:16px;}}
.markdown{{color:#e74c3c;font-weight:bold;}}
.directory{{color:#f39c12;}}
.file{{color:#7f8c8d;}}
.path{{color:#95a5a6;font-size:14px;margin-bottom:20px;}}
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
            
            # Basic markdown rendering
            content = re.sub(r'^### (.*)$', r'<h3>\1</h3>', content, flags=re.MULTILINE)
            content = re.sub(r'^## (.*)$', r'<h2>\1</h2>', content, flags=re.MULTILINE)
            content = re.sub(r'^# (.*)$', r'<h1>\1</h1>', content, flags=re.MULTILINE)
            content = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', content)
            content = re.sub(r'\*(.*?)\*', r'<em>\1</em>', content)
            content = re.sub(r'```.*?\n(.*?)\n```', r'<pre><code>\1</code></pre>', content, flags=re.DOTALL)
            content = re.sub(r'`(.*?)`', r'<code>\1</code>', content)
            content = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', content)
            content = content.replace('\n', '<br>\n')
            
            # Get directory for back link
            dir_path = os.path.dirname(file_path)
            if dir_path == '' or dir_path == '.':
                back_link = '/'
            else:
                back_link = f'/{dir_path}/'
            
            html = f'''<!DOCTYPE html>
<html><head><title>{os.path.basename(file_path)} - browse-md</title>
<style>body{{font-family:sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;line-height:1.6;}}
h1,h2,h3{{color:#2c3e50;margin-top:30px;}}
h1{{border-bottom:2px solid #3498db;padding-bottom:10px;}}
code{{background:#f8f9fa;padding:2px 6px;border-radius:3px;font-family:monospace;}}
pre{{background:#f8f9fa;padding:15px;border-radius:5px;overflow-x:auto;border-left:4px solid #3498db;}}
pre code{{background:none;padding:0;}}
a{{color:#3498db;text-decoration:none;}}
a:hover{{text-decoration:underline;}}
.header{{background:#f8f9fa;padding:15px;border-radius:5px;margin-bottom:30px;border-left:4px solid #e74c3c;}}
.file-info{{color:#7f8c8d;font-size:14px;}}
.back-link{{color:#95a5a6;text-decoration:none;}}
.back-link:hover{{color:#3498db;}}
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
    
    def send_directory_listing(self):
        files = []
        dirs = []
        for item in sorted(os.listdir('.')):
            if item.startswith('.'):
                continue
            if os.path.isdir(item):
                dirs.append((item, '📁'))
            elif item.endswith('.md'):
                files.append((item, '📝'))
            else:
                files.append((item, '📄'))
        
        html = f'''<!DOCTYPE html>
<html><head><title>Directory Listing</title>
<style>body{{font-family:sans-serif;margin:40px;}}
h1{{color:#333;border-bottom:2px solid #007acc;}}
.file-list{{list-style:none;padding:0;}}
.file-list li{{margin:8px 0;}}
.file-list a{{text-decoration:none;color:#007acc;font-size:16px;}}
.markdown{{color:#e74c3c;font-weight:bold;}}
.directory{{color:#f39c12;}}
.file{{color:#7f8c8d;}}
</style></head><body>
<h1>📁 {os.path.basename(os.getcwd())}</h1>
<ul class="file-list">'''
        
        for name, icon in dirs:
            html += f'<li>{icon} <a href="/{urllib.parse.quote(name)}/" class="directory">{name}/</a></li>'
        for name, icon in files:
            if icon == '📝':
                html += f'<li>{icon} <a href="/{urllib.parse.quote(name)}" class="markdown">{name}</a></li>'
            else:
                html += f'<li>{icon} <a href="/{urllib.parse.quote(name)}" class="file">{name}</a></li>'
        
        html += '</ul></body></html>'
        
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))
    
    def send_markdown_file(self):
        file_path = self.path[1:]  # Remove leading slash
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Basic markdown rendering
            content = re.sub(r'^### (.*)$', r'<h3>\1</h3>', content, flags=re.MULTILINE)
            content = re.sub(r'^## (.*)$', r'<h2>\1</h2>', content, flags=re.MULTILINE)
            content = re.sub(r'^# (.*)$', r'<h1>\1</h1>', content, flags=re.MULTILINE)
            content = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', content)
            content = re.sub(r'\*(.*?)\*', r'<em>\1</em>', content)
            content = re.sub(r'```.*?\n(.*?)\n```', r'<pre><code>\1</code></pre>', content, flags=re.DOTALL)
            content = re.sub(r'`(.*?)`', r'<code>\1</code>', content)
            content = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', content)
            content = content.replace('\n', '<br>\n')
            
            html = f'''<!DOCTYPE html>
<html><head><title>{file_path} - browse-md</title>
<style>body{{font-family:sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;line-height:1.6;}}
h1,h2,h3{{color:#2c3e50;margin-top:30px;}}
h1{{border-bottom:2px solid #3498db;padding-bottom:10px;}}
code{{background:#f8f9fa;padding:2px 6px;border-radius:3px;font-family:monospace;}}
pre{{background:#f8f9fa;padding:15px;border-radius:5px;overflow-x:auto;border-left:4px solid #3498db;}}
pre code{{background:none;padding:0;}}
a{{color:#3498db;text-decoration:none;}}
a:hover{{text-decoration:underline;}}
.header{{background:#f8f9fa;padding:15px;border-radius:5px;margin-bottom:30px;border-left:4px solid #e74c3c;}}
.file-info{{color:#7f8c8d;font-size:14px;}}
.back-link{{color:#95a5a6;text-decoration:none;}}
.back-link:hover{{color:#3498db;}}
</style></head><body>
<div class="header">
<div class="file-info">📝 {file_path}</div>
<a href="/" class="back-link">← Back to directory</a>
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