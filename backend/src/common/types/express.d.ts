declare module "express-serve-static-core" {
  interface Request {
    rawBody?: string;
    requestId?: string;
    userId?: string;
    userEmail?: string;
  }
}

export {};
