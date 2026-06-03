const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/db');

const app = express();

// Middleware (Phải đặt TRƯỚC Routes)
app.use(express.json()); 
app.use(cors());

// Khởi động kết nối Database
connectDB()
    .then(() => {
      
        // Thêm vào ngay trên dòng app.use('/api', ...) trong server.js
        app.get('/api/check', (req, res) => res.send("Server đang nhận lệnh trực tiếp!"));
        app.use('/api', require('./routes/placeRoute'));
        app.use('/api', require('./routes/reviewRoute'));
        app.use('/api', require('./routes/userRoute'));
        app.use('/api', require('./routes/postRoute'));


        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ Lỗi DB:', err.message);
    });

// Bắt lỗi toàn cục
process.on('uncaughtException', err => {
    console.error('Lỗi hệ thống:', err.message);
});