const config = require('../config');

function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: API key is required'
    });
  }

  if (apiKey !== config.server.apiKey) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Invalid API key'
    });
  }

  next();
}

module.exports = requireApiKey;