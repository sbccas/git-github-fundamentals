// Course ebooks (PRD P-12, F-19). The book is rendered at build time; this only wires the Print button.
import '../main.js';

document.querySelectorAll('[data-book-print]').forEach((b) => b.addEventListener('click', () => window.print()));
