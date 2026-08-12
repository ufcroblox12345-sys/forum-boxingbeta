const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

console.log('🚀 СЕРВЕР ЗАПУСКАЕТСЯ...');

// ===== ХРАНИЛИЩЕ В ПАМЯТИ =====
let db = {
    users: [
        { id: 1, username: 'admin', password: 'admin123', role: 'tech_specialist' }
    ],
    servers: [],
    smoking: [],
    nextServerId: 1,
    nextSmokingId: 1
};

// ===== ТЕСТОВЫЙ ЭНДПОИНТ =====
app.get('/load', (req, res) => {
    console.log('📥 GET /load');
    res.json(db);
});

app.post('/save', (req, res) => {
    console.log('📥 POST /save');
    db = { ...db, ...req.body };
    res.json({ success: true });
});

app.post('/register', (req, res) => {
    console.log('📥 POST /register');
    const { username, password } = req.body;
    const user = { id: Date.now(), username, password, role: 'user' };
    db.users.push(user);
    res.json({ success: true, user });
});

app.post('/login', (req, res) => {
    console.log('📥 POST /login');
    const { username, password } = req.body;
    const user = db.users.find(u => u.username === username && u.password === password);
    if (!user) return res.json({ success: false, error: 'Неверные данные' });
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/me', (req, res) => {
    console.log('📥 POST /me');
    const { token } = req.body;
    const user = db.users.find(u => u.id === token);
    if (!user) return res.json({ success: false });
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/set-role', (req, res) => {
    console.log('📥 POST /set-role');
    res.json({ success: true });
});

app.post('/change-password', (req, res) => {
    console.log('📥 POST /change-password');
    res.json({ success: true });
});

app.post('/change-username', (req, res) => {
    console.log('📥 POST /change-username');
    res.json({ success: true });
});

app.post('/edit-topic', (req, res) => {
    console.log('📥 POST /edit-topic');
    res.json({ success: true });
});

app.post('/edit-comment', (req, res) => {
    console.log('📥 POST /edit-comment');
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('✅ СЕРВЕР ЗАПУЩЕН НА ПОРТУ ' + PORT);
});