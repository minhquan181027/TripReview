const { sql } = require('../config/db');

// ─── Query helper: lấy full post data (dùng lại nhiều nơi) ───────────────────
const POST_SELECT = `
    SELECT
        p.post_id,
        p.content,
        p.image_url,
        p.created_at,
        -- Tác giả
        u.user_id    AS author_id,
        u.fullname   AS author_name,
        u.avatar_url AS author_avatar,
        -- Tag địa điểm
        pl.place_id,
        pl.name      AS place_name,
        pl.location  AS place_location,
        -- Tổng likes
        (SELECT COUNT(*) FROM PostLikes   l WHERE l.post_id = p.post_id) AS like_count,
        -- Tổng comments
        (SELECT COUNT(*) FROM PostComments c WHERE c.post_id = p.post_id) AS comment_count
    FROM Posts p
    JOIN Users u ON p.user_id = u.user_id
    LEFT JOIN Places pl ON p.place_id = pl.place_id
`;

// Lấy danh sách bài đăng (feed chính, phân trang)
const getFeed = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const pool = await sql.connect();

        // Lấy user_id nếu có token (để biết đã like chưa)
        const userId = req.user?.user_id || 0;

        const result = await pool.request()
            .input('offset', sql.Int, parseInt(offset))
            .input('limit',  sql.Int, parseInt(limit))
            .input('userId', sql.Int, userId)
            .query(`
                SELECT
                    p.post_id,
                    p.content,
                    p.image_url,
                    p.created_at,
                    u.user_id    AS author_id,
                    u.fullname   AS author_name,
                    u.avatar_url AS author_avatar,
                    pl.place_id,
                    pl.name      AS place_name,
                    pl.location  AS place_location,
                    (SELECT COUNT(*) FROM PostLikes   l WHERE l.post_id = p.post_id) AS like_count,
                    (SELECT COUNT(*) FROM PostComments c WHERE c.post_id = p.post_id) AS comment_count,
                    CASE WHEN EXISTS (
                        SELECT 1 FROM PostLikes lk WHERE lk.post_id = p.post_id AND lk.user_id = @userId
                    ) THEN 1 ELSE 0 END AS is_liked
                FROM Posts p
                JOIN Users u ON p.user_id = u.user_id
                LEFT JOIN Places pl ON p.place_id = pl.place_id
                ORDER BY p.created_at DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `);

        const total = await pool.request().query(`SELECT COUNT(*) AS total FROM Posts`);

        res.json({
            posts: result.recordset,
            total: total.recordset[0].total,
            page: parseInt(page),
            totalPages: Math.ceil(total.recordset[0].total / limit)
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Lấy 1 bài đăng theo ID
const getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.user_id || 0;
        const pool = await sql.connect();

        const post = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, userId)
            .query(`
                SELECT
                    p.post_id, p.content, p.image_url, p.created_at,
                    u.user_id AS author_id, u.fullname AS author_name, u.avatar_url AS author_avatar,
                    pl.place_id, pl.name AS place_name, pl.location AS place_location,
                    (SELECT COUNT(*) FROM PostLikes   l WHERE l.post_id = p.post_id) AS like_count,
                    (SELECT COUNT(*) FROM PostComments c WHERE c.post_id = p.post_id) AS comment_count,
                    CASE WHEN EXISTS (
                        SELECT 1 FROM PostLikes lk WHERE lk.post_id = p.post_id AND lk.user_id = @userId
                    ) THEN 1 ELSE 0 END AS is_liked
                FROM Posts p
                JOIN Users u ON p.user_id = u.user_id
                LEFT JOIN Places pl ON p.place_id = pl.place_id
                WHERE p.post_id = @id
            `);

        if (!post.recordset.length)
            return res.status(404).json({ message: 'Không tìm thấy bài đăng' });

        res.json(post.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Đăng bài mới
const createPost = async (req, res) => {
    try {
        const { content, image_url, place_id } = req.body;
        const userId = req.user.user_id;

        if (!content || content.trim().length === 0)
            return res.status(400).json({ message: 'Nội dung bài đăng không được trống' });
        if (content.trim().length > 2000)
            return res.status(400).json({ message: 'Nội dung không được vượt quá 2000 ký tự' });

        const pool = await sql.connect();
        const result = await pool.request()
            .input('userId',   sql.Int,      userId)
            .input('content',  sql.NVarChar,  content.trim())
            .input('imageUrl', sql.NVarChar,  image_url || null)
            .input('placeId',  sql.Int,       place_id  || null)
            .query(`
                INSERT INTO Posts (user_id, content, image_url, place_id)
                OUTPUT INSERTED.post_id
                VALUES (@userId, @content, @imageUrl, @placeId)
            `);

        const newPostId = result.recordset[0].post_id;

        // Trả về full post object
        const newPost = await pool.request()
            .input('id',     sql.Int, newPostId)
            .input('userId', sql.Int, userId)
            .query(`
                SELECT
                    p.post_id, p.content, p.image_url, p.created_at,
                    u.user_id AS author_id, u.fullname AS author_name, u.avatar_url AS author_avatar,
                    pl.place_id, pl.name AS place_name, pl.location AS place_location,
                    0 AS like_count, 0 AS comment_count, 0 AS is_liked
                FROM Posts p
                JOIN Users u ON p.user_id = u.user_id
                LEFT JOIN Places pl ON p.place_id = pl.place_id
                WHERE p.post_id = @id
            `);

        res.status(201).json({ message: 'Đăng bài thành công!', post: newPost.recordset[0] });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Xoá bài đăng
const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;
        const pool = await sql.connect();

        const check = await pool.request()
            .input('id',     sql.Int, id)
            .input('userId', sql.Int, userId)
            .query(`SELECT post_id FROM Posts WHERE post_id = @id AND user_id = @userId`);

        if (!check.recordset.length)
            return res.status(403).json({ message: 'Không có quyền xoá bài này' });

        await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM Posts WHERE post_id = @id`);

        res.json({ message: 'Đã xoá bài đăng' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Toggle like/unlike
const toggleLike = async (req, res) => {
    try {
        const { id } = req.params;         // post_id
        const userId = req.user.user_id;
        const pool = await sql.connect();

        const existing = await pool.request()
            .input('postId', sql.Int, id)
            .input('userId', sql.Int, userId)
            .query(`SELECT like_id FROM PostLikes WHERE post_id = @postId AND user_id = @userId`);

        let liked;
        if (existing.recordset.length) {
            // Đã like → unlike
            await pool.request()
                .input('postId', sql.Int, id)
                .input('userId', sql.Int, userId)
                .query(`DELETE FROM PostLikes WHERE post_id = @postId AND user_id = @userId`);
            liked = false;
        } else {
            // Chưa like → like
            await pool.request()
                .input('postId', sql.Int, id)
                .input('userId', sql.Int, userId)
                .query(`INSERT INTO PostLikes (post_id, user_id) VALUES (@postId, @userId)`);
            liked = true;
        }

        const countRes = await pool.request()
            .input('postId', sql.Int, id)
            .query(`SELECT COUNT(*) AS total FROM PostLikes WHERE post_id = @postId`);

        res.json({ liked, like_count: countRes.recordset[0].total });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Lấy comments của bài đăng
const getComments = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect();

        const result = await pool.request()
            .input('postId', sql.Int, id)
            .query(`
                SELECT
                    c.comment_id, c.content, c.created_at,
                    u.user_id, u.fullname, u.avatar_url
                FROM PostComments c
                JOIN Users u ON c.user_id = u.user_id
                WHERE c.post_id = @postId
                ORDER BY c.created_at ASC
            `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Thêm comment
const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.user_id;

        if (!content || content.trim().length === 0)
            return res.status(400).json({ message: 'Bình luận không được trống' });

        const pool = await sql.connect();

        const result = await pool.request()
            .input('postId',  sql.Int,     id)
            .input('userId',  sql.Int,     userId)
            .input('content', sql.NVarChar, content.trim())
            .query(`
                INSERT INTO PostComments (post_id, user_id, content)
                OUTPUT INSERTED.comment_id, INSERTED.created_at
                VALUES (@postId, @userId, @content)
            `);

        const { comment_id, created_at } = result.recordset[0];

        // Lấy thêm thông tin user để trả về
        const user = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`SELECT fullname, avatar_url FROM Users WHERE user_id = @userId`);

        res.status(201).json({
            message: 'Bình luận thành công!',
            comment: {
                comment_id,
                content: content.trim(),
                created_at,
                user_id: userId,
                fullname: user.recordset[0].fullname,
                avatar_url: user.recordset[0].avatar_url
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Xoá comment
const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.user_id;
        const pool = await sql.connect();

        const check = await pool.request()
            .input('id',     sql.Int, commentId)
            .input('userId', sql.Int, userId)
            .query(`SELECT comment_id FROM PostComments WHERE comment_id = @id AND user_id = @userId`);

        if (!check.recordset.length)
            return res.status(403).json({ message: 'Không có quyền xoá bình luận này' });

        await pool.request()
            .input('id', sql.Int, commentId)
            .query(`DELETE FROM PostComments WHERE comment_id = @id`);

        res.json({ message: 'Đã xoá bình luận' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

module.exports = { getFeed, getPostById, createPost, deletePost, toggleLike, getComments, addComment, deleteComment };