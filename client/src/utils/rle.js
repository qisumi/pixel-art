export function encode(flatIndices) {
  if (!flatIndices || flatIndices.length === 0) return '';

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

export function decode(rle, expectedLength) {
  if (!rle || rle.trim() === '') {
    if (expectedLength === 0) return [];
    throw new Error('RLE string is empty but expected length > 0');
  }

  const result = [];
  const runs = rle
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const run of runs) {
    const parts = run.split('*');
    if (parts.length !== 2) {
      throw new Error(`Invalid RLE run format: ${run}`);
    }

    const count = parseInt(parts[0], 10);
    const index = parseInt(parts[1], 10);

    if (Number.isNaN(count) || Number.isNaN(index) || count <= 0) {
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
