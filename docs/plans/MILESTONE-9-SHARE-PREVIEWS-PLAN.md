# Milestone 9 — Share previews (WhatsApp and social media): plan

| | |
|---|---|
| **Status** | ✅ Approved by the course owner (Hitesh Patel) on 24 October 2026 ("yes, add the WhatsApp preview image and share tags") |
| **PRD** | U-07 (§6.7 Global UX), Milestone 9 |

## Problem

Shared on WhatsApp, the course link shows only a plain title and description: the pages have no Open Graph or
Twitter Card tags and no preview image (checked on the live site, 24 Oct 2026).

## Requirement (U-07)

Every page carries share tags so a shared link shows a **large preview card**: title, description, site name and a
**1200 × 630 image** in the course style. The home page and most pages use the course image; the Student Edition,
Faculty Edition and Git Passport have their own images.

## Implementation

1. **Images** — `public/share/course.jpg`, `student-ebook.jpg`, `faculty-ebook.jpg`, `passport.jpg`: 1200 × 630 JPEG,
   each under 300 KB (WhatsApp skips large images). Drawn from one HTML template (`build/share-image.html`) with headless
   Chrome by `npm run share-images` (Chrome + Python with Pillow; maintainer machine only); the images are committed.
2. **Tags** — added at build time by the existing HTML plugin (`build/meta.js`), from each page's own `<title>` and
   description: `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image` (absolute live URL),
   `og:image:width/height/alt`, `og:locale`, `twitter:card = summary_large_image`, `twitter:title/description/image`,
   and a canonical link. No change to page content or behaviour.
3. **Not precached** — the share images are for link previews only, so the service worker skips them.

## Checks

- `npm test`: tag builder output for a sample page; every image exists, is 1200 × 630 and under 300 KB.
- After deploy: the live home page and the three special pages contain the tags; each `og:image` URL returns an image.
- Manual: share the link in WhatsApp (a link already shared earlier may show the old preview for a while because
  WhatsApp caches it).

## Exclusions

No analytics or tracking pixels; no third-party services; no change to course content.
