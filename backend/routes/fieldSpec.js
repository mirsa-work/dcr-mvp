const express = require('express');
const fieldSpec = require('../config/field-spec.json');
const auth = require('../middleware/auth');

const router = express.Router();

/* All roles can read it */
router.get('/field-spec', auth, (req, res) => {
    res.json(fieldSpec);
});

module.exports = router;
