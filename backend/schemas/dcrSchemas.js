const { z } = require('zod');

const isoDate = () =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const numericField = z
  .preprocess(val => (val === '' || val === null ? 0 : val), z.coerce.number())
  .refine(v => !Number.isNaN(v), { message: 'Must be a number' });

const createDcrBody = z.object({
  date: isoDate(),
  // every other key is optional numeric; catch-all approach:
}).catchall(numericField);

const updateDcrBody = createDcrBody.partial(); // all optional

module.exports = { createDcrBody, updateDcrBody };
