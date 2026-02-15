import { IJwtUserPayload } from ".";

declare global {
  namespace Express {
    interface Request {
      user?: IJwtUserPayload;
    }
  }
}

export {};
