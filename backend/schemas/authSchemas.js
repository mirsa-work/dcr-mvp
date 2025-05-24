const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128)
});

module.exports = { loginSchema };
