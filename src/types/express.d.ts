import "express";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: number;
        role: string;
        email?: string;
      };

      correlationId?: string;
    }
  }
}

export {};