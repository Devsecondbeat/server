export const VALID_AD_CONDITIONS = ['new', 'excellent', 'good', 'fair', 'poor'];

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const validatePrice = (price, { required = true } = {}) => {
  if (price === undefined || price === null || price === '') {
    return required ? 'price is required' : null;
  }

  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice) || numericPrice <= 0) {
    return 'price must be a positive number';
  }

  return null;
};

const validateCondition = (condition, { required = true } = {}) => {
  if (condition === undefined || condition === null || condition === '') {
    return required ? 'condition is required' : null;
  }

  if (!VALID_AD_CONDITIONS.includes(String(condition).toLowerCase())) {
    return `condition must be one of: ${VALID_AD_CONDITIONS.join(', ')}`;
  }

  return null;
};

const validateMakeId = (makeId, { required = true } = {}) => {
  if (makeId === undefined || makeId === null || makeId === '') {
    return required ? 'make_id is required' : null;
  }

  if (Number.isNaN(Number(makeId))) {
    return 'make_id must be a number';
  }

  return null;
};

export const validateCreateAdBody = (body) => {
  const errors = [];

  const checks = [
    validateMakeId(body.make_id),
    !isNonEmptyString(body.name) ? 'name is required' : null,
    !isNonEmptyString(body.description) ? 'description is required' : null,
    validatePrice(body.price),
    validateCondition(body.condition),
  ];

  if (body.imageIds !== undefined && !Array.isArray(body.imageIds)) {
    errors.push('imageIds must be an array');
  }

  checks.filter(Boolean).forEach((message) => errors.push(message));
  return errors;
};

export const validateUpdateAdBody = (body) => {
  const errors = [];

  if (body.description !== undefined && !isNonEmptyString(body.description)) {
    errors.push('description must be a non-empty string');
  }

  if (body.price !== undefined) {
    const priceError = validatePrice(body.price, { required: true });
    if (priceError) errors.push(priceError);
  }

  if (body.condition !== undefined) {
    const conditionError = validateCondition(body.condition, { required: true });
    if (conditionError) errors.push(conditionError);
  }

  if (body.imageIds !== undefined && !Array.isArray(body.imageIds)) {
    errors.push('imageIds must be an array');
  }

  return errors;
};
