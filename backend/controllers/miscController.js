const db = require('../config/db');

async function listSchools(req, res, next) {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(25, Math.max(1, parseInt(req.query.limit, 10) || 10));

    let rows;
    if (q) {
      rows = await db.query(
        `SELECT DISTINCT school
         FROM users
         WHERE school IS NOT NULL AND school <> '' AND school ILIKE $1
         ORDER BY school
         LIMIT $2`,
        [`%${q}%`, limit]
      );
    } else {
      // Return most frequent schools when no query provided
      rows = await db.query(
        `SELECT school
         FROM (
           SELECT school, COUNT(*) as c
           FROM users
           WHERE school IS NOT NULL AND school <> ''
           GROUP BY school
         ) s
         ORDER BY c DESC, school
         LIMIT $1`,
        [limit]
      );
    }

    const schools = rows.rows.map(r => r.school);
    res.json({ schools });
  } catch (err) { next(err); }
}

module.exports = { listSchools };


