import logger from '../config/logger.js';

/**
 * Verify Supabase JWT token endpoint
 * This endpoint verifies the token sent from the frontend
 * and returns user information if valid
 */
const verifyToken = async (req, res) => {
  try {
    // User is already attached to req by verifySupabaseTokenMiddleware
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found in request',
      });
    }

    // Return success response with user information
    return res.status(200).json({
      success: true,
      message: 'Token verified successfully',
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    logger.error('Error in verifyToken controller:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export default verifyToken;
