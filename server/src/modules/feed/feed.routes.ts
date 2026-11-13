import { Router } from 'express'
import { feedController } from './feed.controller.js'

export const feedRouter = Router()

feedRouter.get('/posts', feedController)
