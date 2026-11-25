import { describe, expect, it } from 'vitest';
import { captchaIsComplete } from './turnstile-widget';

describe('captchaIsComplete', () => {
  it('requires a challenge token only when a site key is configured', () => {
    expect(captchaIsComplete('', '')).toBe(true);
    expect(captchaIsComplete('public-site-key', '')).toBe(false);
    expect(captchaIsComplete('public-site-key', 'verified-token')).toBe(true);
  });
});
