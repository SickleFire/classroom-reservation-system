const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt')
require('dotenv').config();
const mysql = require('mysql2').createPool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise();
const path = require('path');
const app  = express();
 
// Serve static HTML files from Frontend folder
app.use(express.static(path.join(__dirname, '..', 'Frontend')));
 
// Parse form data
app.use(express.urlencoded({ extended: true }));
 
// Parse JSON
app.use(express.json());

// Use Sessions
app.use(session({
    secret: 'supersecretkey',   // change this to a strong secret
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }   // set secure:true if using HTTPS
}));
 
// Create reservations table on startup
async function initDB() {
    try {
        await mysql.query(`
            CREATE TABLE IF NOT EXISTS reservations (
                room_name TEXT NOT NULL,
                time      TEXT NOT NULL
            )
        `);
        await mysql.query(`
            CREATE TABLE IF NOT EXISTS users (
                firstname TEXT NOT NULL,
                lastname  TEXT NOT NULL,
                email     TEXT NOT NULL,
                password  TEXT NOT NULL
            )
        `);
        console.log('Reservations table ready.');
    } catch (err) {
        console.error('DB init error:', err);
    }
}
 
// GET / → serves index.html (handled by express.static above)
// GET /about → serves about.html (handled by express.static above)
 
// POST /reserve → insert reservation into MySQL
app.post('/reserve', async (req, res) => {
    const { room, time } = req.body;
 
    console.log(`Parsed reservation: room=${room} time=${time}`);
 
    try {
        await mysql.query(
            'INSERT INTO reservations (room_name, time) VALUES (?, ?)',
            [room, time]
        );
        res.send(`<h1>Reservation received for room ${room} at ${time}</h1>`);
 
    } catch (err) {
        console.error('Insert error:', err);
        res.status(500).send('<h1>Something went wrong.</h1>');
    }
});

app.post('/login', async (req, res) => {
    const { email, password} = req.body;
    console.log(`Parsed Information: email=${email} password=${password}`);
    if (email === 'admin' && password === 'lumecraft') {
        req.session.user = {email: 'admin'};
        res.redirect('dashboard.html');
    }else if (email !== '' && password !== '') {
        //User Authentication MySQL
        try {
            const [rows] = await mysql.query('SELECT password FROM users WHERE email = ?', [email]);
            if (rows.length === 0) {
                return res.status(401).send('Invalid email or password');
            }
            const user = rows[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                req.session.user = {email};
                res.redirect('/dashboard.html'); // send to dashboard
            } else {
                res.status(401).send('Invalid email or password');
            }
        }catch (err){
            res.status(500).send('Error logging in: ' + err.message);
        }
    } 
    else {
        res.status(401).send('Invalid credentials');
    }
})

app.post('/register', async(req, res) =>{
    const {fullname, email, password, confirm_password} = req.body;
    console.log(`/Parsed Information: firstname=${fullname} email=${email} password=${password} confirm_password=${confirm_password}`);
    if (password !== confirm_password) {
        return res.status(400).send('Passwords do not match');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await mysql.query(
            'INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)',
            [fullname, email, hashedPassword]
        );
        res.send('Registration successful! You can now log in.');
    } catch (err) {
        res.status(500).send('Error registering user: ' + err.message);
    }
})

// ─── GET COURSES (for registerclass.html dropdown) ───────────────────────────

app.get('/schedule/courses', async (req, res) => {
    try {
        const [courses] = await mysql.query(
            'SELECT courseID, name, description FROM Courses'
        );
        res.json(courses);
    } catch (err) {
        console.error('Courses error:', err);
        res.status(500).json({ message: 'Failed to load courses.' });
    }
});

// ─── GET AVAILABLE ROOMS (for registerclass.html dropdown) ───────────────────

app.get('/schedule/available-rooms', async (req, res) => {
    const { starttime, endtime } = req.query;

    if (!starttime || !endtime) {
        return res.status(400).json({ message: 'Start time and end time are required.' });
    }

    try {
        const [rooms] = await mysql.query(`
            SELECT c.classroomID, c.name, c.category, c.description, c.BYOD
            FROM Classrooms c
            WHERE c.is_available = 1
            AND c.classroomID NOT IN (
                SELECT i.classroomID
                FROM Implementations i
                WHERE i.status IN ('Pending', 'Approved')
                AND i.starttime < ?
                AND i.endtime   > ?
            )
        `, [endtime, starttime]);

        res.json(rooms);
    } catch (err) {
        console.error('Available rooms error:', err);
        res.status(500).json({ message: 'Failed to fetch available rooms.' });
    }
});

app.get('/dashboard.html', requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Frontend', 'dashboard.html'));
});
// ─── POST REQUESTS (student submits room request) ─────────────────────────────

app.post('/requests', async (req, res) => {
    const { studentID, courseID, classroomID, starttime, endtime } = req.body;

    if (!studentID || !courseID || !classroomID || !starttime || !endtime) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const [conflicts] = await mysql.query(`
            SELECT implementationID FROM Implementations
            WHERE classroomID = ?
            AND status IN ('Pending', 'Approved')
            AND starttime < ?
            AND endtime   > ?
        `, [classroomID, endtime, starttime]);

        if (conflicts.length > 0) {
            return res.status(409).json({ message: 'Room is already taken for that time slot.' });
        }

        await mysql.query(`
            INSERT INTO Implementations
                (courseID, is_onlineclass, starttime, endtime, teacherID, classroomID, status, requested_by)
            VALUES (?, 0, ?, ?, NULL, ?, 'Pending', ?)
        `, [courseID, starttime, endtime, classroomID, studentID]);

        res.json({ message: 'Room request submitted successfully! Waiting for approval.' });

    } catch (err) {
        console.error('Request error:', err);
        res.status(500).json({ message: 'Failed to submit request.' });
    }
});

// ─── GET ALL USERS (for userlist.html) ───────────────────────────────────────

app.get('/admin/users', async (req, res) => {
    try {
        const [users] = await mysql.query(`
            SELECT
                u.userID,
                u.fullname,
                u.email,
                u.account_created,
                s.studentID,
                t.teacherID
            FROM Users u
            LEFT JOIN Students s ON u.userID = s.userID
            LEFT JOIN Teachers t ON u.userID = t.userID
            ORDER BY u.account_created DESC
        `);
        res.json(users);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ message: 'Failed to load users.' });
    }
});

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login.html');
    }
    next();
}

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '..', 'Frontend', '404.html'));
});
 
// Start server on port 7878
initDB().then(() => {
    app.listen(7878, '127.0.0.1', () => {
        console.log('Server running on http://127.0.0.1:7878');
    });
});