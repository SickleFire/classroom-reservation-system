const express = require('express');
const router = express.Router();
const axios = require('axios');

module.exports = function(pool) {
  const router = express.Router();

router.get('/reserve-events', async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT 
              r.implementationID,
              r.courseID,
              c.name AS course_name,
              r.is_onlineclass,
              r.starttime,
              r.endtime,
              r.teacherID,
              r.classroomID,
              cl.name AS classroom_name   -- only the classroom name
              FROM implementations r
              JOIN courses c ON r.courseID = c.courseID
              JOIN classrooms cl ON r.classroomID = cl.classroomID`);
        const events = rows.map(r => ({
            title: `${r.course_name} (${r.classroom_name})`,
            start: r.starttime,
            end: r.endtime
        }));
        console.log(events);
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

router.get('/reservations', async (req, result) => {
    try {
    const res = await fetch('http://127.0.0.1:8080/get-reservations-list');
    if (!res.ok) throw new Error('Failed to fetch reservations');
    const reservations = await res.json();
    
    console.log('Reservations from Rust:', reservations);
    // You can now render them in your table
    result.json(reservations);
  } catch (err) {
    console.error('Error calling Rust service:', err);
  }

})

return router;

};