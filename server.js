const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DB_FILE = 'db.json';

// ===== ЧТЕНИЕ БАЗЫ =====
async function readDB() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        // Если файла нет — создаём с дефолтными данными
        const defaultDB = {
            users: [
                { id: 1, username: 'Vladislav White', password: '678890099', role: 'tech_specialist', customRole: null }
            ],
            servers: [],
            smoking: [],
            customRoles: [
                { id: 'org_train', name: 'Организация *Тренировочный лагерь*', color: '#ff6b00', icon: '🏅', type: 'organization' },
                { id: 'leader', name: 'Лидер', color: '#3498db', icon: '⭐', type: 'leader' },
                { id: 'veteran', name: 'Ветеран', color: '#f39c12', icon: '🎖️', type: 'veteran' }
            ],
            nextServerId: 1,
            nextSmokingId: 1
        };
        await fs.writeFile(DB_FILE, JSON.stringify(defaultDB, null, 2));
        return defaultDB;
    }
}

async function writeDB(db) {
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

console.log('🚀 СЕРВЕР ЗАПУСКАЕТСЯ...');

// ================================================================
// ===== ОСНОВНЫЕ ЭНДПОИНТЫ =====
// ================================================================

// ===== РЕГИСТРАЦИЯ =====
app.post('/register', async (req, res) => {
    console.log('📥 POST /register');
    const db = await readDB();
    const { username, password } = req.body;
    
    if (db.users.find(u => u.username === username)) {
        return res.json({ success: false, error: 'Уже существует' });
    }
    
    const role = db.users.length === 0 ? 'tech_specialist' : 'user';
    const user = { 
        id: Date.now(), 
        username, 
        password, 
        role,
        customRole: null 
    };
    db.users.push(user);
    await writeDB(db);
    res.json({ success: true, user });
});

// ===== ВХОД =====
app.post('/login', async (req, res) => {
    console.log('📥 POST /login');
    const db = await readDB();
    const { username, password } = req.body;
    const user = db.users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        return res.json({ success: false, error: 'Неверные данные' });
    }
    
    res.json({ 
        success: true, 
        user: { 
            id: user.id, 
            username: user.username, 
            role: user.role,
            customRole: user.customRole 
        } 
    });
});

// ===== ПРОВЕРКА СЕССИИ =====
app.post('/me', async (req, res) => {
    console.log('📥 POST /me');
    const db = await readDB();
    const { token } = req.body;
    const user = db.users.find(u => u.id === token);
    
    if (!user) {
        return res.json({ success: false });
    }
    
    res.json({ 
        success: true, 
        user: { 
            id: user.id, 
            username: user.username, 
            role: user.role,
            customRole: user.customRole 
        } 
    });
});

// ===== ПОЛУЧИТЬ ПОЛЬЗОВАТЕЛЕЙ =====
app.post('/users', async (req, res) => {
    console.log('📥 POST /users');
    const db = await readDB();
    const { token } = req.body;
    const user = db.users.find(u => u.id === token);
    
    if (!user || (user.role !== 'tech_specialist' && user.role !== 'senior_admin')) {
        return res.json({ error: 'Доступ запрещён' });
    }
    
    res.json(db.users);
});

// ===== ИЗМЕНИТЬ РОЛЬ =====
app.post('/set-role', async (req, res) => {
    console.log('📥 POST /set-role');
    const db = await readDB();
    const { token, targetId, newRole } = req.body;
    
    const admin = db.users.find(u => u.id === token);
    if (!admin || (admin.role !== 'tech_specialist' && admin.role !== 'senior_admin')) {
        return res.json({ error: 'Доступ запрещён' });
    }
    
    const target = db.users.find(u => u.id === targetId);
    if (!target) return res.json({ error: 'Пользователь не найден' });
    if (target.username === admin.username) {
        return res.json({ error: 'Нельзя изменить себя' });
    }
    if (target.role === 'tech_specialist' && admin.role !== 'tech_specialist') {
        return res.json({ error: 'Нельзя изменить Техспециалиста' });
    }
    
    target.role = newRole;
    await writeDB(db);
    res.json({ success: true });
});

// ===== СМЕНА ПАРОЛЯ =====
app.post('/change-password', async (req, res) => {
    console.log('📥 POST /change-password');
    const db = await readDB();
    const { token, targetId, newPassword } = req.body;
    
    const admin = db.users.find(u => u.id === token);
    if (!admin || (admin.role !== 'tech_specialist' && admin.role !== 'senior_admin')) {
        return res.json({ error: 'Доступ запрещён' });
    }
    
    const target = db.users.find(u => u.id === targetId);
    if (!target) return res.json({ error: 'Пользователь не найден' });
    if (target.role === 'tech_specialist' && admin.role !== 'tech_specialist') {
        return res.json({ error: 'Нельзя менять пароль Техспециалиста' });
    }
    
    target.password = newPassword;
    await writeDB(db);
    res.json({ success: true });
});

// ===== СМЕНА ИМЕНИ =====
app.post('/change-username', async (req, res) => {
    console.log('📥 POST /change-username');
    const db = await readDB();
    const { token, targetId, newUsername } = req.body;
    
    const admin = db.users.find(u => u.id === token);
    if (!admin || (admin.role !== 'tech_specialist' && admin.role !== 'senior_admin')) {
        return res.json({ error: 'Доступ запрещён' });
    }
    
    const target = db.users.find(u => u.id === targetId);
    if (!target) return res.json({ error: 'Пользователь не найден' });
    if (db.users.find(u => u.username === newUsername && u.id !== targetId)) {
        return res.json({ error: 'Имя уже занято' });
    }
    
    const oldUsername = target.username;
    target.username = newUsername;
    
    // Обновляем имя во всех темах и комментариях
    db.servers.forEach(server => {
        server.categories?.forEach(category => {
            category.topics?.forEach(topic => {
                if (topic.author === oldUsername) topic.author = newUsername;
                topic.comments?.forEach(comment => {
                    if (comment.author === oldUsername) comment.author = newUsername;
                    if (comment.customRole) comment.customRole = comment.customRole;
                });
            });
        });
    });
    db.smoking.forEach(topic => {
        if (topic.author === oldUsername) topic.author = newUsername;
        topic.comments?.forEach(comment => {
            if (comment.author === oldUsername) comment.author = newUsername;
        });
    });
    
    await writeDB(db);
    res.json({ success: true });
});

// ===== РЕДАКТИРОВАТЬ ТЕМУ =====
app.post('/edit-topic', async (req, res) => {
    console.log('📥 POST /edit-topic');
    const db = await readDB();
    const { token, topicId, title, content, status } = req.body;
    const user = db.users.find(u => u.id === token);
    if (!user) return res.json({ error: 'Не авторизован' });
    
    let topic = null;
    let topicSource = null;
    
    for (const server of db.servers) {
        for (const category of server.categories || []) {
            const found = category.topics?.find(t => t.id === topicId);
            if (found) { topic = found; topicSource = 'server'; break; }
        }
        if (topic) break;
    }
    if (!topic) {
        topic = db.smoking.find(t => t.id === topicId);
        if (topic) topicSource = 'smoking';
    }
    if (!topic) return res.json({ error: 'Тема не найдена' });
    
    const isAdmin = ['tech_specialist', 'senior_admin', 'admin'].includes(user.role);
    const isAuthor = topic.author === user.username;
    if (!isAuthor && !isAdmin) {
        return res.json({ error: 'Нет прав на редактирование' });
    }
    
    if (title) topic.title = title;
    if (content) topic.content = content;
    if (status && isAdmin) topic.status = status;
    topic.edited = true;
    topic.editedAt = Date.now();
    
    await writeDB(db);
    res.json({ success: true });
});

// ===== РЕДАКТИРОВАТЬ КОММЕНТАРИЙ =====
app.post('/edit-comment', async (req, res) => {
    console.log('📥 POST /edit-comment');
    const db = await readDB();
    const { token, topicId, commentIndex, text } = req.body;
    const user = db.users.find(u => u.id === token);
    if (!user) return res.json({ error: 'Не авторизован' });
    
    let comments = null;
    let topic = null;
    
    for (const server of db.servers) {
        for (const category of server.categories || []) {
            const found = category.topics?.find(t => t.id === topicId);
            if (found && found.comments && found.comments[commentIndex]) {
                comments = found.comments;
                topic = found;
                break;
            }
        }
        if (comments) break;
    }
    if (!comments) {
        const found = db.smoking.find(t => t.id === topicId);
        if (found && found.comments && found.comments[commentIndex]) {
            comments = found.comments;
            topic = found;
        }
    }
    if (!comments) return res.json({ error: 'Комментарий не найден' });
    
    const comment = comments[commentIndex];
    const isAdmin = ['tech_specialist', 'senior_admin', 'admin'].includes(user.role);
    const isAuthor = comment.author === user.username;
    if (!isAuthor && !isAdmin) {
        return res.json({ error: 'Нет прав на редактирование' });
    }
    
    comment.text = text;
    comment.edited = true;
    comment.editedAt = Date.now();
    
    await writeDB(db);
    res.json({ success: true });
});

// ===== СОХРАНИТЬ ВСЁ =====
app.post('/save', async (req, res) => {
    console.log('📥 POST /save');
    const db = await readDB();
    const data = req.body;
    
    db.users = data.users || db.users;
    db.servers = data.servers || db.servers;
    db.smoking = data.smoking || db.smoking;
    db.nextServerId = data.nextServerId || db.nextServerId;
    db.nextSmokingId = data.nextSmokingId || db.nextSmokingId;
    
    await writeDB(db);
    res.json({ success: true });
});

// ===== ЗАГРУЗИТЬ ВСЁ =====
app.get('/load', async (req, res) => {
    console.log('📥 GET /load');
    const db = await readDB();
    res.json(db);
});

// ================================================================
// ===== НОВЫЕ ЭНДПОИНТЫ ДЛЯ КАСТОМНЫХ РОЛЕЙ =====
// ================================================================

// ===== ПОЛУЧИТЬ ВСЕ РОЛИ =====
app.get('/custom-roles', async (req, res) => {
    console.log('📥 GET /custom-roles');
    const db = await readDB();
    res.json(db.customRoles || []);
});

// ===== СОЗДАТЬ НОВУЮ РОЛЬ =====
app.post('/create-role', async (req, res) => {
    console.log('📥 POST /create-role');
    const db = await readDB();
    const { token, name, color, icon, type } = req.body;
    
    const user = db.users.find(u => u.id === token);
    if (!user || (user.role !== 'tech_specialist' && user.role !== 'senior_admin')) {
        return res.json({ error: 'Доступ запрещён' });
    }
    
    // Проверяем, нет ли уже такой роли
    if (db.customRoles?.find(r => r.name === name)) {
        return res.json({ error: 'Роль с таким именем уже существует' });
    }
    
    const newRole = {
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now(),
        name: name,
        color: color || '#888888',
        icon: icon || '🔹',
        type: type || 'custom'
    };
    
    if (!db.customRoles) db.customRoles = [];
    db.customRoles.push(newRole);
    await writeDB(db);
    res.json({ success: true, role: newRole });
});

// ===== УДАЛИТЬ РОЛЬ =====
app.post('/delete-role', async (req, res) => {
    console.log('📥 POST /delete-role');
    const db = await readDB();
    const { token, roleId } = req.body;
    
    const user = db.users.find(u => u.id === token);
    if (!user || (user.role !== 'tech_specialist' && user.role !== 'senior_admin')) {
        return res.json({ error: 'Доступ запрещён' });
    }
    
    // Удаляем роль у всех пользователей
    db.users.forEach(u => {
        if (u.customRole === roleId) u.customRole = null;
    });
    
    db.customRoles = db.customRoles.filter(r => r.id !== roleId);
    await writeDB(db);
    res.json({ success: true });
});

// ===== НАЗНАЧИТЬ КАСТОМНУЮ РОЛЬ ПОЛЬЗОВАТЕЛЮ =====
app.post('/assign-custom-role', async (req, res) => {
    console.log('📥 POST /assign-custom-role');
    const db = await readDB();
    const { token, targetId, customRoleId } = req.body;
    
    const user = db.users.find(u => u.id === token);
    if (!user || (user.role !== 'tech_specialist' && user.role !== 'senior_admin')) {
        return res.json({ error: 'Доступ запрещён' });
    }
    
    const target = db.users.find(u => u.id === targetId);
    if (!target) return res.json({ error: 'Пользователь не найден' });
    
    // Проверяем, что роль существует (если не null)
    if (customRoleId) {
        const roleExists = db.customRoles?.find(r => r.id === customRoleId);
        if (!roleExists) return res.json({ error: 'Роль не найдена' });
    }
    
    target.customRole = customRoleId || null;
    await writeDB(db);
    res.json({ success: true });
});

// ===== ОБНОВИТЬ РОЛЬ (изменить цвет/иконку) =====
app.post('/update-role', async (req, res) => {
    console.log('📥 POST /update-role');
    const db = await readDB();
    const { token, roleId, name, color, icon } = req.body;
    
    const user = db.users.find(u => u.id === token);
    if (!user || (user.role !== 'tech_specialist' && user.role !== 'senior_admin')) {
        return res.json({ error: 'Доступ запрещён' });
    }
    
    const role = db.customRoles?.find(r => r.id === roleId);
    if (!role) return res.json({ error: 'Роль не найдена' });
    
    if (name) role.name = name;
    if (color) role.color = color;
    if (icon) role.icon = icon;
    
    await writeDB(db);
    res.json({ success: true });
});
    
     // ================================================================
// ===== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ =====
// ================================================================

// ===== ПОЛУЧИТЬ ПРОФИЛЬ =====
app.get('/profile/:userId', async (req, res) => {
    console.log('📥 GET /profile/' + req.params.userId);
    const db = await readDB();
    const userId = parseInt(req.params.userId);
    const user = db.users.find(u => u.id === userId);
    
    if (!user) {
        return res.json({ error: 'Пользователь не найден' });
    }
    
    // Возвращаем профиль без пароля
    res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        customRole: user.customRole,
        avatar: user.avatar || null,
        status: user.status || 'online',
        about: user.about || '',
        city: user.city || '',
        registeredAt: user.registeredAt || Date.now(),
        lastSeen: user.lastSeen || Date.now()
    });
});

// ===== ОБНОВИТЬ ПРОФИЛЬ =====
app.post('/update-profile', async (req, res) => {
    console.log('📥 POST /update-profile');
    const db = await readDB();
    const { token, avatar, status, about, city } = req.body;
    
    const user = db.users.find(u => u.id === token);
    if (!user) {
        return res.json({ error: 'Пользователь не найден' });
    }
    
    if (avatar !== undefined) user.avatar = avatar;
    if (status !== undefined) user.status = status;
    if (about !== undefined) user.about = about;
    if (city !== undefined) user.city = city;
    user.lastSeen = Date.now();
    
    await writeDB(db);
    res.json({ success: true, user });
});

// ===== ЗАГРУЗИТЬ АВАТАРКУ (base64) =====
app.post('/upload-avatar', async (req, res) => {
    console.log('📥 POST /upload-avatar');
    const db = await readDB();
    const { token, image } = req.body;
    
    const user = db.users.find(u => u.id === token);
    if (!user) {
        return res.json({ error: 'Пользователь не найден' });
    }
    
    // Ограничиваем размер (макс 2MB)
    if (image && image.length > 2 * 1024 * 1024) {
        return res.json({ error: 'Аватарка слишком большая (макс 2MB)' });
    }
    
    user.avatar = image;
    user.lastSeen = Date.now();
    await writeDB(db);
    res.json({ success: true, avatar: image });
});

// ================================================================
// ===== ЗАПУСК СЕРВЕРА =====
// ================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('✅ СЕРВЕР ЗАПУЩЕН НА ПОРТУ ' + PORT);
    console.log('📦 Данные хранятся в db.json');
    console.log('👑 Админ: admin / admin123');
});