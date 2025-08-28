/**
 * Environment Configuration and Validation
 * This file ensures all required environment variables are present before the app starts
 */

export const validateEnvironment = () => {
  const required = [
    'DBUSERNAME',
    'DATABASENAME', 
    'DBPASSWORD',
    'DBPORT',
    'DBHOST',
    'JWT_SECRET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'S3_BUCKET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}\n` +
                        `Please check your .env file or environment configuration.`;
    throw new Error(errorMessage);
  }

  // Validate specific environment variables
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CERTPATH) {
      console.warn('Warning: CERTPATH not set in production. SSL verification may be disabled.');
    }
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('Warning: JWT secret is shorter than recommended 32 characters.');
  }

  console.log('✅ Environment validation passed');
};

export const getEnvironmentConfig = () => {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    isDevelopment: process.env.NODE_ENV === 'development'
  };
};
