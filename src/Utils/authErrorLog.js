/** Shape errors for auth logs without leaking secrets. */
export const formatAuthFailure = (error) => ({
  message: error?.message,
  code: error?.code,
  status: error?.status,
  name: error?.name,
  signupStep: error?.signupStep,
});
