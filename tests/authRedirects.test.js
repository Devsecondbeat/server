import { describe, it, expect } from 'vitest';
import { assertRedirectToHonored } from '../src/config/authRedirects.js';

describe('assertRedirectToHonored', () => {
  it('passes when redirect_to matches requested URL', () => {
    const requested = 'https://staging.secondbeat.in/activate';
    const link = 'https://project.supabase.co/auth/v1/verify?token=abc&type=signup&redirect_to=https%3A%2F%2Fstaging.secondbeat.in%2Factivate';
    expect(() => assertRedirectToHonored(requested, link)).not.toThrow();
  });

  it('throws when Supabase substitutes a different redirect_to', () => {
    const requested = 'https://staging.secondbeat.in/activate';
    const link = 'https://project.supabase.co/auth/v1/verify?token=abc&type=signup&redirect_to=http%3A%2F%2Flocalhost%3A3000';
    expect(() => assertRedirectToHonored(requested, link)).toThrow(/Supabase Auth replaced redirect_to/);
  });
});
