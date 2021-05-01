/* eslint-disable no-console */
const path = require('path');
const fs = require('fs').promises;
const debug = require('debug')('reveal-md');
const { revealBasePath } = require('./constants');
const { getPuppeteerLaunchConfig, getPageOptions } = require('./config');
let puppeteer;

try {
  puppeteer = require('puppeteer');
} catch (err) {
  console.warn(`Puppeteer unavailable, unable to generate PDF file.`);
  debug(err);
}

module.exports = async (initialUrl, print, printSize) => {
  if (!puppeteer) {
    return;
  }

  const puppeteerLaunchConfig = getPuppeteerLaunchConfig();

  const printPluginPath = path.join(revealBasePath, 'plugin', 'print-pdf', 'print-pdf.js');

  const filename = path.basename(initialUrl);
  const pdfFilename = typeof print === 'string' ? print : filename.replace(/\.md$/, '.pdf');

  debug({ initialUrl, printPluginPath, pdfFilename, puppeteerLaunchConfig });

  console.log(`Attempting to print "${filename}" to "${pdfFilename}".`);

  try {
    const browser = await puppeteer.launch(puppeteerLaunchConfig);
    const page = await browser.newPage();

    const pdfOptions = { path: pdfFilename, printBackground: true };
    Object.assign(pdfOptions, getPageOptions(printSize));

    await page.goto(`${initialUrl}?print-pdf&showNotes=separate-page`, { waitUntil: 'load' });
    await page.pdf(pdfOptions);
    await browser.close();

    // Wipe out date and time stamp ranges to make the PDFs deterministic
    const buffer = await fs.readFile(pdfFilename);
    for (const offset of [97, 98, 99, 100, 132, 133, 134, 135]) {
      buffer[offset] = 0;
    }

    await fs.writeFile(pdfFilename, buffer);
  } catch (err) {
    console.error(`Error while generating PDF for "${filename}"`);
    debug(err);
  }
};
