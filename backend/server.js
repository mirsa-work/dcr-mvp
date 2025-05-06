require('dotenv').config();
const express = require('express');
const cors = require('cors');          // if front‑end runs on another port

const authRoute = require('./routes/auth');
const fieldSpecRoute = require('./routes/fieldSpec');
const dcrRoute = require('./routes/dcr');

const authMw = require('./middleware/auth');
const role = require('./middleware/roleGuard');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* public routes */
app.use('/api', authRoute);

/* --- protected routes -------------------------------- */
app.use('/api', dcrRoute);

app.use('/api', fieldSpecRoute);

/* --- protected routes skeleton -------------------------------- */
app.get('/api/branches', authMw, async (req, res) => {
  /* simple placeholder so you can test the guards */
  res.json({ msg: 'You are authenticated', user: req.user });
});

/* example: only ADMINs reach this */
app.get('/api/admin-test', authMw, role('ADMIN'), (req, res) => {
  res.json({ secret: '42' });
});

/* health */
app.get('/health', (_, res) => res.json({ ok: 1 }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API on', PORT));
