import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateQuery } from '../middleware/validation.middleware';
import { searchUsersSchema } from '../validators/user.validator';

const router = Router();

// 所有用户相关路由都需要认证
router.use(authenticate);

// 搜索用户
router.get('/search', validateQuery(searchUsersSchema), userController.searchUsers);

// 获取用户详情
router.get('/:id', userController.getUserById);

// 获取当前用户的行程列表
router.get('/me/trips', userController.getMyTrips);

export default router;