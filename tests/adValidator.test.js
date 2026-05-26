import { describe, it, expect } from 'vitest';
import { validateCreateAdBody, validateUpdateAdBody } from '../src/validators/adValidator.js';

describe('validateCreateAdBody', () => {
  it('returns errors for missing required fields', () => {
    const errors = validateCreateAdBody({});
    expect(errors).toContain('make_id is required');
    expect(errors).toContain('name is required');
    expect(errors).toContain('description is required');
    expect(errors).toContain('price is required');
    expect(errors).toContain('condition is required');
  });

  it('returns an error for invalid price', () => {
    const errors = validateCreateAdBody({
      make_id: 1,
      name: 'Guitar',
      description: 'Nice guitar',
      price: -10,
      condition: 'good',
    });
    expect(errors).toContain('price must be a positive number');
  });

  it('returns no errors for a valid payload', () => {
    const errors = validateCreateAdBody({
      make_id: 1,
      name: 'Guitar',
      description: 'Nice guitar',
      price: 500,
      condition: 'good',
      imageIds: ['img-1'],
    });
    expect(errors).toEqual([]);
  });
});

describe('validateUpdateAdBody', () => {
  it('validates only provided fields', () => {
    expect(validateUpdateAdBody({ price: -1 })).toContain('price must be a positive number');
    expect(validateUpdateAdBody({ condition: 'broken' })[0]).toMatch(/condition must be one of/);
    expect(validateUpdateAdBody({ description: 'Updated' })).toEqual([]);
  });
});
