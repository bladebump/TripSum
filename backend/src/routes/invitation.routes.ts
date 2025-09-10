import { Router } from 'express';
import { invitationController } from '../controllers/invitation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateQuery } from '../middleware/validation.middleware';
import { invitationListQuerySchema } from '../validators/invitation.validator';

const router = Router();

// 所有邀请相关路由都需要认证
router.use(authenticate);

// 获取我的邀请列表
router.get('/', validateQuery(invitationListQuerySchema), invitationController.getMyInvitations);

// 获取邀请详情
router.get('/:id', invitationController.getInvitationDetail);

// 接受邀请
router.post('/:id/accept', invitationController.acceptInvitation);

// 拒绝邀请
router.post('/:id/reject', invitationController.rejectInvitation);

// 撤销邀请（仅发送者可操作）
router.delete('/:id', invitationController.cancelInvitation);

export default router;