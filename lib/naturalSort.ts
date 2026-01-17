type Token = {
  type: 'number' | 'text';
  value: string;
  numericValue?: number;
};

const tokenRegex = /(\d+|[a-zA-Z]+|[^a-zA-Z0-9]+)/g;

function tokenize(value: string): Token[] {
  const matches = value.match(tokenRegex) ?? [];
  return matches.map((segment) => {
    if (/^\d+$/.test(segment)) {
      return { type: 'number', value: segment, numericValue: Number(segment) };
    }
    return { type: 'text', value: segment };
  });
}

export function naturalSort(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  const length = Math.max(tokensA.length, tokensB.length);

  for (let index = 0; index < length; index += 1) {
    const tokenA = tokensA[index];
    const tokenB = tokensB[index];

    if (!tokenA) return -1;
    if (!tokenB) return 1;

    if (tokenA.type !== tokenB.type) {
      return tokenA.type === 'number' ? -1 : 1;
    }

    if (tokenA.type === 'number' && tokenB.type === 'number') {
      if (tokenA.numericValue !== tokenB.numericValue) {
        return (tokenA.numericValue ?? 0) - (tokenB.numericValue ?? 0);
      }
    } else {
      const comparison = tokenA.value.localeCompare(tokenB.value, 'en', {
        sensitivity: 'base'
      });
      if (comparison !== 0) return comparison;
    }
  }

  return 0;
}
