# Backend for issue-tally-counter (Node.js + Express + SQLite)

This canvas contains the backend code and supporting files. Save each code block to its filename and follow the README to install and run.

---

## File: package.json
```json
{
  "name": "issue-tally-backend",
  "version": "1.0.0",
  "description": "Simple backend for Issue Tally Counter (Express + SQLite)",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.2",
    "sqlite3": "^5.1.6"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
```

---

## File: .env.example
```
# Copy to .env and edit if needed
PORT=4000
DB_FILE=./data/issue-tally.db
```

---

## File: server.js
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const PORT = process.env.PORT || 4000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'issue-tally.db');

// ensure data directory exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new sqlite3.Database(DB_FILE);

// initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS issue_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER,
    issue_type_id INTEGER,
    count INTEGER DEFAULT 0,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(department_id) REFERENCES departments(id),
    FOREIGN KEY(issue_type_id) REFERENCES issue_types(id)
  )`);

  // seed sample data if empty
  db.get('SELECT COUNT(*) as c FROM departments', (err, row) => {
    if (!err && row.c === 0) {
      const stmt = db.prepare('INSERT INTO departments (name) VALUES (?)');
      ['IT','HR','Operations','Maintenance'].forEach(d => stmt.run(d));
      stmt.finalize();
    }
  });

  db.get('SELECT COUNT(*) as c FROM issue_types', (err, row) => {
    if (!err && row.c === 0) {
      const stmt = db.prepare('INSERT INTO issue_types (name) VALUES (?)');
      ['Bug','Request','Incident','Other'].forEach(t => stmt.run(t));
      stmt.finalize();
    }
  });
});

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Departments
app.get('/api/departments', (req, res) => {
  db.all('SELECT * FROM departments ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/departments', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  db.run('INSERT INTO departments (name) VALUES (?)', [name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name });
  });
});

// Issue types
app.get('/api/issue-types', (req, res) => {
  db.all('SELECT * FROM issue_types ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/issue-types', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  db.run('INSERT INTO issue_types (name) VALUES (?)', [name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name });
  });
});

// Issues CRUD
app.get('/api/issues', (req, res) => {
  const sql = `SELECT issues.*, departments.name as department_name, issue_types.name as issue_type_name
    FROM issues
    LEFT JOIN departments ON departments.id = issues.department_id
    LEFT JOIN issue_types ON issue_types.id = issues.issue_type_id
    ORDER BY issues.id DESC`;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/issues', (req, res) => {
  const { department_id, issue_type_id, description, count } = req.body;
  const cnt = Number.isInteger(count) ? count : 1;
  db.run(
    'INSERT INTO issues (department_id, issue_type_id, count, description) VALUES (?, ?, ?, ?)',
    [department_id || null, issue_type_id || null, cnt, description || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM issues WHERE id = ?', [this.lastID], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.status(201).json(row);
      });
    }
  );
});

// Increment count for an existing issue
app.post('/api/issues/:id/increment', (req, res) => {
  const id = req.params.id;
  const delta = parseInt(req.body.delta) || 1;
  db.run('UPDATE issues SET count = count + ? WHERE id = ?', [delta, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM issues WHERE id = ?', [id], (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      res.json(row);
    });
  });
});

app.put('/api/issues/:id', (req, res) => {
  const id = req.params.id;
  const { department_id, issue_type_id, description, count } = req.body;
  db.run(
    'UPDATE issues SET department_id = ?, issue_type_id = ?, description = ?, count = ? WHERE id = ?',
    [department_id || null, issue_type_id || null, description || null, count || 0, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM issues WHERE id = ?', [id], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.json(row);
      });
    }
  );
});

app.delete('/api/issues/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM issues WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deletedId: id });
  });
});

// Static serve - optional: serve frontend build if placed in ../frontend/dist
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

app.listen(PORT, () => {
  console.log(`Issue Tally Backend running on http://localhost:${PORT}`);
});
```

---

## File: README.md
```md
# Issue Tally Backend

Simple backend for the Issue Tally Counter project. Uses Express + SQLite for easy local setup.

## Install
1. Copy `.env.example` to `.env` and edit if you want a different port or DB path:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run (development):
   ```bash
   npm run dev
   ```

   Or run production:
   ```bash
   npm start
   ```

## API Endpoints
- `GET /api/health` - health check
- `GET /api/departments` - list departments
- `POST /api/departments` - create department `{ name }`
- `GET /api/issue-types` - list issue types
- `POST /api/issue-types` - create issue type `{ name }`
- `GET /api/issues` - list issues (with department and issue_type names)
- `POST /api/issues` - create issue `{ department_id, issue_type_id, description, count }`
- `POST /api/issues/:id/increment` - increment existing issue `{ delta }`
- `PUT /api/issues/:id` - update issue
- `DELETE /api/issues/:id` - delete issue

## Notes
- Database file is created at the path set in `.env` (default: `./data/issue-tally.db`).
- The server seeds some sample departments and issue types if none exist.

## Integrating with the React frontend
- Update the frontend API base URL if needed. By default frontend may call `/api/*` on the same host.
- If frontend runs on a different port during development (e.g., 5173), keep backend CORS enabled (already enabled).
```

---

## File: db/seed.sql (optional)
```sql
-- optional SQL seed to inspect or run in a SQLite client
CREATE TABLE IF NOT EXISTS departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS issue_types (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER,
  issue_type_id INTEGER,
  count INTEGER DEFAULT 0,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

INSERT OR IGNORE INTO departments (name) VALUES ('IT'),('HR'),('Operations'),('Maintenance');
INSERT OR IGNORE INTO issue_types (name) VALUES ('Bug'),('Request'),('Incident'),('Other');
```

---

**Done.** Open the files above, save them into a `backend/` folder in your project, then follow README steps to run. If you want, I can also:
- generate a ZIP of the backend and provide a download link, OR
- modify the React frontend to call these endpoints and show real data.
