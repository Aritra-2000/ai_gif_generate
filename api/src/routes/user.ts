import { Hono } from 'hono'
import { userController } from '../controllers/userController'
import { validate } from '../middleware/validator'
import { z } from 'zod'

const userRouter = new Hono()

// User ID param schema
const userIdParamSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
})

// 👤 Get user profile
userRouter.get('/:id/profile', validate(userIdParamSchema), userController.getProfile)

// 📹 Get user's videos
userRouter.get('/:id/videos', validate(userIdParamSchema), userController.getVideos)

// 🖼️ Get user's GIFs
userRouter.get('/:id/gifs', validate(userIdParamSchema), userController.getGifs)

export default userRouter 