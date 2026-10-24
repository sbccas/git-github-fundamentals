/**
 * Share previews (PRD U-07): Open Graph and Twitter Card tags for every page, so a link shared on WhatsApp or
 * social media shows a large card. Built from the page's own <title> and meta description at build time.
 * Images live in public/share/ (made by `npm run share-images`).
 */
export const LIVE = 'https://sbccas.github.io/git-github-fundamentals/';
export const SITE_NAME = 'Git & GitHub Fundamentals · SBCCAS';

/** Pages with their own preview image; every other page uses the course image. */
export const SHARE_IMAGE = {
  'book/student/': { file: 'share/student-ebook.jpg', alt: 'Git & GitHub Fundamentals — Student Edition ebook' },
  'book/faculty/': { file: 'share/faculty-ebook.jpg', alt: 'Teaching Git & GitHub with Stories — Faculty Edition ebook' },
  'passport/': { file: 'share/passport.jpg', alt: 'My Git Passport — XP, levels and badges' },
};
export const DEFAULT_IMAGE = { file: 'share/course.jpg', alt: 'Learn Git & GitHub by typing real commands — free certificate course by SBCCAS, Amroli, Surat' };

const attr = (s) => s.replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** "/book/student/index.html" or "/book/student/" → "book/student/"; the home page → "". */
export function pageSlug(path) {
  return String(path ?? '').replace(/^\/+/, '').replace(/index\.html$/, '').replace(/^git-github-fundamentals\//, '');
}

export function socialMeta(html, path) {
  if (html.includes('property="og:title"')) return html;
  const slug = pageSlug(path);
  const title = (/<title>([\s\S]*?)<\/title>/.exec(html)?.[1] ?? SITE_NAME).trim();
  const desc = (/<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '').trim();
  const image = SHARE_IMAGE[slug] ?? DEFAULT_IMAGE;
  const url = LIVE + slug;
  const tags = [
    `<link rel="canonical" href="${url}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${attr(SITE_NAME)}">`,
    '<meta property="og:locale" content="en_IN">',
    `<meta property="og:title" content="${attr(title)}">`,
    `<meta property="og:description" content="${attr(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${LIVE}${image.file}">`,
    '<meta property="og:image:type" content="image/jpeg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${attr(image.alt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${attr(title)}">`,
    `<meta name="twitter:description" content="${attr(desc)}">`,
    `<meta name="twitter:image" content="${LIVE}${image.file}">`,
    `<meta name="twitter:image:alt" content="${attr(image.alt)}">`,
  ];
  return html.replace('</head>', `  ${tags.join('\n  ')}\n</head>`);
}
