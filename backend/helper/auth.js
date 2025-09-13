import jwt from 'jsonwebtoken';

export const auth = (req, res, next) => {
  const raw = req.headers.authorization || '';
  // поддерживаем и "Bearer x.y.z", и "x.y.z"
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // ожидаем { id, email }
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Failed to authenticate token' });
  }
};
