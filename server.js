const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Database Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "eventtrack"
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.log("MySQL connection failed:", err.message);
    } else {
        console.log("MySQL connected successfully!");
    }
});

// Home route
app.get("/", (req, res) => {
    res.send("EventTrack Backend is Running!");
});

// Get all events
app.get("/events", (req, res) => {
    const sql = "SELECT * FROM events";

    db.query(sql, (err, results) => {
        if (err) {
            console.log("Error fetching events:", err.message);
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(results);
    });
});

// Get all users
app.get("/users", (req, res) => {
    const sql = "SELECT id, name, email, role FROM users";

    db.query(sql, (err, results) => {
        if (err) {
            console.log("Error fetching users:", err.message);
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(results);
    });
});

// Add a new event
app.post("/events", (req, res) => {
    const {
        event_name,
        event_date,
        event_time,
        venue,
        description
    } = req.body;

    const sql = `
        INSERT INTO events
        (event_name, event_date, event_time, venue, description)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [event_name, event_date, event_time, venue, description],
        (err, result) => {
            if (err) {
                console.log("Error adding event:", err.message);
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json({
                message: "Event added successfully!",
                event_id: result.insertId
            });
        }
    );
});

// Mark attendance
app.post("/attendance", (req, res) => {
    const { user_id, event_id } = req.body;

    const sql = `
        INSERT INTO attendance (user_id, event_id)
        VALUES (?, ?)
    `;

    db.query(sql, [user_id, event_id], (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).json({
                    error: "Student has already attended this event."
                });
            }

            console.log("Error marking attendance:", err.message);

            return res.status(500).json({
                error: err.message
            });
        }

        res.json({
            message: "Attendance marked successfully!",
            attendance_id: result.insertId
        });
    });
});
// QR Scan Page
app.get("/scan", (req, res) => {

    const eventId = req.query.event_id;

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>EventTrack - QR Attendance</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: #f4f7fb;
                    margin: 0;
                    padding: 20px;
                }

                .container {
                    max-width: 450px;
                    margin: 50px auto;
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.1);
                    text-align: center;
                }

                h1 {
                    color: #2563eb;
                }

                input {
                    width: 90%;
                    padding: 12px;
                    margin: 15px 0;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 16px;
                }

                button {
                    padding: 12px 25px;
                    background: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                }

                button:hover {
                    background: #1d4ed8;
                }

                #message {
                    margin-top: 20px;
                    font-weight: bold;
                }
            </style>
        </head>

        <body>

            <div class="container">

                <h1>EventTrack</h1>

                <h2>Mark Attendance</h2>

                <p>Event ID: ${eventId}</p>

                <input
                    type="number"
                    id="studentId"
                    placeholder="Enter Student ID"
                >

                <br>

                <button onclick="markAttendance()">
                    Mark Attendance
                </button>

                <p id="message"></p>

            </div>

            <script>

                function markAttendance() {

                    const studentId =
                        document.getElementById("studentId").value;

                    const message =
                        document.getElementById("message");

                    if (!studentId) {
                        message.textContent =
                            "Please enter your Student ID.";
                        return;
                    }

                    fetch("/attendance", {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            user_id: studentId,
                            event_id: ${JSON.stringify(eventId)}
                        })
                    })

                    .then(response => response.json())

                    .then(data => {

                        if (data.error) {
                            message.textContent = data.error;
                        } else {
                            message.textContent =
                                "Attendance marked successfully!";
                        }

                    })

                    .catch(error => {

                        console.error(error);

                        message.textContent =
                            "Unable to mark attendance.";

                    });
                }

            </script>

        </body>
        </html>
    `);
});

// Get attendance records
app.get("/attendance", (req, res) => {
    const sql = `
        SELECT
            attendance.id,
            users.name AS student_name,
            users.email,
            events.event_name,
            events.event_date,
            attendance.check_in_time
        FROM attendance
        JOIN users ON attendance.user_id = users.id
        JOIN events ON attendance.event_id = events.id
        ORDER BY attendance.check_in_time DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.log("Error fetching attendance:", err.message);
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(results);
    });
});
// Dashboard statistics
app.get("/dashboard-stats", (req, res) => {
    const sql = `
        SELECT
            (SELECT COUNT(*) FROM events) AS totalEvents,
            (SELECT COUNT(*) FROM users) AS totalStudents,
            (SELECT COUNT(*) FROM attendance) AS totalAttendance
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.log("Error fetching dashboard stats:", err.message);
            return res.status(500).json({
                error: err.message
            });
        }

        res.json(results[0]);
    });
});

// Register student for an event
app.post("/register-event", (req, res) => {
    const { user_id, event_id } = req.body;

    if (!user_id || !event_id) {
        return res.status(400).json({
            error: "User ID and Event ID are required."
        });
    }

    const sql = `
        INSERT INTO event_registrations (user_id, event_id)
        VALUES (?, ?)
    `;

    db.query(sql, [user_id, event_id], (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).json({
                    error: "Student is already registered for this event."
                });
            }

            console.log("Registration error:", err.message);

            return res.status(500).json({
                error: err.message
            });
        }

        res.json({
            message: "Event registration successful!",
            registration_id: result.insertId
        });
    });
});


// Login
app.post("/login", (req, res) => {

    const { email, password } = req.body;

    const sql = `
        SELECT id, name, email, role
        FROM users
        WHERE email = ? AND password = ?
    `;

    db.query(sql, [email, password], (err, results) => {

        if (err) {
            console.log("Login error:", err.message);

            return res.status(500).json({
                error: "Database error"
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        res.json({
            message: "Login successful",
            user: results[0]
        });
    });
});


// Start server
app.listen(3000, "0.0.0.0", () => {
    console.log("EventTrack server running on http://10.213.41.58:3000");
});