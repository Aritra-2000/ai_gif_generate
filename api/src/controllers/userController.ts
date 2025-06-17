import { Context } from 'hono'
import { PrismaClient } from '@prisma/client'
import { NotFoundError } from '../utils/errors'

const prisma = new PrismaClient()

export const userController = {
  // Get user profile
  async getProfile(c: Context) {
    try {
      const userId = c.get('validated')?.id
      
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401)
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              videos: true,
              gifs: true,
            },
          },
        },
      })

      if (!user) {
        return c.json({ error: 'User not found' }, 404)
      }

      return c.json(user)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return c.json({ error: 'Failed to fetch user profile' }, 500)
    }
  },

  // Get user's videos
  async getVideos(c: Context) {
    try {
      const userId = c.get('validated')?.id
      
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401)
      }

      const videos = await prisma.video.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { gifs: true },
          },
        },
      })

      return c.json(videos)
    } catch (error) {
      console.error('Error fetching user videos:', error)
      return c.json({ error: 'Failed to fetch videos' }, 500)
    }
  },

  // Get user's GIFs
  async getGifs(c: Context) {
    try {
      const userId = c.get('validated')?.id
      
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401)
      }

      const gifs = await prisma.gif.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          video: {
            select: {
              id: true,
              title: true,
              url: true,
            },
          },
        },
      })

      return c.json(gifs)
    } catch (error) {
      console.error('Error fetching user GIFs:', error)
      return c.json({ error: 'Failed to fetch GIFs' }, 500)
    }
  },

  // Update user profile
  async updateProfile(c: Context) {
    try {
      const userId = c.get('validated')?.id
      
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401)
      }

      const { name, email } = await c.req.json()

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return c.json(updatedUser)
    } catch (error) {
      console.error('Error updating user profile:', error)
      return c.json({ error: 'Failed to update profile' }, 500)
    }
  },

  // Delete user account
  async deleteAccount(c: Context) {
    try {
      const userId = c.get('validated')?.id
      
      if (!userId) {
        return c.json({ error: 'Authentication required' }, 401)
      }

      // Delete user and all related data (cascade delete)
      await prisma.user.delete({
        where: { id: userId },
      })

      return c.json({ message: 'Account deleted successfully' })
    } catch (error) {
      console.error('Error deleting user account:', error)
      return c.json({ error: 'Failed to delete account' }, 500)
    }
  },
}