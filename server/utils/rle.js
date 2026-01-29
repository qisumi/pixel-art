/**
 * RLE (Run-Length Encoding) utilities for pixel data compression
 * 
 * Format: count*index,count*index,...
 * Example: 3*0,2*1,1*0 means [0,0,0,1,1,0]
 */

/**
 * Encode flat array of palette indices to RLE string
 * @param {number[]} flatIndices - Array of palette indices
 * @returns {string} RLE encoded string
 */
export function encode(flatIndices) {
  if (!flatIndices || flatIndices.length === 0) {
    return '';
  }

  const runs = [];
  let i = 0;

  while (i < flatIndices.length) {
    const val = flatIndices[i];
    let count = 1;
    
    while (i + count < flatIndices.length && flatIndices[i + count] === val) {
      count++;
    }
    
    runs.push(`${count}*${val}`);
    i += count;
  }

  return runs.join(',');
}

/**
 * Decode RLE string to flat array of palette indices
 * @param {string} rle - RLE encoded string
 * @param {number} expectedLength - Expected array length (width * height)
 * @returns {number[]} Array of palette indices
 * @throws {Error} If RLE is invalid or length doesn't match
 */
export function decode(rle, expectedLength) {
  if (!rle || rle.trim() === '') {
    if (expectedLength === 0) return [];
    throw new Error('RLE string is empty but expected length > 0');
  }

  const result = [];
  const runs = rle.split(',');

  for (const run of runs) {
    const parts = run.split('*');
    if (parts.length !== 2) {
      throw new Error(`Invalid RLE run format: ${run}`);
    }

    const count = parseInt(parts[0], 10);
    const index = parseInt(parts[1], 10);

    if (isNaN(count) || isNaN(index) || count <= 0) {
      throw new Error(`Invalid RLE values: count=${parts[0]}, index=${parts[1]}`);
    }

    for (let i = 0; i < count; i++) {
      result.push(index);
    }
  }

  if (result.length !== expectedLength) {
    throw new Error(`RLE length mismatch: expected ${expectedLength}, got ${result.length}`);
  }

  return result;
}

/**
 * Validate RLE string format
 * @param {string} rle - RLE string to validate
 * @param {number} expectedLength - Expected decoded length
 * @param {number} maxPaletteIndex - Maximum valid palette index
 * @returns {{ valid: boolean, error?: string }}
 */
export function validate(rle, expectedLength, maxPaletteIndex) {
  try {
    const decoded = decode(rle, expectedLength);
    
    for (const index of decoded) {
      if (index < 0 || index > maxPaletteIndex) {
        return { valid: false, error: `Palette index ${index} out of range [0, ${maxPaletteIndex}]` };
      }
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
