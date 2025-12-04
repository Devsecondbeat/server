import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }
  try {
    const decoded = jwt.verify(token, process.env.Token_Secret_Key);
    req.emailID = decoded.emailID;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    // Note: Response already sent, so we don't call next(error)
    // This is acceptable for authentication middleware
  }
};
