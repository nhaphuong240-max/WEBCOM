import { describe, expect, it } from 'vitest';
import { tokens } from './index.js';

describe('@ptt/ui tokens', () => {
  it('keeps brand accent', () => {
    expect(tokens.accent).toBe('#ff5c1a');
    expect(tokens.ink).toBe('#0b1420');
  });
});
