const { sql } = require('../config/db');

// Lấy tất cả địa điểm (có tìm kiếm + phân trang)
const getAllPlaces = async (req, res) => {
    try {
        const { search = '', page = 1, limit = 8 } = req.query;
        const offset = (page - 1) * limit;

        const pool = await sql.connect();
        let query = `
            SELECT p.*, 
                   ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) AS avg_rating,
                   COUNT(r.review_id) AS review_count
            FROM Places p
            LEFT JOIN Reviews r ON p.place_id = r.place_id
            WHERE p.name LIKE @search OR p.location LIKE @search
            GROUP BY p.place_id, p.name, p.location, p.description, p.image_url, p.created_at, p.latitude, p.longitude
            ORDER BY avg_rating DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const result = await pool.request()
            .input('search', sql.NVarChar, `%${search}%`)
            .input('offset', sql.Int, parseInt(offset))
            .input('limit', sql.Int, parseInt(limit))
            .query(query);

        // Đếm tổng số
        const countResult = await pool.request()
            .input('search', sql.NVarChar, `%${search}%`)
            .query(`SELECT COUNT(*) AS total FROM Places WHERE name LIKE @search OR location LIKE @search`);

        res.json({
            places: result.recordset,
            total: countResult.recordset[0].total,
            page: parseInt(page),
            totalPages: Math.ceil(countResult.recordset[0].total / limit)
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Lấy địa điểm nổi bật (top 4 rating cao nhất)
const getFeaturedPlaces = async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request().query(`
            SELECT TOP 4 p.*, 
                   ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) AS avg_rating,
                   COUNT(r.review_id) AS review_count
            FROM Places p
            LEFT JOIN Reviews r ON p.place_id = r.place_id
            GROUP BY p.place_id, p.name, p.location, p.description, p.image_url, p.created_at, p.latitude, p.longitude
            ORDER BY avg_rating DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Lấy chi tiết 1 địa điểm
const getPlaceById = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT p.*, 
                       ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) AS avg_rating,
                       COUNT(r.review_id) AS review_count
                FROM Places p
                LEFT JOIN Reviews r ON p.place_id = r.place_id
                WHERE p.place_id = @id
                GROUP BY p.place_id, p.name, p.location, p.description, p.image_url, p.created_at, p.latitude, p.longitude
            `);

        if (result.recordset.length === 0)
            return res.status(404).json({ message: 'Không tìm thấy địa điểm' });

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};


// Lấy TẤT CẢ địa điểm có tọa độ (dùng cho bản đồ)
const getAllPlacesForMap = async (req, res) => {
    try {
        const { search = '' } = req.query;
        const pool = await sql.connect();
        const result = await pool.request()
            .input('search', sql.NVarChar, `%${search}%`)
            .query(`
                SELECT p.place_id, p.name, p.location, p.image_url,
                       p.latitude, p.longitude,
                       ISNULL(AVG(CAST(r.rating AS FLOAT)), 0) AS avg_rating,
                       COUNT(r.review_id) AS review_count
                FROM Places p
                LEFT JOIN Reviews r ON p.place_id = r.place_id
                WHERE (p.name LIKE @search OR p.location LIKE @search)
                  AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
                GROUP BY p.place_id, p.name, p.location, p.image_url, p.latitude, p.longitude
                ORDER BY avg_rating DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Lấy danh sách rút gọn TẤT CẢ địa điểm (không phân trang) — dùng cho dropdown filter
const getPlacesList = async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request().query(`
            SELECT place_id, name, location FROM Places ORDER BY name ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

module.exports = { getAllPlaces, getFeaturedPlaces, getPlaceById, getAllPlacesForMap, getPlacesList };