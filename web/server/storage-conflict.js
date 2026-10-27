import { BlobError, BlobPreconditionFailedError } from '@vercel/blob';

// Blob also reports an overlapping conditional write as a generic BlobError
// (bad_request), rather than BlobPreconditionFailedError. Both require a fresh
// read and CAS retry; never retry permissions, outages or unknown write results.
export const isStorageConflict = error => error instanceof BlobPreconditionFailedError ||
  /already exists/i.test(error?.message || '') ||
  (error instanceof BlobError && /The conditional request cannot succeed due to a conflicting operation against this resource\.?$/i.test(error.message));

export const waitForStorageRetry = attempt => new Promise(resolve =>
  setTimeout(resolve, Math.min(120, 5 * (attempt + 1)) + Math.random() * 30));
