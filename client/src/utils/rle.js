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
    throw new Error('RLE string is empty');
  }

  const result = [];
  const runs = rle.split(',');

  for (const run of runs) {
    const [countStr, indexStr] = run.split('*');
    const count = parseInt(countStr, 10);
    const index = parseInt(indexStr, 10);

    for (let i = 0; i < count; i++) {
      result.push(index);
    }
  }

  if (result.length !== expectedLength) {
    throw new Error(`RLE length mismatch: expected ${expectedLength}, got ${result.length}`);
  }

  return result;
}
