import { redactForLog } from './logRedact.js';

/** Shape errors for auth logs without leaking secrets. */
export const formatAuthFailure = (error) => ({
  message: error?.message,
  code: error?.code,
  status: error?.status,
  name: error?.name,
  signupStep: error?.signupStep,
  ...(error?.sendGridStatus ? { sendGridStatus: error.sendGridStatus } : {}),
});

/** Safe subset of JSON API bodies for request completion logs. */
export const formatResponseBodyForLog = (body) => {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const summary = {
    success: body.success,
    error: body.error,
    code: body.code,
    message: body.message,
  };

  if (Object.values(summary).every((value) => value === undefined)) {
    return undefined;
  }

  return redactForLog(summary);
};

export const buildRequestLogContext = (req) => ({
  requestId: req?.requestId,
  method: req?.method,
  path: req?.originalUrl || req?.url,
});
