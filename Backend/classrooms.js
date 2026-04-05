const express = require('express');

module.exports = function(pool) {
    const router = express.Router();

    function requireLogin(req, res, next) {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ message: 'Unauthorized.' });
        }
        next();
    }

    // ─── GET: ALL CLASSROOMS ──────────────────────────────────────────────────
    router.get('/admin/classrooms', requireLogin, async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT classroomID, name, description, BYOD, category, is_available FROM classrooms ORDER BY classroomID ASC'
            );
            res.json(rows);
        } catch (err) {
            console.error('Classroom list error:', err);
            res.status(500).json({ message: 'Failed to load classrooms.' });
        }
    });

    // ─── GET: NEXT AUTO-INCREMENT ID ──────────────────────────────────────────
    router.get('/admin/classrooms/next-id', requireLogin, async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT COALESCE(MAX(classroomID), 0) + 1 AS nextId FROM classrooms'
            );
            res.json({ nextId: rows[0].nextId });
        } catch (err) {
            console.error('Next ID error:', err);
            res.status(500).json({ message: 'Could not fetch next ID.' });
        }
    });

    // ─── POST: ADD CLASSROOM ──────────────────────────────────────────────────
    router.post('/admin/classrooms', requireLogin, async (req, res) => {
        const { name, description, category, BYOD, is_available } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Room name is required.' });
        }
        if (!category || !category.trim()) {
            return res.status(400).json({ message: 'Category is required.' });
        }

        const clean = (str) => str.trim().replace(/\s+/g, ' ');

        try {
            const [result] = await pool.query(
                'INSERT INTO classrooms (name, description, BYOD, category, is_available) VALUES (?, ?, ?, ?, ?)',
                [
                    clean(name),
                    description ? clean(description) : null,
                    BYOD ? 1 : 0,
                    clean(category),
                    is_available !== undefined ? (is_available ? 1 : 0) : 1
                ]
            );
            res.json({
                message: `Classroom "${clean(name)}" added successfully!`,
                classroomID: result.insertId
            });
        } catch (err) {
            console.error('Add classroom error:', err);
            res.status(500).json({ message: 'Failed to add classroom.' });
        }
    });

    // ─── PUT: UPDATE CLASSROOM ────────────────────────────────────────────────
    router.put('/admin/classrooms/:id', requireLogin, async (req, res) => {
        const id = parseInt(req.params.id);
        const { name, description, category, BYOD, is_available } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid classroom ID.' });
        }
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Room name is required.' });
        }
        if (!category || !category.trim()) {
            return res.status(400).json({ message: 'Category is required.' });
        }

        const clean = (str) => str.trim().replace(/\s+/g, ' ');

        try {
            const [result] = await pool.query(
                'UPDATE classrooms SET name = ?, description = ?, BYOD = ?, category = ?, is_available = ? WHERE classroomID = ?',
                [
                    clean(name),
                    description ? clean(description) : null,
                    BYOD ? 1 : 0,
                    clean(category),
                    is_available ? 1 : 0,
                    id
                ]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Classroom not found.' });
            }

            res.json({ message: `Classroom #${id} updated successfully.` });
        } catch (err) {
            console.error('Update classroom error:', err);
            res.status(500).json({ message: 'Failed to update classroom.' });
        }
    });

    // ─── DELETE: REMOVE CLASSROOM ─────────────────────────────────────────────
    router.delete('/admin/classrooms/:id', requireLogin, async (req, res) => {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid classroom ID.' });
        }

        try {
            // Block delete if classroom is tied to existing reservations
            const [inUse] = await pool.query(
                'SELECT COUNT(*) as count FROM implementations WHERE classroomID = ?',
                [id]
            );

            if (inUse[0].count > 0) {
                return res.status(409).json({
                    message: `Cannot delete: Classroom #${id} is used in ${inUse[0].count} existing reservation(s).`
                });
            }

            const [result] = await pool.query(
                'DELETE FROM classrooms WHERE classroomID = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Classroom not found.' });
            }

            res.json({ message: `Classroom #${id} deleted successfully.` });
        } catch (err) {
            console.error('Delete classroom error:', err.code, err.message);
            res.status(500).json({ message: `Failed to delete: ${err.message}` });
        }
    });

    // ─── GET: CLASSROOMS FOR SCHEDULE DROPDOWN ────────────────────────────────
    router.get('/schedule/classrooms', requireLogin, async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT classroomID, name, category, BYOD FROM classrooms WHERE is_available = 1 ORDER BY name ASC'
            );
            res.json(rows);
        } catch (err) {
            console.error('Schedule classrooms error:', err);
            res.status(500).json({ message: 'Could not load classrooms.' });
        }
    });

    return router;
};