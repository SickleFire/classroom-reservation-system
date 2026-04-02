const express = require('express');
const axios = require('axios');

module.exports = function(pool) {
  const router = express.Router();

  // ─── GET: CALENDAR EVENTS ──────────────────────────────────────────────────
  router.get('/reserve-events', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT 
          i.implementationID,
          c.name AS course_name,
          cl.name AS classroom_name,
          i.starttime,
          i.endtime,
          i.is_weekly
        FROM implementations i
        JOIN courses c ON i.courseID = c.courseID
        JOIN classrooms cl ON i.classroomID = cl.classroomID
      `);

      const events = rows.map(r => ({
        title: `${r.course_name} (${r.classroom_name})`,
        start: r.starttime,
        end: r.endtime,
        backgroundColor: r.is_weekly ? '#F45B26' : '#007bff'
      }));

      res.json(events);
    } catch (err) {
      console.error('Events error:', err);
      res.status(500).json({ message: 'Failed to load calendar events.' });
    }
  });

  // ─── POST: RESERVE (WITH RUST CONFLICT CHECK) ──────────────────────────────
  router.post('/reserve', async (req, res) => {
    const { courseID, classroomID, starttime, endtime, teacherID, is_weekly } = req.body;
    
    // Safety check for session
    const coordinatorID = req.session && req.session.user ? req.session.user.id : null;

    try {
      // 1. Call Rust service. 
      // IMPORTANT: We send 'room' as the ID and 'start'/'end' as ISO strings
      const rustResponse = await axios.post('http://127.0.0.1:8080/check-conflict', { 
        room: parseInt(classroomID), 
        start: starttime,
        end: endtime 
      });

      if (!rustResponse.data.available) {
        return res.status(409).json({ message: 'Conflict detected by Rust service.' });
      }

      // 2. If available, save to implementations table
      await pool.query(`
        INSERT INTO implementations 
        (courseID, classroomID, teacherID, starttime, endtime, is_weekly, is_onlineclass)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [courseID, classroomID, teacherID, starttime, endtime, is_weekly || 0, 0]);

      res.json({ message: 'Success! Class scheduled and verified by Rust.' });

    } catch (err) {
      console.error('Rust/DB Error:', err.response ? err.response.data : err.message);
      res.status(500).json({ message: 'Service Error: Ensure Rust server is running and DB is updated.' });
    }
  });

  // ─── GET: RESERVATIONS LIST (FROM RUST) ───────────────────────────────────
  router.get('/reservations', async (req, res) => {
    try {
      // Calling Rust to get the processed list of schedules
      const response = await axios.get('http://127.0.0.1:8080/reservations');
      
      // We pass the Rust data directly to the frontend
      // Ensure your Rust service returns an array of objects
      res.json(response.data);
    } catch (err) {
      console.error('Rust list fetch error:', err.message);
      
      // FALLBACK: If Rust is down, fetch directly from MySQL so the UI doesn't break
      try {
        const [rows] = await pool.query(`
  SELECT 
    i.implementationID,
    i.teacherID,
    c.name as course_name,
    i.starttime, i.endtime, i.status, i.is_weekly,
    cl.name as classroom_name,
    t.firstname as teacher_fname,
    t.lastname  as teacher_lname
  FROM implementations i
  JOIN courses c ON i.courseID = c.courseID
  JOIN classrooms cl ON i.classroomID = cl.classroomID
  LEFT JOIN teachers t ON i.teacherID = t.teacherID
`);
        res.json(rows);
      } catch (dbErr) {
        res.status(500).json({ message: 'Both Rust and Database links failed.' });
      }
    }
  });

  // ─── PUT: UPDATE STATUS ───────────────────────────────────────────────────
  router.put('/reservations/:id', async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    try {
      await pool.query(
        "UPDATE implementations SET status = ? WHERE implementationID = ?",
        [status, id]
      );
      res.json({ message: `Implementation ${id} updated to ${status}` });
    } catch (err) {
      res.status(500).json({ message: 'Failed to update implementation.' });
    }
  });

  // ─── DELETE: REMOVE RESERVATION ──────────────────────────────────────────
  router.delete('/reservations/:id', async (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid reservation ID.' });
  }

  try {
    const [result] = await pool.query(
      'DELETE FROM implementations WHERE implementationID = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    res.json({ message: `Reservation #${id} deleted successfully.` });
    } catch (err) {
    console.error('Delete reservation error:', err);
    res.status(500).json({ message: 'Failed to delete reservation.' });
    }
  });

  return router;
};