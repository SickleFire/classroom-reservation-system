const express = require('express');
const router = express.Router();

router.get('/reserve-events', async (req, res) => {
    try {
        const [rows] = await mysql.query('SELECT room_name, time FROM reservations');
        const events = rows.map(r => ({
            title: `Room ${r.room_name}`,
            start: r.time   // must be in ISO format (YYYY-MM-DD HH:MM)
        }));
        res.json(events);
    } catch (err) {
        console.error('Events error:', err);
        res.status(500).json({ message: 'Failed to load events.' });
    }
});

module.exports = router;