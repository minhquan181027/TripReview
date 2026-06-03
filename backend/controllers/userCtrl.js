const { sql } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tripgo_secret_2025';

// Đăng ký
const register = async (req, res) => {
    try {
        const { fullname, email, password } = req.body;
        if (!fullname || !email || !password)
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });

        const pool = await sql.connect();

        const existing = await pool.request()
            .input('email', sql.NVarChar, email)
            .query(`SELECT user_id FROM Users WHERE email = @email`);

        if (existing.recordset.length > 0)
            return res.status(400).json({ message: 'Email đã được sử dụng' });

        const hashed = await bcrypt.hash(password, 10);
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullname)}&background=1a6ef5&color=fff&size=128`;

        await pool.request()
            .input('fullname', sql.NVarChar, fullname)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashed)
            .input('avatarUrl', sql.NVarChar, avatarUrl)
            .query(`
                INSERT INTO Users (fullname, email, password, avatar_url, created_at)
                VALUES (@fullname, @email, @password, @avatarUrl, GETDATE())
            `);

        res.json({ message: 'Đăng ký thành công!' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Đăng nhập
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });

        const pool = await sql.connect();
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query(`SELECT * FROM Users WHERE email = @email`);

        if (result.recordset.length === 0)
            return res.status(401).json({ message: 'Email không tồn tại' });

        const user = result.recordset[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res.status(401).json({ message: 'Mật khẩu không đúng' });

        const token = jwt.sign(
            { user_id: user.user_id, email: user.email, fullname: user.fullname },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            token,
            user: { user_id: user.user_id, fullname: user.fullname, email: user.email, avatar_url: user.avatar_url }
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Lấy thông tin user hiện tại
const getMe = async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .input('id', sql.Int, req.user.user_id)
            .query(`SELECT user_id, fullname, email, avatar_url, created_at FROM Users WHERE user_id = @id`);

        if (result.recordset.length === 0)
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

module.exports = { register, login, getMe };