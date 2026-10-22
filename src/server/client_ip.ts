/**
 * Caddy appends the real peer address to any X-Forwarded-For the client sent, so the right-most
 * entry is the only one a client cannot forge. Falls back to the socket address without a proxy.
 */
export const clientIp = (
  forwardedFor: string | undefined,
  socketAddress: string | undefined,
): string => {
  const rightMost = forwardedFor?.split(',').at(-1)?.trim();
  return rightMost || socketAddress || 'unknown';
};
