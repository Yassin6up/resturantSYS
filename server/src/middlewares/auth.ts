import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

type Role = 'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter';

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers['authorization'];
  const token = header?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecretchange') as AuthUser;
    (req as any).user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function authorize(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
