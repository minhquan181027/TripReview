const { sql } = require('../config/db');

// Lấy review theo place_id
const getReviewsByPlace = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT r.*, u.fullname, u.avatar_url
                FROM Reviews r
                JOIN Users u ON r.user_id = u.user_id
                WHERE r.place_id = @id
                ORDER BY r.created_at DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Lấy review mới nhất (trang chủ)
const getLatestReviews = async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request().query(`
            SELECT TOP 5 r.*, u.fullname, u.avatar_url, p.name AS place_name
            FROM Reviews r
            JOIN Users u ON r.user_id = u.user_id
            JOIN Places p ON r.place_id = p.place_id
            ORDER BY r.created_at DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Lấy review của user đang đăng nhập
const getMyReviews = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const pool = await sql.connect();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT r.*, p.name AS place_name, p.image_url AS place_image, p.location
                FROM Reviews r
                JOIN Places p ON r.place_id = p.place_id
                WHERE r.user_id = @userId
                ORDER BY r.created_at DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Thêm review mới
const addReview = async (req, res) => {
    try {
        const { place_id, rating, comment } = req.body;
        const userId = req.user.user_id;

        if (!place_id || !rating || !comment)
            return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });

        const pool = await sql.connect();

        // Kiểm tra đã review chưa
        const check = await pool.request()
            .input('userId', sql.Int, userId)
            .input('placeId', sql.Int, place_id)
            .query(`SELECT review_id FROM Reviews WHERE user_id = @userId AND place_id = @placeId`);

        if (check.recordset.length > 0)
            return res.status(400).json({ message: 'Bạn đã đánh giá địa điểm này rồi' });

        await pool.request()
            .input('userId', sql.Int, userId)
            .input('placeId', sql.Int, place_id)
            .input('rating', sql.Int, rating)
            .input('comment', sql.NVarChar, comment)
            .query(`
                INSERT INTO Reviews (user_id, place_id, rating, comment, created_at)
                VALUES (@userId, @placeId, @rating, @comment, GETDATE())
            `);

        res.json({ message: 'Đánh giá thành công!' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Xoá review
const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;
        const pool = await sql.connect();

        const check = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, userId)
            .query(`SELECT review_id FROM Reviews WHERE review_id = @id AND user_id = @userId`);

        if (check.recordset.length === 0)
            return res.status(403).json({ message: 'Không có quyền xoá đánh giá này' });

        await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM Reviews WHERE review_id = @id`);

        res.json({ message: 'Đã xoá đánh giá' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

module.exports = { getReviewsByPlace, getLatestReviews, getMyReviews, addReview, deleteReview };