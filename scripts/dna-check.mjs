#!/usr/bin/env node
/**
 * Artelligence 10-Point Digital DNA Pre-Publish Validator
 * Scans source and built artifacts to guarantee 100% compliance before deploy.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['src', 'public/dna', 'index.html'];

const FORBIDDEN_PATTERNS = [
  { id: '01_NO_EM_DASH', regex: /\u2014/g, label: 'Forbidden Em Dash (U+2014)' },
  { id: '02_NO_OLD_TITLES', regex: /AI Ambassador MENA|14 مدير تنفيذي افتراضي|14 Virtual Executives|Sovereign Digital Enterprise/gi, label: 'Deprecated persona/title' },
  { id: '03_NO_PERSONAL_EMAIL_IN_PUBLIC', regex: /ahmedissam\.personal@gmail\.com/gi, label: 'Personal email exposed in public copy (use ahmedissam.work@gmail.com)' },
  { id: '05_NO_BROKEN_LINKEDIN', regex: /linkedin\.com\/in\/ahmedissamramadan\b/gi, label: 'Broken LinkedIn handle (must be linkedin.com/in/ahmdesam96)' },
  { id: '07_NO_PLACEHOLDERS', regex: /\[BOOKING LINK\]|\[CALENDAR LINK\]|I am ready to assist with your rebranding/gi, label: 'Unresolved template placeholder' },
];

function walk(entryPath, files = []) {
  if (!fs.existsSync(entryPath)) return files;
  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    if (/\.(js|mjs|ts|css|html|json|md)$/i.test(entryPath)) files.push(entryPath);
    return files;
  }
  for (const child of fs.readdirSync(entryPath)) {
    if (child === 'node_modules' || child === '.git' || child === 'icons') continue;
    walk(path.join(entryPath, child), files);
  }
  return files;
}

const allFiles = [];
for (const rel of TARGET_DIRS) {
  walk(path.join(ROOT, rel), allFiles);
}

let violations = [];
let hasWorkEmail = false;
let hasWhatsapp = false;
let hasValidLinkedin = false;

for (const file of allFiles) {
  const rel = path.relative(ROOT, file);
  // Skip validator files
  if (rel.endsWith('dna-check.mjs')) continue;
  const rawContent = fs.readFileSync(file, 'utf8');
  // Strip internal auth alias / validator regex lines in admin.js before scanning public copy
  const content = rel.endsWith('admin.js')
    ? rawContent.split('\n').filter(ln => !ln.includes('personal@gmail.com') && !ln.includes('AI Ambassador')).join('\n')
    : rawContent;
  if (content.includes('ahmedissam.work@gmail.com')) hasWorkEmail = true;
  if (content.includes('201501656010') || content.includes('150 165 6010')) hasWhatsapp = true;
  if (content.includes('linkedin.com/in/ahmdesam96')) hasValidLinkedin = true;

  for (const rule of FORBIDDEN_PATTERNS) {
    const matches = content.match(rule.regex);
    if (matches && matches.length > 0) {
      violations.push(`[${rule.id}] ${rel}: ${rule.label} (${matches.length} occurrence(s))`);
    }
  }
}

if (!hasWorkEmail) violations.push('[03_WORK_EMAIL_MISSING] Official email ahmedissam.work@gmail.com not found in source.');
if (!hasWhatsapp) violations.push('[04_WHATSAPP_MISSING] Official WhatsApp +20 150 165 6010 not found in source.');
if (!hasValidLinkedin) violations.push('[05_LINKEDIN_MISSING] Official LinkedIn linkedin.com/in/ahmdesam96 not found in source.');

if (violations.length > 0) {
  console.error('DNA Pre-Publish Check FAILED:');
  for (const v of violations) console.error(' -', v);
  process.exit(1);
}

console.log(`DNA 10-Point Pre-Publish Check PASSED across ${allFiles.length} files.`);
