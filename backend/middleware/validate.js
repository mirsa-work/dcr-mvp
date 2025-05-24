const { ZodError } = require('zod');
const { ApiError }  = require('../utils/core');

/**
 * Returns an Express middleware that validates req using the given schemas.
 *
 * @param {Object} opts
 * @param {ZodSchema=} opts.body
 * @param {ZodSchema=} opts.params
 * @param {ZodSchema=} opts.query
 */
module.exports = function validate({ body, params, query }) {
  return (req, res, next) => {
    try {
      if (body)   req.body   = body.parse(req.body);
      if (params) req.params = params.parse(req.params);
      if (query)  req.query  = query.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const msgs = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return next(new ApiError('Validation error', 400, msgs));
      }
      next(err);
    }
  };
};
