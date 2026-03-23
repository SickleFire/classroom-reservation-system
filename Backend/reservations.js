const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('pool');

router.get('/reserve-events', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT room_name, time FROM reservations');
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

router.post('/reserve', async (req, res) => {
    const { room, time } = req.body;

    // Call Rust service
    const conflict = await axios.post('http://127.0.0.1:8080/check-conflict', { room, time });
    if (!conflict.data.available) {
      return res.status(400).json({ message: 'Room not available' });
    }

    res.send(`<h1>Reservation received for room ${room} at ${time}</h1>`);

});

router.get('/reservations', async (req, res) => {
    try {
    const [rows] = await db.query(
      'SELECT reservationID, room, userName, start_time, end_time, status, created_at FROM reservations'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.status(500).json({ message: 'Failed to fetch reservations' });
  }

})

module.exports = router;