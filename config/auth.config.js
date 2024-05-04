module.exports = {
  secret: process.env.JWT_SECRET,
  jwtExpiration: parseInt(process.env.JWT_EXPIRATION, 10),         // 1 hour
  jwtRefreshExpiration: parseInt(process.env.JWT_REFRESH_EXPIRATION, 10),   // 14 days
};
