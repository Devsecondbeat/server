import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSupabaseProjectRef,
  resolveSupabaseDbUser,
} from '../src/config/dbEnv.js';

describe('dbEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  beforeEach(() => {
    delete process.env.SUPABASE_DB_USER;
    delete process.env.SUPABASE_DB_USE_POOLER;
    delete process.env.SUPABASE_URL;
  });

  it('extracts project ref from SUPABASE_URL', () => {
    expect(getSupabaseProjectRef('https://abcdefgh.supabase.co')).toBe('abcdefgh');
    expect(getSupabaseProjectRef('')).toBeNull();
  });

  it('uses postgres.<ref> when pooler mode is enabled', () => {
    process.env.SUPABASE_URL = 'https://myproject.supabase.co';
    process.env.SUPABASE_DB_USE_POOLER = 'true';

    expect(resolveSupabaseDbUser()).toBe('postgres.myproject');
  });

  it('keeps explicit pooler user unchanged', () => {
    process.env.SUPABASE_DB_USER = 'postgres.myproject';
    process.env.SUPABASE_DB_USE_POOLER = 'true';

    expect(resolveSupabaseDbUser()).toBe('postgres.myproject');
  });

  it('uses postgres for direct connection', () => {
    process.env.SUPABASE_URL = 'https://myproject.supabase.co';
    process.env.SUPABASE_DB_USE_POOLER = 'false';

    expect(resolveSupabaseDbUser()).toBe('postgres');
  });
});
