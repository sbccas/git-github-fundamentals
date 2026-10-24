"""Print a PDF's bookmarks (outline) as JSON: [{"level", "title", "page"}] with 1-based page numbers.

Used by scripts/ebooks.mjs. Needs: pip install pypdfium2
Usage: python scripts/pdf_outline.py book.pdf
"""
import json
import sys

import pypdfium2 as pdfium

pdf = pdfium.PdfDocument(sys.argv[1])
items = []
for item in pdf.get_toc():
    dest = item.get_dest()
    items.append({'level': item.level, 'title': item.get_title(), 'page': dest.get_index() + 1 if dest else None})
print(json.dumps({'pages': len(pdf), 'outline': items}))
