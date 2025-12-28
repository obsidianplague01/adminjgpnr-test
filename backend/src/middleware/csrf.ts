
import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

export const getCsrfToken = (req: Request, res: Response) => {
  res.json({ csrfToken: req.csrfToken() });
};

export const csrfErrorHandler = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }
  next(err);
};

export { csrfProtection };