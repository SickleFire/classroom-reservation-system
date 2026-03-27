const express = require('express');
const axios = require('axios');

module.exports = function(pool) {
    const router = express.Router();

    const isCoordinator = (req, res, next) => {
        if (req.session && req.session.user) return next();
        res.status(401).json({ message: 'Unauthorized' });
    };

    // ─── GET: CALENDAR EVENTS (LOCAL DB) ─────────────────────────────────────
    router.get('/reserve-events', async (req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT i.implementationID, c.name AS course_name, cl.name AS classroom_name, i.starttime, i.endtime
                FROM implementations i
                JOIN courses c ON i.courseID = c.courseID
                JOIN classrooms cl ON i.classroomID = cl.classroomID
            `);
            const events = rows.map(r => ({
                title: `${r.course_name} (${r.classroom_name})`,
                start: r.starttime,
                end: r.endtime
            }));
            res.json(events);
        } catch (err) {
            res.status(500).json({ message: 'Failed to load events.' });
        }
    });

    // ─── POST: RESERVE (CALLS RUST CHECK-CONFLICT) ───────────────────────────
    router.post('/reserve', isCoordinator, async (req, res) => {
        const { courseID, classroomID, starttime, endtime } = req.body;
        const coordinatorID = req.session.user.coordinatorID;

        try {
            // 1. Call Rust Conflict Service
            const rustResponse = await axios.post('http://127.0.0.1:8080/check-conflict', { 
                room: parseInt(classroomID), 
                start: starttime,
                end: endtime 
            });

            // Rust returns { "available": true/false }
            if (!rustResponse.data.available) {
                return res.status(409).json({ message: 'Conflict detected by Rust service.' });
            }

            // 2. Insert if available (Mapping coordinatorID to teacherID for your schema)
            await pool.query(`
                INSERT INTO implementations 
                (courseID, classroomID, teacherID, starttime, endtime, status, is_onlineclass)
                VALUES (?, ?, ?, ?, ?, 'Approved', 0)
            `, [courseID, classroomID, coordinatorID, starttime, endtime]);

            res.json({ message: 'Success! Verified by Rust and scheduled.' });
        } catch (err) {
            console.error('Rust/DB Error:', err.message);
            res.status(500).json({ message: 'Reservation service error.' });
        }
    });

    // ─── GET: ALL RESERVATIONS (CALLS RUST LIST) ──────────────────────────────
    router.get('/reservations', async (req, res) => {
        try {
            // Primary: Fetch processed list from Rust
            const response = await axios.get('http://127.0.0.1:8080/reservations');
            res.json(response.data);
        } catch (err) {
            console.warn('Rust service down, falling back to MySQL.');
            try {
                // Fallback: Direct MySQL query
                const [rows] = await pool.query(`
                    SELECT 
                        i.implementationID AS implementation_id, 
                        c.name AS course_name, 
                        cl.name AS classroom_name,
                        i.starttime, i.endtime, i.status
                    FROM implementations i
                    JOIN courses c ON i.courseID = c.courseID
                    JOIN classrooms cl ON i.classroomID = cl.classroomID
                `);
                res.json(rows);
            } catch (dbErr) {
                res.status(500).json({ message: 'System failure.' });
            }
        }
    });

    return router;
};