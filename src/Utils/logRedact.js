/** Strip values that must not appear in logs (tokens, passwords, raw email). */
export const redactForLog = (value) => {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (value.length > 200) return `${value.slice(0, 200)}…`;
    return value;
  }
  if (Array.isArray(value)) return value.map(redactForLog);
  if (typeof value === 'object') {
    const sensitive = new Set([
      'password',
      'token',
      'access_token',
      'refresh_token',
      'authorization',
      'cookie',
      'email',
    ]);
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => {
        if (sensitive.has(key.toLowerCase())) {
          return [key, '[REDACTED]'];
        }
        return [key, redactForLog(v)];
      }),
    );
  }
  return value;
};
