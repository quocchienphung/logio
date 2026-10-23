import { copyFile, mkdir } from 'node:fs/promises';
// The local worker must have the same version as the installed PDF.js parser.
await mkdir('public/storage',{recursive:true});
await copyFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/storage/pdf.worker.min.mjs');
await copyFile('node_modules/pdfjs-dist/LICENSE','public/storage/pdfjs-LICENSE');
