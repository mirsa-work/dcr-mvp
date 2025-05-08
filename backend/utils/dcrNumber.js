module.exports = function makeDcrNo(branchCode, dateStr, useYear = 'YYYY') {
    const d = new Date(dateStr);
    const yy = String(d.getUTCFullYear()).slice(-2);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const yearPart = useYear === 'YY' ? yy : (useYear === 'YYYY' ? yyyy : '');
    return yearPart
        ? `DCR/${branchCode}/${yearPart}/${mm}/${dd}`
        : `DCR/${branchCode}/${mm}/${dd}`;
};