/* Ensures user can act only on their own branch unless ADMIN/VIEWER */
module.exports = function branchGuard(paramName = 'branchId') {
    return (req, res, next) => {
        const target = parseInt(req.params[paramName] || req.body.branch_id, 10);

        if (req.user.role === 'ADMIN' || req.user.role === 'VIEWER') {
            return next(); // all good
        }
        if (req.user.role === 'BRANCH' && req.user.bid === target) {
            return next();
        }
        return res.status(403).json({ error: 'Branch access denied' });
    };
};
