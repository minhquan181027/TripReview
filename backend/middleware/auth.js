const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'tripgo_secret_2025';

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'Chưa đăng nhập' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token không hợp lệ' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token hết hạn hoặc không hợp lệ' });
    }
};