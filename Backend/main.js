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

const reservationsRoutes = require('./reservations.js')(pool);

function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/index.html');
    }
    next();
}

app.get('/dashboard.html', requireLogin, (req, res) => {
    res.sendFile('dashboard.html', {
        root: path.resolve(__dirname, '..', 'Frontend')
    }, (err) => {
        if (err) {
            console.error('SendFile error:', err);
            res.status(404).send('Could not find dashboard.html');
        }
    });
});

// Serve static HTML files from Frontend folder
app.use(express.static(path.join(__dirname, '..', 'Frontend')));

// Parse form data
app.use(express.urlencoded({ extended: true }));

// Parse JSON
app.use(express.json());

// Reservations routes
app.use(reservationsRoutes);

// Create tables on startup
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reservations (
                room_name TEXT NOT NULL,
                time      TEXT NOT NULL
            )
        `);
        console.log('Database tables ready.');
    } catch (err) {
        console.error('DB init error:', err);
    }
}

// ─── GET SESSION INFO ─────────────────────────────────────────────────────────

app.get('/session/me', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Not logged in.' });
    }
    res.json({
        role:      req.session.user.role,
        fullname:  req.session.user.fullname,
        studentID: req.session.user.studentID || null,
        teacherID: req.session.user.teacherID || null
    });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt:', req.body);

    try {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ?', [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user  = rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const [students] = await pool.query(
            'SELECT studentID FROM students WHERE userID = ?', [user.userID]
        );
        const [teachers] = await pool.query(
            'SELECT teacherID FROM teachers WHERE userID = ?', [user.userID]
        );

        let role      = 'admin';
        let studentID = null;
        let teacherID = null;

        if (students.length > 0) {
            role      = 'student';
            studentID = students[0].studentID;
        } else if (teachers.length > 0) {
            role      = 'teacher';
            teacherID = teachers[0].teacherID;
        }

        req.session.user = {
            id:        user.userID,
            fullname:  user.fullname,
            role,
            studentID,
            teacherID
        };

        req.session.save(err => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ message: 'Session sync failed.' });
            }
            res.json({
                message:  'Login successful!',
                fullname: user.fullname,
                redirect: 'dashboard.html'
            });
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Login failed: ' + err.message });
    }
});

// ─── REGISTER STUDENT ────────────────────────────────────────────────────────

app.post('/register/student', async (req, res) => {
    const { firstname, lastname, phone, email, password } = req.body;

    try {
        const [existing] = await pool.query(
            'SELECT userID FROM users WHERE email = ?', [email]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [userResult] = await pool.query(
            'INSERT INTO users (fullname, email, password, account_created) VALUES (?, ?, ?, NOW())',
            [`${firstname} ${lastname}`, email, hashedPassword]
        );
        const userID = userResult.insertId;

        const [countResult] = await pool.query('SELECT COUNT(*) AS count FROM students');
        const nextNum   = countResult[0].count + 1;
        const studentID = `2026${String(nextNum).padStart(3, '0')}-S`;

        await pool.query(
            'INSERT INTO students (studentID, firstname, lastname, phone, userID) VALUES (?, ?, ?, ?, ?)',
            [studentID, firstname, lastname, phone, userID]
        );

        res.json({ message: 'Registered successfully!', studentID });

    } catch (err) {
        console.error('Student register error:', err);
        res.status(500).json({ message: 'Registration failed: ' + err.message });
    }
});

// ─── REGISTER TEACHER ────────────────────────────────────────────────────────

app.post('/register/teacher', async (req, res) => {
    const { firstname, lastname, phone, email, password } = req.body;

    try {
        const [existing] = await pool.query(
            'SELECT userID FROM users WHERE email = ?', [email]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [userResult] = await pool.query(
            'INSERT INTO users (fullname, email, password, account_created) VALUES (?, ?, ?, NOW())',
            [`${firstname} ${lastname}`, email, hashedPassword]
        );
        const userID = userResult.insertId;

        const [countResult] = await pool.query('SELECT COUNT(*) AS count FROM teachers');
        const nextNum   = countResult[0].count + 1;
        const teacherID = String(nextNum).padStart(3, '0');

        await pool.query(
            'INSERT INTO teachers (teacherID, firstname, lastname, phone, userID) VALUES (?, ?, ?, ?, ?)',
            [teacherID, firstname, lastname, phone, userID]
        );

        res.json({ message: 'Registered successfully!', teacherID });

    } catch (err) {
        console.error('Teacher register error:', err);
        res.status(500).json({ message: 'Registration failed: ' + err.message });
    }
});

// ─── GET COURSES ─────────────────────────────────────────────────────────────

app.get('/schedule/courses', async (req, res) => {
    try {
        const [courses] = await pool.query(
            'SELECT courseID, name, description FROM Courses'
        );
        res.json(courses);
    } catch (err) {
        console.error('Courses error:', err);
        res.status(500).json({ message: 'Failed to load courses.' });
    }
});

// ─── GET AVAILABLE ROOMS ──────────────────────────────────────────────────────

app.get('/schedule/available-rooms', async (req, res) => {
    const { starttime, endtime } = req.query;

    if (!starttime || !endtime) {
        return res.status(400).json({ message: 'Start time and end time are required.' });
    }

    try {
        const [rooms] = await pool.query(`
            SELECT c.classroomID, c.name, c.category, c.description, c.BYOD
            FROM Classrooms c
            WHERE c.is_available = 1
            AND c.classroomID NOT IN (
                SELECT i.classroomID
                FROM implementations i
                WHERE i.status IN ('Pending', 'Approved')
                AND NOT (i.endtime <= ? OR i.starttime >= ?)
            )
        `, [starttime, endtime]);

        res.json(rooms);
    } catch (err) {
        console.error('Available rooms error:', err);
        res.status(500).json({ message: 'Failed to fetch available rooms.' });
    }
});

// ─── POST REQUESTS ────────────────────────────────────────────────────────────
// Handles Student, Teacher, and Admin room requests

app.post('/requests', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Not logged in.' });
    }

    const { courseID, classroomID, starttime, endtime } = req.body;
    const role      = req.session.user.role;
    const studentID = req.session.user.studentID || null;
    const teacherID = req.session.user.teacherID || null;

    if (!courseID || !classroomID || !starttime || !endtime) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        // Validate student ID exists if role is student
        if (role === 'student') {
            const [studentCheck] = await pool.query(
                'SELECT studentID FROM students WHERE studentID = ?', [studentID]
            );
            if (studentCheck.length === 0) {
                return res.status(404).json({ message: 'Student ID not found.' });
            }
        }

        // Validate teacher ID exists if role is teacher
        if (role === 'teacher') {
            const [teacherCheck] = await pool.query(
                'SELECT teacherID FROM teachers WHERE teacherID = ?', [teacherID]
            );
            if (teacherCheck.length === 0) {
                return res.status(404).json({ message: 'Teacher ID not found.' });
            }
        }

        // Check for conflicts
        const [conflicts] = await pool.query(`
            SELECT implementationID FROM implementations
            WHERE classroomID = ?
            AND status IN ('Pending', 'Approved')
            AND (starttime < ? AND endtime > ?)
        `, [classroomID, endtime, starttime]);

        if (conflicts.length > 0) {
            return res.status(409).json({ message: 'Room is already booked for this time slot.' });
        }

        // Insert into implementations
        // Student → requested_by = studentID, teacherID = NULL
        // Teacher → teacherID = teacherID, requested_by = NULL, status = Approved
        // Admin   → teacherID = NULL, requested_by = NULL, status = Approved
        const status       = role === 'student' ? 'Pending' : 'Approved';
        const reqBy        = role === 'student' ? studentID : null;
        const assignedTeacher = role === 'teacher' ? teacherID : null;

        await pool.query(`
            INSERT INTO implementations
                (courseID, is_onlineclass, starttime, endtime, teacherID, studentID, classroomID, status, requested_by)
            VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?)
        `, [courseID, starttime, endtime, assignedTeacher, studentID, classroomID, status, reqBy]);

        const msg = role === 'student'
            ? 'Room request submitted! Waiting for approval.'
            : 'Session booked successfully!';

        res.json({ message: msg });

    } catch (err) {
        console.error('Request error:', err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

// ─── GET ALL USERS ────────────────────────────────────────────────────────────

app.get('/admin/users', async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT
                u.userID,
                u.fullname,
                u.email,
                u.account_created,
                s.studentID,
                t.teacherID,
                CASE
                    WHEN s.studentID IS NOT NULL THEN 'Student'
                    WHEN t.teacherID IS NOT NULL THEN 'Teacher'
                    ELSE 'Admin'
                END AS role
            FROM users u
            LEFT JOIN students s ON u.userID = s.userID
            LEFT JOIN teachers t ON u.userID = t.userID
            ORDER BY u.account_created DESC
        `);
        res.json(users);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ message: 'Failed to load users.' });
    }
});

// ─── DELETE USER ─────────────────────────────────────────────────────────────

app.delete('/admin/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [students] = await pool.query(
            'SELECT studentID FROM students WHERE userID = ?', [id]
        );
        const [teachers] = await pool.query(
            'SELECT teacherID FROM teachers WHERE userID = ?', [id]
        );

        if (students.length > 0) {
            await pool.query(
                'DELETE FROM implementations WHERE requested_by = ?',
                [students[0].studentID]
            );
        }
        if (teachers.length > 0) {
            await pool.query(
                'DELETE FROM implementations WHERE teacherID = ?',
                [teachers[0].teacherID]
            );
        }

        await pool.query('DELETE FROM students WHERE userID = ?', [id]);
        await pool.query('DELETE FROM teachers WHERE userID = ?', [id]);
        await pool.query('DELETE FROM users    WHERE userID = ?', [id]);

        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ message: 'Failed to delete user: ' + err.message });
    }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).send('Failed to logout');
        }
        res.clearCookie('connect.sid');
        res.redirect('/index.html');
    });
});

app.get('/ping', (req, res) => {
    console.log('Ping route hit');
    res.json({ ok: true, message: 'Backend is alive!' });
});

// Or if you want to test POST as well:
app.post('/ping', (req, res) => {
    console.log('Ping POST hit with body:', req.body);
    res.json({ ok: true, body: req.body });
});

app.use((req, res, next) => {
    console.log('Incoming:', req.method, req.path);
    next();
});

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '..', 'Frontend', '404.html'));
});

// Start server on port 7878
initDB().then(() => {
    app.listen(7878, '0.0.0.0', () => {
        console.log('Server running on http://0.0.0.0:7878');
    });
});