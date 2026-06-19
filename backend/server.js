const express = require('express');
const cors    = require('cors');
const https   = require('https');
require('dotenv').config();
const { connectDB } = require('./config/db');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// ═══════════════════════════════════════════════════════════
// AI PROXY — chuyển tiếp request tới Google Gemini API (free tier)
// Tránh CORS khi gọi trực tiếp từ browser
// ═══════════════════════════════════════════════════════════
app.post('/api/ai/describe', async (req, res) => {
    const { placeName, location, description } = req.body;

    if (!placeName) return res.status(400).json({ message: 'Thiếu tên địa điểm' });

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
        return res.status(500).json({ message: 'Chưa cấu hình GEMINI_API_KEY trong .env' });
    }

    const prompt = `Bạn là chuyên gia du lịch Việt Nam. Hãy giới thiệu địa điểm sau một cách sinh động, hấp dẫn bằng tiếng Việt.

Địa điểm: ${placeName}
Vị trí: ${location || ''}
${description ? `Mô tả sẵn có: ${description}` : ''}

Viết theo đúng cấu trúc sau, mỗi mục cách nhau 1 dòng trống:

✨ Tổng quan
(2-3 câu ấn tượng, truyền cảm hứng về địa điểm)

🕐 Thời gian lý tưởng
(Mùa nào đẹp nhất, khung giờ nên đến, nên dành bao lâu)

🍜 Ẩm thực đặc sản
(2-3 món nhất định phải thử khi đến đây)

💡 Mẹo du lịch
(2-3 tip thực tế cho người lần đầu đến)

Viết ngắn gọn, thân thiện như người bạn đang kể chuyện. Không dùng markdown ký tự **.`;

    const body = JSON.stringify({
        contents: [
            { role: 'user', parts: [{ text: prompt }] }
        ]
    });

    // Thiết lập SSE headers để stream về browser
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // alt=sse để Gemini trả về dạng SSE (dễ parse từng dòng "data: ...")
    const path = `/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`;

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path,
        method:   'POST',
        headers:  {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(body),
        },
    };

    let sseBuffer   = ''; // giữ phần dòng SSE dở giữa các chunk TCP
    let rawForDebug = ''; // gom raw response để đọc lỗi thật khi status >= 400

    const apiReq = https.request(options, apiRes => {
        console.log(`[AI proxy] Gemini status: ${apiRes.statusCode}`);

        apiRes.on('data', chunk => {
            const chunkStr = chunk.toString();
            rawForDebug += chunkStr;

            // Nếu Gemini trả lỗi (4xx/5xx), body là JSON lỗi thường, không phải SSE
            if (apiRes.statusCode >= 400) return;

            sseBuffer += chunkStr;
            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop(); // giữ lại phần dòng dở cho lần đọc kế tiếp

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (!data) continue;

                try {
                    const json = JSON.parse(data);
                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        res.write(`data: ${JSON.stringify({ text })}\n\n`);
                    }
                } catch (e) {
                    console.error('[AI proxy] Không parse được dòng SSE:', data);
                }
            }
        });

        apiRes.on('end', () => {
            if (apiRes.statusCode >= 400) {
                console.error(`[AI proxy] Gemini trả lỗi ${apiRes.statusCode}:`, rawForDebug);
                let message = `Gemini API lỗi (status ${apiRes.statusCode})`;
                try {
                    const parsed = JSON.parse(rawForDebug);
                    if (parsed.error?.message) message = parsed.error.message;
                } catch {}
                res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
            }
            res.write('data: [DONE]\n\n');
            res.end();
        });

        apiRes.on('error', err => {
            console.error('[AI proxy] Lỗi khi đọc response từ Gemini:', err.message);
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        });
    });

    apiReq.on('error', err => {
        console.error('[AI proxy] Lỗi khi gửi request tới Gemini:', err.message);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
    });

    apiReq.write(body);
    apiReq.end();
});

// ═══════════════════════════════════════════════════════════
// DATABASE ROUTES
// ═══════════════════════════════════════════════════════════
connectDB()
    .then(() => {
        app.get('/api/check', (req, res) => res.send('✅ Server TripGo đang chạy!'));
        app.use('/api', require('./routes/placeRoute'));
        app.use('/api', require('./routes/reviewRoute'));
        app.use('/api', require('./routes/userRoute'));
        app.use('/api', require('./routes/postRoute'));

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
            console.log(`🤖 AI proxy: POST /api/ai/describe`);
        });
    })
    .catch(err => console.error('❌ Lỗi DB:', err.message));

process.on('uncaughtException', err => {
    console.error('Lỗi hệ thống:', err.message);
});