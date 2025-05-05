const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

/* Verifies JWT and attaches req.user */
function auth(req, res, next) {
    const hdr = req.headers.authorization;
    if (!hdr || !hdr.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing auth token' });
    }

    const token = hdr.split(' ')[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET); // -> { id, role, bid, iat, exp }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid / expired token' });
    }
}

module.exports = auth;
