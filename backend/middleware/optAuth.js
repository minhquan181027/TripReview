const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'tripgo_secret_2025';

// Middleware xác thực TÙY CHỌN
// Nếu có token hợp lệ → gán req.user, nếu không → req.user = null, vẫn next()
module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) { req.user = null; return next(); }

    const token = authHeader.split(' ')[1];
    if (!token) { req.user = null; return next(); }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
    } catch {
        req.user = null;
    }
    next();
};