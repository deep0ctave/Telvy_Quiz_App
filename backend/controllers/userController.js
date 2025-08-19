// src/controllers/userController.js
const db = require('../config/db');
const { hashPassword } = require('../utils/bcrypt');

async function listUsers(req, res, next) {
  try {
    const r = await db.query(`SELECT id, role, name, username, dob, email, gender, school, class, section, phone, verification_status, user_state, created_at, updated_at FROM users ORDER BY id`);
    res.json(r.rows);
  } catch (err) { 
    next(err); 
  }
}

async function getUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    
    // Check if ID is valid
    if (isNaN(id)) {
      console.error('Invalid ID parameter:', req.params.id);
      return res.status(400).json({ error: 'invalid_id' });
    }
    
    if (req.user.role !== 'admin' && req.user.id !== id) return res.status(403).json({ error: 'forbidden' });
    const r = await db.query(`SELECT id, role, name, username, dob, email, gender, school, class, section, phone, verification_status, user_state, created_at, updated_at FROM users WHERE id=$1`, [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
}

async function createUser(req, res, next) {
  try {
    const { role,name,username,dob,email,gender,school,class:className,section,password,phone,verification_status,user_state } = req.body;
    const pwHash = await hashPassword(password || Math.random().toString(36).slice(-8));
    const ins = await db.query(`
      INSERT INTO users (role,name,username,dob,email,gender,school,class,section,password_hash,phone,verification_status,user_state)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id
    `, [role,name,username,dob,email,gender,school,className,section,pwHash,phone,verification_status || false,user_state || 'active']);
    res.json({ id: ins.rows[0].id });
  } catch (err) { next(err); }
}

async function updateUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (req.user.role !== 'admin' && req.user.id !== id) return res.status(403).json({ error: 'forbidden' });
    const allowed = ['name','dob','email','gender','school','class','section','phone','verification_status','user_state','password'];
    const fields = [];
    const vals = [];
    let idx = 1;
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        if (f === 'password') {
          const h = await hashPassword(req.body[f]);
          fields.push(`password_hash=$${idx++}`);
          vals.push(h);
        } else {
          fields.push(`${f}=$${idx++}`);
          vals.push(req.body[f]);
        }
      }
    }
    if (!fields.length) return res.status(400).json({ error: 'no_fields' });
    vals.push(id);
    const q = `UPDATE users SET ${fields.join(',')}, updated_at=now() WHERE id=$${vals.length}`;
    await db.query(q, vals);
    res.json({ message: 'updated' });
  } catch (err) { next(err); }
}

async function deleteUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    await db.query(`DELETE FROM users WHERE id=$1`, [id]);
    res.json({ message: 'deleted' });
  } catch (err) { next(err); }
}

// Get current logged-in user profile
async function getProfile(req, res, next) {
  try {
    console.log('=== getProfile called ===');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('req.user:', req.user);
    
    const userId = parseInt(req.user.id, 10); // Ensure it's an integer
    console.log('User ID extracted:', userId, 'Type:', typeof userId);
    
    if (isNaN(userId)) {
      console.error('Invalid user ID in token:', req.user.id);
      return res.status(401).json({ error: 'invalid_token' });
    }
    
    const result = await db.query(
      `SELECT id, role, name, username, dob, email, gender, school, class, section, phone, verification_status, user_state, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const userData = result.rows[0];
    console.log('=== getProfile response ===');
    console.log('User data:', userData);
    
    res.json(userData);
  } catch (err) {
    next(err);
  }
}

// Update current logged-in user profile
async function updateProfile(req, res, next) {
  try {
    const userId = parseInt(req.user.id, 10);
    const allowed = ['name', 'dob', 'email', 'gender', 'school', 'class', 'section', 'phone', 'password'];
    const fields = [];
    const vals = [];
    let idx = 1;
    
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        if (f === 'password') {
          const h = await hashPassword(req.body[f]);
          fields.push(`password_hash=$${idx++}`);
          vals.push(h);
        } else {
          fields.push(`${f}=$${idx++}`);
          vals.push(req.body[f]);
        }
      }
    }
    
    if (!fields.length) return res.status(400).json({ error: 'no_fields' });
    vals.push(userId);
    const q = `UPDATE users SET ${fields.join(',')}, updated_at=now() WHERE id=$${vals.length}`;
    await db.query(q, vals);
    res.json({ message: 'profile_updated' });
  } catch (err) { next(err); }
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser, getProfile, updateProfile };
