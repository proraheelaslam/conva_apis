const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  try {
    const header = req.headers['authorization'] || req.headers['Authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ status: 401, message: 'Authorization token missing', data: null });
    }
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || !payload.id) {
      return res.status(401).json({ status: 401, message: 'Invalid token', data: null });
    }
    req.user = { id: payload.id };
    next();
  } catch (err) {
    return res.status(401).json({ status: 401, message: 'Unauthorized', data: err.message || err });
  }
};
