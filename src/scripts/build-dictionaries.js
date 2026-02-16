import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectRoot = path.resolve(__dirname, '../../');
const dictionaryDir = path.join(__dirname, '../data/dictionary');
const defaultOutputDir = path.join(__dirname, '../../dist/data/dictionaries');
const outputDir = process.argv[2] 
  ? path.resolve(projectRoot, process.argv[2])
  : defaultOutputDir;

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
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
  const outputFile = path.join(outputDir, `dictionary.${lang}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(merged, null, 2));
  console.log(`✓ Generated ${outputFile}`);
});

console.log(`\nSuccessfully generated ${languages.length} dictionary file(s).`);
