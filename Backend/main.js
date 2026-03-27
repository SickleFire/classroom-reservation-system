const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcrypt');
const mysql   = require('mysql2');
require('dotenv').config();

const path = require('path');
const app  = express();

const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise();

app.use(session({
    secret:            process.env.SESSION_SECRET || '101',
    resave:            false,
    saveUninitialized: false,
    cookie:            { secure: false }
}));

// Import the updated reservations routes
const reservationsRoutes = require('./reservations.js')(pool);

function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/index.html');
    }
    next();
}

app.use(express.static(path.join(__dirname, '..', 'Frontend')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Apply the reservations routes
app.use(reservationsRoutes);

// ─── AUTHENTICATION ──────────────────────────────────────────────────────────

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

        if (coords.length === 0) return res.status(403).json({ message: 'Access denied.' });

        req.session.user = {
            id: user.userID,
            fullname: `${coords[0].firstname} ${coords[0].lastname}`,
            coordinatorID: coords[0].coordinatorID
        };

        res.json({ message: 'Login successful!', redirect: 'dashboard.html' });
    } catch (err) {
        res.status(500).json({ message: 'Login error.' });
    }
});

app.get('/session/me', (req, res) => {
    if (!req.session.user) return res.status(401).json({ message: 'Not logged in' });
    res.json(req.session.user);
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/index.html');
    });
});

app.listen(7878, '127.0.0.1', () => {
    console.log('Server running on http://127.0.0.1:7878');
});