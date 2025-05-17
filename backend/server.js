require('dotenv').config();
const express = require('express');
const cors = require('cors');          // if front‑end runs on another port

const authRoute = require('./routes/auth');
const formSpec = require('./routes/formSpec');
const dcrRoute = require('./routes/dcr');
const branchesRoute = require('./routes/branches');
const reportsRoutes = require('./routes/reports');

const authMw = require('./middleware/auth');
const role = require('./middleware/roleGuard');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* public routes */
app.use('/api', authRoute);

/* --- protected routes -------------------------------- */
app.use('/api', branchesRoute);
app.use('/api', dcrRoute);

app.use('/api', formSpec);

app.use('/api', reportsRoutes);

/* health */
app.get('/health', (_, res) => res.json({ ok: 1 }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API on', PORT));
