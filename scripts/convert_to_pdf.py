"""
Convert Markdown documentation to PDF with rendered Mermaid diagrams
"""
import markdown2
import re
import os

# Read the markdown file
md_path = r"C:\Users\PMYLS\.gemini\antigravity\brain\ba13b792-08b5-4172-9d67-125c24356d28\NEXGENEMR_COMPLETE_DOCUMENTATION.md"

with open(md_path, 'r', encoding='utf-8') as f:
    md_content = f.read()

# Convert mermaid code blocks to divs before markdown processing
def convert_mermaid_blocks(content):
    # Pattern to match ```mermaid ... ``` blocks
    pattern = r'```mermaid\s*([\s\S]*?)```'
    
    def replacer(match):
        mermaid_code = match.group(1).strip()
        # Wrap in a pre tag with mermaid class for Mermaid.js to render
        return f'<pre class="mermaid">\n{mermaid_code}\n</pre>'
    
    return re.sub(pattern, replacer, content)

# First convert mermaid blocks
md_content_processed = convert_mermaid_blocks(md_content)

# Convert markdown to HTML with extras
html_content = markdown2.markdown(md_content_processed, extras=[
    'tables',
    'fenced-code-blocks',
    'code-friendly',
    'header-ids',
    'strike'
])

# Create full HTML document with styling and Mermaid.js
full_html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>NexGenEMR Complete Documentation</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({{ 
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            flowchart: {{
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            }},
            sequence: {{
                useMaxWidth: true,
                wrap: true
            }}
        }});
    </script>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            max-width: 1000px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
            font-size: 14px;
        }}
        h1 {{
            color: #1a365d;
            border-bottom: 3px solid #3182ce;
            padding-bottom: 10px;
            margin-top: 40px;
        }}
        h2 {{
            color: #2c5282;
            border-bottom: 2px solid #63b3ed;
            padding-bottom: 8px;
            margin-top: 35px;
        }}
        h3 {{
            color: #2b6cb0;
            margin-top: 30px;
        }}
        h4 {{
            color: #3182ce;
            margin-top: 25px;
        }}
        h5 {{
            color: #4299e1;
        }}
        code {{
            background-color: #f7fafc;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 13px;
            border: 1px solid #e2e8f0;
        }}
        pre {{
            background-color: #1a202c;
            color: #e2e8f0;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 12px;
            line-height: 1.5;
        }}
        pre code {{
            background-color: transparent;
            border: none;
            padding: 0;
            color: #e2e8f0;
        }}
        /* Mermaid diagram styling */
        pre.mermaid {{
            background-color: #ffffff;
            color: #333;
            text-align: center;
            padding: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
        }}
        .mermaid {{
            background-color: #ffffff !important;
        }}
        .mermaid svg {{
            max-width: 100%;
            height: auto;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            font-size: 13px;
        }}
        th, td {{
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            text-align: left;
        }}
        th {{
            background-color: #3182ce;
            color: white;
            font-weight: 600;
        }}
        tr:nth-child(even) {{
            background-color: #f7fafc;
        }}
        tr:hover {{
            background-color: #edf2f7;
        }}
        blockquote {{
            border-left: 4px solid #3182ce;
            margin: 20px 0;
            padding: 10px 20px;
            background-color: #ebf8ff;
            color: #2c5282;
        }}
        ul, ol {{
            padding-left: 25px;
        }}
        li {{
            margin: 6px 0;
        }}
        strong {{
            color: #2d3748;
        }}
        hr {{
            border: none;
            border-top: 2px solid #e2e8f0;
            margin: 30px 0;
        }}
        a {{
            color: #3182ce;
            text-decoration: none;
        }}
        a:hover {{
            text-decoration: underline;
        }}
        @media print {{
            body {{
                max-width: 100%;
                padding: 20px;
            }}
            pre.mermaid {{
                page-break-inside: avoid;
            }}
            h1, h2, h3 {{
                page-break-after: avoid;
            }}
        }}
    </style>
</head>
<body>
{html_content}
</body>
</html>
"""

# Save HTML file
html_path = r"C:\nexgenemr\docs\NEXGENEMR_COMPLETE_DOCUMENTATION.html"
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(full_html)

print(f"HTML file with Mermaid diagrams created: {html_path}")
print("Open this file in a browser to see rendered diagrams!")
print("Then use browser's Print (Ctrl+P) -> Save as PDF for best results.")
