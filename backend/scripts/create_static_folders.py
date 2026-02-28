import os

# Create static directory structure
base_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(base_dir, 'static')
images_dir = os.path.join(static_dir, 'images')

# Create directories
os.makedirs(images_dir, exist_ok=True)

# Create subdirectories for organization
subdirs = ['logos', 'stamps', 'signatures', 'icons']
for subdir in subdirs:
    os.makedirs(os.path.join(images_dir, subdir), exist_ok=True)

# Create a README file
readme_content = """# Static Files Directory

This directory contains static assets for the application.

## Structure

- `images/` - Image assets
  - `logos/` - Hospital and company logos
  - `stamps/` - Official stamps and seals
  - `signatures/` - Digital signatures
  - `icons/` - Icons and small graphics

## Usage

Place your static files in the appropriate subdirectories.

Access them via:
- `/static/images/logos/your-logo.png`
- `/static/images/stamps/official-stamp.png`
- etc.

## Supported Formats

- Images: PNG, JPG, JPEG, SVG, GIF, WebP
- Documents: PDF
- Other: Any static file type
"""

with open(os.path.join(static_dir, 'README.md'), 'w') as f:
    f.write(readme_content)

print("✅ Static directory structure created successfully!")
print(f"📁 Location: {static_dir}")
print("\nCreated directories:")
print(f"  - {static_dir}")
print(f"  - {images_dir}")
for subdir in subdirs:
    print(f"  - {os.path.join(images_dir, subdir)}")
