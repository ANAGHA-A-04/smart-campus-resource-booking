import { ZodError } from 'zod';

export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!result.success) {
        const errors = result.error.errors.map((e) => ({
          field: e.path.slice(1).join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }

      req.validated = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}
