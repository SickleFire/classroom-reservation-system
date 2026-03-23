const express = require('express');
const session = require('express-session');
const bcrypt  = require('bcrypt');
const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise();

const reservationsRoutes = require('./reservations.js')(pool);

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : '(empty)');

const path = require('path');
const app  = express();

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
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                firstname TEXT NOT NULL,
                lastname  TEXT NOT NULL,
                email     TEXT NOT NULL,
                password  TEXT NOT NULL
            )
        `);
        console.log('Database tables ready.');
    } catch (err) {
        console.error('DB init error:', err);
    }
}

// ─── LOGIN (handles Student, Teacher, Admin automatically) ───────────────────

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await pool.query(
            'SELECT * FROM Users WHERE email = ?', [email]
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
            'SELECT studentID FROM Students WHERE userID = ?', [user.userID]
        );
        const [teachers] = await pool.query(
            'SELECT teacherID FROM Teachers WHERE userID = ?', [user.userID]
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

        res.json({
            message:  'Login successful!',
            role,
            fullname:  user.fullname,
            studentID,
            teacherID,
            redirect: 'dashboard.html'
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
            'SELECT userID FROM Users WHERE email = ?', [email]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [userResult] = await pool.query(
            'INSERT INTO Users (fullname, email, password, account_created) VALUES (?, ?, ?, NOW())',
            [`${firstname} ${lastname}`, email, hashedPassword]
        );
        const userID = userResult.insertId;

        const [countResult] = await pool.query('SELECT COUNT(*) AS count FROM Students');
        const nextNum   = countResult[0].count + 1;
        const studentID = `2026${String(nextNum).padStart(3, '0')}-S`;

        await pool.query(
            'INSERT INTO Students (studentID, firstname, lastname, phone, userID) VALUES (?, ?, ?, ?, ?)',
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
            'SELECT userID FROM Users WHERE email = ?', [email]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [userResult] = await pool.query(
            'INSERT INTO Users (fullname, email, password, account_created) VALUES (?, ?, ?, NOW())',
            [`${firstname} ${lastname}`, email, hashedPassword]
        );
        const userID = userResult.insertId;

        const [countResult] = await pool.query('SELECT COUNT(*) AS count FROM Teachers');
        const nextNum   = countResult[0].count + 1;
        const teacherID = String(nextNum).padStart(3, '0');

        await pool.query(
            'INSERT INTO Teachers (teacherID, firstname, lastname, phone, userID) VALUES (?, ?, ?, ?, ?)',
            [teacherID, firstname, lastname, phone, userID]
        );

        res.json({ message: 'Registered successfully!', teacherID });

    } catch (err) {
        console.error('Teacher register error:', err);
        res.status(500).json({ message: 'Registration failed: ' + err.message });
    }
});

// ─── GET COURSES (for registerclass.html dropdown) ───────────────────────────

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

// ─── GET AVAILABLE ROOMS (with Debugging) ───────────────────

app.get('/schedule/available-rooms', async (req, res) => {
    const { starttime, endtime } = req.query;

    // DEBUG: See what times the frontend is checking for
    console.log(`--- DEBUG: Checking Availability ---`);
    console.log(`Requested Range: ${starttime} to ${endtime}`);

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
                FROM Implementations i
                WHERE i.status IN ('Pending', 'Approved')
                AND NOT (i.endtime <= ? OR i.starttime >= ?)
            )
        `, [starttime, endtime]);

        console.log(`DEBUG: Found ${rooms.length} available rooms.`);
        res.json(rooms);

    } catch (err) {
        console.error('Available rooms error:', err);
        res.status(500).json({ message: 'Failed to fetch available rooms.' });
    }
});

// ─── POST REQUESTS (Student & Room Validation) ─────────────────────────────

app.post('/requests', async (req, res) => {
    const { studentID, courseID, classroomID, starttime, endtime } = req.body;

    // DEBUG: Logs incoming data to your terminal
    console.log("--- DEBUG: Incoming Booking Request ---");
    console.log(`Student: ${studentID} | Room: ${classroomID} | Course: ${courseID}`);
    console.log(`Time Slot: ${starttime} to ${endtime}`);

    if (!studentID || !courseID || !classroomID || !starttime || !endtime) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        // 1. VALIDATION: Check if Student ID exists in the database
        const [studentCheck] = await pool.query(
            'SELECT studentID FROM Students WHERE studentID = ?', [studentID]
        );

        if (studentCheck.length === 0) {
            console.log(`DEBUG: Validation Failed - Student ID "${studentID}" not found.`);
            return res.status(404).json({ 
                message: `Submission failed: Student ID "${studentID}" is not registered. The form will not be submitted.` 
            });
        }

        // 2. VALIDATION: Check for Room Conflicts (Double Booking)
        // This checks if any 'Pending' or 'Approved' session overlaps with the requested time
        const [conflicts] = await pool.query(`
            SELECT implementationID FROM Implementations
            WHERE classroomID = ?
            AND status IN ('Pending', 'Approved')
            AND (starttime < ? AND endtime > ?)
        `, [classroomID, endtime, starttime]);

        if (conflicts.length > 0) {
            console.log(`DEBUG: Conflict Found - Room ${classroomID} is busy during this slot.`);
            return res.status(409).json({ 
                message: 'Submission failed: This room is already booked for the selected time. Please choose another room or time.' 
            });
        }

        // 3. EXECUTION: If all checks pass, insert the record
        await pool.query(`
            INSERT INTO Implementations
                (courseID, is_onlineclass, starttime, endtime, teacherID, classroomID, status, requested_by)
            VALUES (?, 0, ?, ?, NULL, ?, 'Pending', ?)
        `, [courseID, starttime, endtime, classroomID, studentID]);

        console.log("DEBUG: Success - Request saved to Implementations table.");
        res.json({ message: 'Room request submitted successfully! Waiting for admin approval.' });

    } catch (err) {
        console.error('DATABASE ERROR:', err);
        res.status(500).json({ message: 'Server Error: ' + err.message });
    }
});

// ─── GET ALL USERS (for userlist.html) ───────────────────────────────────────

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

// ─── DELETE USER ─────────────────────────────────────────────────────────────

app.delete('/admin/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Get studentID and teacherID first
        const [students] = await pool.query(
            'SELECT studentID FROM Students WHERE userID = ?', [id]
        );
        const [teachers] = await pool.query(
            'SELECT teacherID FROM Teachers WHERE userID = ?', [id]
        );

        // Delete Implementations tied to this student or teacher
        if (students.length > 0) {
            await pool.query(
                'DELETE FROM Implementations WHERE requested_by = ?',
                [students[0].studentID]
            );
        }
        if (teachers.length > 0) {
            await pool.query(
                'DELETE FROM Implementations WHERE teacherID = ?',
                [teachers[0].teacherID]
            );
        }

        // Then delete from Students or Teachers
        await pool.query('DELETE FROM Students WHERE userID = ?', [id]);
        await pool.query('DELETE FROM Teachers WHERE userID = ?', [id]);

        // Finally delete from Users
        await pool.query('DELETE FROM Users WHERE userID = ?', [id]);

        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ message: 'Failed to delete user: ' + err.message });
    }
});

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