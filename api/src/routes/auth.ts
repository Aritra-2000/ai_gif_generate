import { Hono } from 'hono';
import { authController } from '../controllers/authController';
import { validate } from '../middleware/validator';
import { z } from 'zod';

const authRouter = new Hono();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Routes
authRouter.post('/register', validate(registerSchema), authController.register);
authRouter.post('/login', validate(loginSchema), authController.login);

export default authRouter; 