import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const colorsPath = path.join(__dirname, '../../assets/colors.txt');

/**
 * @typedef {Object} MardColor
 * @property {string} code - Color code (e.g., "A1", "B5")
 * @property {string} hex - Hex color value (e.g., "#faf5cd")
 * @property {string} group - Color group letter (e.g., "A", "B")
 */

/** @type {MardColor[]} */
let colors = [];

/** @type {Map<string, MardColor>} */
let colorMap = new Map();

/**
 * Load colors from assets/colors.txt
 */
export function loadColors() {
  const content = fs.readFileSync(colorsPath, 'utf-8');
  colors = [];
  colorMap = new Map();

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const [code, hex] = trimmed.split('\t');
    if (code && hex) {
      const color = {
        code: code.trim(),
        hex: hex.trim().toLowerCase(),
        group: code.trim().charAt(0),
      };
      colors.push(color);
      colorMap.set(color.code, color);
    }
  }

  console.log(`Loaded ${colors.length} MARD colors`);
  return colors;
}

/**
 * Get all colors
 * @returns {MardColor[]}
 */
export function getAllColors() {
  if (colors.length === 0) {
    loadColors();
  }
  return colors;
}

/**
 * Get color by code
 * @param {string} code
 * @returns {MardColor | undefined}
 */
export function getColorByCode(code) {
  if (colors.length === 0) {
    loadColors();
  }
  return colorMap.get(code);
}

/**
 * Validate if a color code exists
 * @param {string} code
 * @returns {boolean}
 */
export function isValidColorCode(code) {
  return getColorByCode(code) !== undefined;
}

/**
 * Convert HEX to RGB
 * @param {string} hex
 * @returns {{r: number, g: number, b: number}}
 */
function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  };
}

/**
 * Convert RGB to Lab color space
 * @param {{r: number, g: number, b: number}} rgb
 * @returns {{L: number, a: number, b: number}}
 */
function rgbToLab(rgb) {
  // Convert RGB to XYZ
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000;
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

  // Convert XYZ to Lab
  const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  return {
    L: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/**
 * Calculate CIEDE2000 color difference
 * Simplified implementation based on the standard
 * @param {{L: number, a: number, b: number}} lab1
 * @param {{L: number, a: number, b: number}} lab2
 * @returns {number}
 */
function ciede2000(lab1, lab2) {
  const kL = 1, kC = 1, kH = 1;
  
  const C1 = Math.sqrt(lab1.a ** 2 + lab1.b ** 2);
  const C2 = Math.sqrt(lab2.a ** 2 + lab2.b ** 2);
  const Cab = (C1 + C2) / 2;
  
  const G = 0.5 * (1 - Math.sqrt(Cab ** 7 / (Cab ** 7 + 25 ** 7)));
  
  const a1p = lab1.a * (1 + G);
  const a2p = lab2.a * (1 + G);
  
  const C1p = Math.sqrt(a1p ** 2 + lab1.b ** 2);
  const C2p = Math.sqrt(a2p ** 2 + lab2.b ** 2);
  
  const h1p = Math.atan2(lab1.b, a1p) * 180 / Math.PI;
  const h2p = Math.atan2(lab2.b, a2p) * 180 / Math.PI;
  
  const h1pNorm = h1p < 0 ? h1p + 360 : h1p;
  const h2pNorm = h2p < 0 ? h2p + 360 : h2p;
  
  const dLp = lab2.L - lab1.L;
  const dCp = C2p - C1p;
  
  let dhp;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2pNorm - h1pNorm) <= 180) {
    dhp = h2pNorm - h1pNorm;
  } else if (h2pNorm - h1pNorm > 180) {
    dhp = h2pNorm - h1pNorm - 360;
  } else {
    dhp = h2pNorm - h1pNorm + 360;
  }
  
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);
  
  const Lp = (lab1.L + lab2.L) / 2;
  const Cp = (C1p + C2p) / 2;
  
  let Hp;
  if (C1p * C2p === 0) {
    Hp = h1pNorm + h2pNorm;
  } else if (Math.abs(h1pNorm - h2pNorm) <= 180) {
    Hp = (h1pNorm + h2pNorm) / 2;
  } else if (h1pNorm + h2pNorm < 360) {
    Hp = (h1pNorm + h2pNorm + 360) / 2;
  } else {
    Hp = (h1pNorm + h2pNorm - 360) / 2;
  }
  
  const T = 1 - 0.17 * Math.cos((Hp - 30) * Math.PI / 180) 
              + 0.24 * Math.cos(2 * Hp * Math.PI / 180)
              + 0.32 * Math.cos((3 * Hp + 6) * Math.PI / 180)
              - 0.20 * Math.cos((4 * Hp - 63) * Math.PI / 180);
  
  const SL = 1 + (0.015 * (Lp - 50) ** 2) / Math.sqrt(20 + (Lp - 50) ** 2);
  const SC = 1 + 0.045 * Cp;
  const SH = 1 + 0.015 * Cp * T;
  
  const RT = -2 * Math.sqrt(Cp ** 7 / (Cp ** 7 + 25 ** 7))
             * Math.sin(60 * Math.exp((-((Hp - 275) / 25)) ** 2) * Math.PI / 180);
  
  const dE = Math.sqrt(
    (dLp / (kL * SL)) ** 2 +
    (dCp / (kC * SC)) ** 2 +
    (dHp / (kH * SH)) ** 2 +
    RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  );
  
  return dE;
}

/**
 * Find closest MARD color to given HEX value using CIEDE2000
 * @param {string} inputHex - 6-digit hex color (with or without #)
 * @returns {{ input: string, match: MardColor & { distance: number }, alternatives: (MardColor & { distance: number })[] }}
 */
export function matchColor(inputHex) {
  const cleanHex = '#' + inputHex.replace('#', '').toLowerCase();
  const inputRgb = hexToRgb(cleanHex);
  const inputLab = rgbToLab(inputRgb);

  const allColors = getAllColors();
  const results = allColors.map(color => {
    const colorRgb = hexToRgb(color.hex);
    const colorLab = rgbToLab(colorRgb);
    const distance = ciede2000(inputLab, colorLab);
    return { ...color, distance: Math.round(distance * 10) / 10 };
  });

  results.sort((a, b) => a.distance - b.distance);

  const match = results[0];
  const alternatives = results.slice(1, 4);

  return {
    input: cleanHex,
    match,
    alternatives,
  };
}

// Initialize colors on module load
loadColors();
