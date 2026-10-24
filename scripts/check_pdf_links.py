"""Check an ebook PDF's contents: every contents line is a link to the page number printed beside it.

Used by scripts/ebooks.mjs. Needs: pip install pypdfium2
Usage: python scripts/check_pdf_links.py book.pdf CONTENTS_FIRST_PAGE CONTENTS_LAST_PAGE
Prints JSON: {"links": n, "checked": n, "mismatches": [...]}.
"""
import ctypes
import json
import re
import sys

import pypdfium2 as pdfium
import pypdfium2.raw as raw

pdf = pdfium.PdfDocument(sys.argv[1])
first, last = int(sys.argv[2]), int(sys.argv[3])
links = checked = 0
mismatches = []
for p in range(first - 1, last):
    page = pdf[p]
    text = page.get_textpage()
    pos = ctypes.c_int(0)
    link = raw.FPDF_LINK()
    while raw.FPDFLink_Enumerate(page.raw, ctypes.byref(pos), ctypes.byref(link)):
        dest = raw.FPDFLink_GetDest(pdf.raw, link)
        if not dest:
            continue  # an external (web) link
        links += 1
        target = raw.FPDFDest_GetDestPageIndex(pdf.raw, dest) + 1
        rect = raw.FS_RECTF()
        raw.FPDFLink_GetAnnotRect(link, ctypes.byref(rect))
        label = text.get_text_bounded(left=rect.left, bottom=rect.bottom, right=rect.right, top=rect.top).strip()
        number = re.search(r'(\d+)\s*$', label)
        if number:
            checked += 1
            if int(number.group(1)) != target:
                mismatches.append({'label': label[:60], 'printed': int(number.group(1)), 'goes_to': target})
print(json.dumps({'links': links, 'checked': checked, 'mismatches': mismatches}))
