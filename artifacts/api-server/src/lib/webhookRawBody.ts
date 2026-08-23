import express, { Request, Response, NextFunction } from "express";

/**
 * Captures the raw request body as a Buffer so it can be HMAC-verified
 * against Paystack's signature, while still making the parsed JSON object
 * available at req.body for downstream handlers.
 *
 * IMPORTANT: this must be mounted BEFORE express.json() and ONLY on the
 * webhook route. Paystack signs the exact bytes it sent over the wire. If
 * express.json() parses the body first and we later re-serialize it with
 * JSON.stringify() to verify the signature, differences in key ordering or
 * whitespace between the original payload and our re-serialized version will
 * silently break verification — this was the root cause of the broken
 * signature check in the original webhook implementation.
 */
export interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

// Mount this first on the webhook route. It replaces req.body with a Buffer.
export const captureRawBody = express.raw({
  type: "application/json",
  limit: "1mb",
});

// Mount this second. It reads the Buffer, stashes it on req.rawBody for
// signature verification, then replaces req.body with the parsed JSON so
// the rest of the handler can use it normally.
export function attachParsedBody(req: RawBodyRequest, res: Response, next: NextFunction): void {
  if (!Buffer.isBuffer(req.body)) {
    // Nothing to do — likely already parsed or an empty body.
    next();
    return;
  }

  req.rawBody = req.body;

  if (req.rawBody.length === 0) {
    req.body = {};
    next();
    return;
  }

  try {
    req.body = JSON.parse(req.rawBody.toString("utf8"));
  } catch {
    res.status(400).json({ message: "Invalid JSON payload", success: false });
    return;
  }

  next();
}