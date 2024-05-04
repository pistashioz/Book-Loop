const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');
const db = require('../models');
const { Token } = db;

exports.verifyToken = (req, res, next) => {
  let token = req.headers["x-access-token"];
  
  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  jwt.verify(token, config.secret, async (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized!" });
    }
    req.userId = decoded.id;
    const tokenExists = await Token.findOne({ where: { tokenKey: token, invalidated: false } });
    if (!tokenExists) {
      return res.status(401).send({ message: "Unauthorized! Session has been terminated or token is no longer valid." });
    }
    next();
  });
};

exports.issueJWT = (user, sessionId) => {
  const accessToken = jwt.sign({ id: user.userId, session: sessionId }, config.secret, { expiresIn: config.jwtExpiration });
  const refreshToken = jwt.sign({ id: user.userId, session: sessionId }, config.secret, { expiresIn: config.jwtRefreshExpiration });
  
  // Store refresh token in the database
  Token.create({
      tokenKey: refreshToken,
      userId: user.userId,
      sessionId: sessionId,
      tokenType: 'refresh',
      expiresAt: new Date(Date.now() + config.jwtRefreshExpiration * 1000)
  });

  return {
      accessToken,
      refreshToken
  };
};