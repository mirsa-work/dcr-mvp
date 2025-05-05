module.exports = function makeDcrNo(branchCode, dateStr) {
    const d = new Date(dateStr);
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `DCR/${branchCode}/${mm}/${dd}`;
};
