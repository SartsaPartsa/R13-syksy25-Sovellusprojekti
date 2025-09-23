import jwt from 'jsonwebtoken';

// simple middleware to verify JWT from Authorization header
export function auth(req, res, next) {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

  // no token > unauthorized
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    // verify token and attach user info to request
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // { id, email }
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Failed to authenticate token' });
  }
}
