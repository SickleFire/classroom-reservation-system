const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcrypt');
const mysql   = require('mysql2');
const path    = require('path');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);



// ─── DATABASE CONNECTION ─────────────────────────────────────────────────────
const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise();

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────
app.use(session({
    secret:            process.env.SESSION_SECRET || 'classroom_secret_101',
    resave:            false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        sameSite: 'none',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 8  // 8 hours
  }


}));

app.use(express.static(path.join(__dirname, '..', 'Frontend')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const reservationsRoutes = require('./reservations.js')(pool);
app.use(reservationsRoutes);

const teachersRoutes = require('./teachers.js')(pool);
app.use(teachersRoutes);

function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Not logged in.' });
    }
    next();
}

// ─── AUTHENTICATION ROUTES ───────────────────────────────────────────────────

app.get('/session/me', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Not logged in.' });
    }
    res.json(req.session.user);
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials.' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

        const [coords] = await pool.query(
            'SELECT coordinatorID, firstname, lastname FROM coordinators WHERE userID = ?', 
            [user.userID]
        );

        if (coords.length === 0) return res.status(403).json({ message: 'No profile found.' });

        req.session.user = {
            id:            user.userID,
            fullname:      `${coords[0].firstname} ${coords[0].lastname}`,
            coordinatorID: coords[0].coordinatorID
        };
        console.log('Session after login:', req.session.user);
console.log('Session ID:', req.sessionID);
console.log('Cookie settings:', req.session.cookie);
        
        res.json({ message: 'Login successful!', redirect: 'dashboard.html' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Login failed.' });
    }
});

app.get('/admin/users', requireLogin, async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.userID, c.firstname, c.lastname, u.email, u.account_created
            FROM users u
            JOIN coordinators c ON u.userID = c.userID
            ORDER BY u.account_created DESC
        `);
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Failed to load user list.' });
    }
});

app.post('/register/coordinator', async (req, res) => {
    const { firstname, lastname, email, password } = req.body;
    try {
        const [existing] = await pool.query('SELECT userID FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'Email already in use.' });

        const hash = await bcrypt.hash(password, 10);
        const [uResult] = await pool.query(
            'INSERT INTO users (email, password_hash, account_created) VALUES (?, ?, NOW())',
            [email, hash]
        );
        
        await pool.query(
            'INSERT INTO coordinators (firstname, lastname, userID) VALUES (?, ?, ?)',
            [firstname, lastname, uResult.insertId]
        );

        res.json({ message: 'Coordinator registered successfully!' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Failed to register.' });
    }
});

// ─── DATA ROUTES ─────────────────────────────────────────────────────────────

app.get('/schedule/courses', requireLogin, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT courseID, name, description FROM courses ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        console.error('Fetch courses error:', err);
        res.status(500).json({ message: 'Could not load courses.' });
    }
});

app.get('/schedule/available-rooms', requireLogin, async (req, res) => {
    const { starttime, endtime } = req.query;
    try {
        const [rooms] = await pool.query(`
            SELECT classroomID, name, category 
            FROM classrooms 
            WHERE classroomID NOT IN (
                SELECT classroomID FROM implementations 
                WHERE NOT (endtime <= ? OR starttime >= ?)
            )
        `, [starttime, endtime]);
        
        res.json(rooms);
    } catch (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ message: 'Error checking room availability.' });
    }
});

app.post('/reserve', requireLogin, async (req, res) => {
    const { courseID, classroomID, starttime, endtime } = req.body;
    const { coordinatorID } = req.session.user;

    try {
        await pool.query(`
            INSERT INTO implementations 
            (courseID, classroomID, teacherID, starttime, endtime, status, is_onlineclass)
            VALUES (?, ?, ?, ?, ?, 'Approved', 0)
        `, [courseID, classroomID, coordinatorID, starttime, endtime]);

        res.json({ message: 'Schedule created successfully!' });
    } catch (err) {
        console.error('Reservation error:', err);
        res.status(500).json({ message: 'Failed to save the schedule.' });
    }
});

// ─── USER LIST & MANAGEMENT ──────────────────────────────────────────────────

app.get('/admin/users', requireLogin, async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.userID, c.firstname, c.lastname, u.email, u.account_created
            FROM users u
            JOIN coordinators c ON u.userID = c.userID
            ORDER BY u.account_created DESC
        `);
        res.json(users);
    } catch (err) {
        console.error('User list error:', err);
        res.status(500).json({ message: 'Failed to load user list.' });
    }
});

app.delete('/admin/users/:id', requireLogin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM coordinators WHERE userID = ?', [id]);
        await pool.query('DELETE FROM users WHERE userID = ?', [id]);
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ message: 'Failed to delete user.' });
    }
});

// ─── NAVIGATION & SYSTEM ─────────────────────────────────────────────────────

app.get('/dashboard.html', requireLogin, (req, res) => {
    res.sendFile('dashboard.html', { root: path.resolve(__dirname, '..', 'Frontend') });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/index.html');
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '..', 'Frontend', '404.html'));
});

// Initialize and Listen
const PORT = process.env.PORT || 7878;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
});