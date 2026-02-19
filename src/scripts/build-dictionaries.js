import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectRoot = path.resolve(__dirname, '../../');
const dictionaryDir = path.join(__dirname, '../data/dictionary');
const defaultOutputDir = path.join(__dirname, '../../dist/data/');
const outputDir = process.argv[2] ? path.resolve(projectRoot, process.argv[2]) : defaultOutputDir;
const dictionariesDir = path.join(outputDir, 'dictionaries');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(dictionariesDir)) {
  fs.mkdirSync(dictionariesDir, { recursive: true });
}

// Get all language subdirectories
const languages = fs.readdirSync(dictionaryDir).filter((file) => {
  return fs.statSync(path.join(dictionaryDir, file)).isDirectory();
});

languages.forEach((lang) => {
  const langDir = path.join(dictionaryDir, lang);
  const merged = {};

  // Read all JSON files in the language directory
  const files = fs.readdirSync(langDir).filter((file) => file.endsWith('.json'));

  files.forEach((file) => {
    const filePath = path.join(langDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    Object.assign(merged, content);
  });

  // Write merged dictionary
  const outputFile = path.join(dictionariesDir, `dictionary.${lang}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2));
  console.log(`✓ Generated ${outputFile}`);
});

// Write supported languages list
const languagesFile = path.join(dictionariesDir, 'supported-languages.json');
fs.writeFileSync(languagesFile, JSON.stringify(languages, null, 2));
console.log(`✓ Generated ${languagesFile}`);

// Copy maps and templates directories
const dataDir = path.join(__dirname, '../data');

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  files.forEach((file) => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      copyDirectory(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}

const mapsSource = path.join(dataDir, 'maps');
const mapsDestination = path.join(outputDir, 'maps');
if (fs.existsSync(mapsSource)) {
  copyDirectory(mapsSource, mapsDestination);
  console.log(`✓ Copied maps directory to ${mapsDestination}`);
}

const templatesSource = path.join(dataDir, 'templates');
const templatesDestination = path.join(outputDir, 'templates');
if (fs.existsSync(templatesSource)) {
  copyDirectory(templatesSource, templatesDestination);
  console.log(`✓ Copied templates directory to ${templatesDestination}`);
}

console.log(`\nSuccessfully generated ${languages.length} dictionary file(s).`);
