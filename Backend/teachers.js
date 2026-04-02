const express = require('express');

module.exports = function(pool) {
    const router = express.Router();

    function requireLogin(req, res, next) {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ message: 'Unauthorized.' });
        }
        next();
    }

    // ─── GET: ALL TEACHERS ────────────────────────────────────────────────────
    router.get('/admin/teachers', requireLogin, async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT teacherID, firstname, lastname FROM teachers ORDER BY teacherID DESC'
            );
            res.json(rows);
        } catch (err) {
            console.error('Teacher list error:', err);
            res.status(500).json({ message: 'Failed to load teachers.' });
        }
    });

    // ─── GET: NEXT AUTO-INCREMENT ID ──────────────────────────────────────────
router.get('/admin/teachers/next-id', requireLogin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT COALESCE(MAX(teacherID), 0) + 1 AS nextId FROM teachers'
        );
        res.json({ nextId: rows[0].nextId });
    } catch (err) {
        console.error('Next ID error:', err);
        res.status(500).json({ message: 'Could not fetch next ID.' });
    }
});

    // ─── POST: ADD TEACHER ────────────────────────────────────────────────────
    router.post('/admin/teachers', requireLogin, async (req, res) => {
        const { firstname, lastname } = req.body;

        if (!firstname || !lastname) {
            return res.status(400).json({ message: 'First name and last name are required.' });
        }

        const clean = (str) => str.trim().replace(/\s+/g, ' ');

        try {
            const [result] = await pool.query(
                'INSERT INTO teachers (firstname, lastname) VALUES (?, ?)',
                [clean(firstname), clean(lastname)]
            );
            res.json({
                message: `${clean(firstname)} ${clean(lastname)} added successfully!`,
                teacherID: result.insertId
            });
        } catch (err) {
            console.error('Add teacher error:', err);
            res.status(500).json({ message: 'Failed to add teacher.' });
        }
    });

    // ─── DELETE: REMOVE TEACHER ───────────────────────────────────────────────
    router.delete('/admin/teachers/:id', requireLogin, async (req, res) => {
        const { id } = req.params;

        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid teacher ID.' });
        }

        try {
            // Detach teacher from any scheduled classes before deleting
            await pool.query(
                'UPDATE implementations SET teacherID = NULL WHERE teacherID = ?',
                [id]
            );
            const [result] = await pool.query(
                'DELETE FROM teachers WHERE teacherID = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Teacher not found.' });
            }

            res.json({ message: 'Teacher deleted successfully.' });
        } catch (err) {
            console.error('Delete teacher error:', err);
            res.status(500).json({ message: 'Failed to delete teacher.' });
        }
    });

    // ─── GET: TEACHERS FOR SCHEDULE DROPDOWN ─────────────────────────────────
    router.get('/schedule/teachers', requireLogin, async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT teacherID, firstname, lastname FROM teachers ORDER BY lastname ASC'
            );
            res.json(rows);
        } catch (err) {
            console.error('Schedule teachers error:', err);
            res.status(500).json({ message: 'Could not load teachers.' });
        }
    });

    return router;
};