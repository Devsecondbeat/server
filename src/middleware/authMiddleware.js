import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import logger from '../config/logger.js';

// Initialize JWKS client with Supabase's JWKS endpoint
const client = jwksClient({
  jwksUri: `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // Cache keys for 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
  requestHeaders: {
    apikey: process.env.SUPABASE_ANON_KEY,
  },
});

// Promisified version of getSigningKey
const getSigningKey = (kid) => new Promise((resolve, reject) => {
  client.getSigningKey(kid, (err, key) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(key.getPublicKey());
  });
});

const verifyToken = async (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied' });
  }

  // Supabase sends tokens as "Bearer <token>"
  const token = authHeader.replace('Bearer ', '');

  try {
    // Decode header to get the key ID (kid)
    const decodedHeader = jwt.decode(token, { complete: true });

    if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Get the public key from JWKS endpoint
    const publicKey = await getSigningKey(decodedHeader.header.kid);

    // Verify the token with the public key
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['ES256'],
    });

    req.user = decoded; // Supabase includes user info in the token
    req.emailID = decoded.email; // Supabase uses 'email' not 'emailID'
    return next();
  } catch (error) {
    logger.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export default verifyToken;
