const express = require('express');
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
 
// Create reservations table on startup
async function initDB() {
    try {
        await mysql.query(`
            CREATE TABLE IF NOT EXISTS reservations (
                room_name TEXT NOT NULL,
                time      TEXT NOT NULL
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