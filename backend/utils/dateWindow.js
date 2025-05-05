// Returns true if given yyyy-mm-dd string is within the last N days
module.exports = function inWindow(dateStr, days = 7) {
    const today = new Date();                        // local time
    const target = new Date(dateStr);
    const delta = (today - target) / (24 * 60 * 60 * 1000);
    return delta >= 0 && delta <= days;
};
