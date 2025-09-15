import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth'

const prisma = new PrismaClient()
const router = Router()

// 列表
router.get('/list', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1')), 1)
    const pageSize = Math.min(Math.max(parseInt(String(req.query.pageSize || '10')), 1), 50)
    const category = String(req.query.category || 'all')
    const search = String(req.query.search || '')
    const sort = String(req.query.sort || 'latest') // latest | hot

    const where: any = {}
    if (category && category !== 'all') where.category = category
    if (search) where.content = { contains: search }

    const orderBy = sort === 'hot' ? [{ likeCount: 'desc' as const }, { createdAt: 'desc' as const }] : [{ createdAt: 'desc' as const }]

    const [total, list] = await Promise.all([
      prisma.forumPost.count({ where }),
      prisma.forumPost.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          content: true,
          category: true,
          images: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
          createdAt: true,
          author: { select: { id: true, nickname: true, username: true, avatar: true } },
        },
      }),
    ])

    const userId = String((req as any).user?.id || '')
    const ids = list.map((i) => i.id)
    let likedMap: Record<string, boolean> = {}
    if (userId && ids.length) {
      const likes = await prisma.forumLike.findMany({ where: { userId, postId: { in: ids } }, select: { postId: true } })
      likedMap = likes.reduce((acc, cur) => { acc[cur.postId] = true; return acc }, {} as Record<string, boolean>)
    }

    res.json({
      code: 0,
      msg: 'ok',
      data: {
        total,
        page,
        pageSize,
        list: list.map((p) => ({
          id: p.id,
          author: p.author.nickname || p.author.username,
          avatar: p.author.avatar,
          content: p.content,
          images: (p.images as any) || [],
          tags: [],
          likes: p.likeCount,
          liked: !!likedMap[p.id],
          comments: p.commentCount,
          shares: p.shareCount,
          category: p.category,
          createdAt: new Date(p.createdAt).getTime(),
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// 详情
router.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id)
    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: {
        id: true,
        content: true,
        category: true,
        images: true,
        likeCount: true,
        commentCount: true,
        shareCount: true,
        createdAt: true,
        author: { select: { id: true, nickname: true, username: true, avatar: true } },
      },
    })
    if (!post) return res.status(404).json({ code: 404, msg: '帖子不存在' })

    const userId = String((req as any).user?.id || '')
    let liked = false
    if (userId) {
      const like = await prisma.forumLike.findUnique({ where: { postId_userId: { postId: id, userId } } })
      liked = !!like
    }

    res.json({
      code: 0,
      msg: 'ok',
      data: {
        id: post.id,
        author: post.author.nickname || post.author.username,
        avatar: post.author.avatar,
        content: post.content,
        images: (post.images as any) || [],
        tags: [],
        likes: post.likeCount,
        liked,
        comments: post.commentCount,
        shares: post.shareCount,
        category: post.category,
        createdAt: new Date(post.createdAt).getTime(),
      },
    })
  } catch (err) {
    next(err)
  }
})

// 评论列表
router.get('/:id/comments', async (req, res, next) => {
  try {
    const postId = String(req.params.id)
    const page = Math.max(parseInt(String(req.query.page || '1')), 1)
    const pageSize = Math.min(Math.max(parseInt(String(req.query.pageSize || '10')), 1), 50)

    const [total, list] = await Promise.all([
      prisma.forumComment.count({ where: { postId, parentId: null } }),
      prisma.forumComment.findMany({
        where: { postId, parentId: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          content: true,
          createdAt: true,
          likeCount: true,
          user: { select: { id: true, nickname: true, username: true, avatar: true } },
          replies: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              likeCount: true,
              user: { select: { id: true, nickname: true, username: true, avatar: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: 3,
          },
        },
      }),
    ])

    res.json({
      code: 0,
      msg: 'ok',
      data: {
        total,
        page,
        pageSize,
        list: list.map((c) => ({
          id: c.id,
          author: c.user.nickname || c.user.username,
          avatar: c.user.avatar,
          content: c.content,
          likes: c.likeCount,
          createdAt: new Date(c.createdAt).getTime(),
          replies: c.replies.map((r) => ({
            id: r.id,
            author: r.user.nickname || r.user.username,
            avatar: r.user.avatar,
            content: r.content,
            likes: r.likeCount,
            createdAt: new Date(r.createdAt).getTime(),
          })),
        })),
      },
    })
  } catch (err) {
    next(err)
  }
})

// 新增评论
router.post('/:id/comments', authenticateToken as any, async (req, res, next) => {
  try {
    const userId = String((req as any).user?.id || '')
    if (!userId) return res.status(401).json({ code: 401, msg: '未登录' })
    const postId = String(req.params.id)
    const { content, parentId } = req.body || {}
    if (!content) return res.status(400).json({ code: 400, msg: '内容不能为空' })

    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.forumComment.create({ data: { postId, userId, content, parentId } })
      await tx.forumPost.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } })
      return c
    })
    res.json({ code: 0, msg: 'ok', data: { id: created.id } })
  } catch (err) {
    next(err)
  }
})

// 分享计数
router.post('/:id/share', async (req, res, next) => {
  try {
    const postId = String(req.params.id)
    await prisma.forumPost.update({ where: { id: postId }, data: { shareCount: { increment: 1 } } })
    const updated = await prisma.forumPost.findUnique({ where: { id: postId }, select: { shareCount: true } })
    res.json({ code: 0, msg: 'ok', data: { shares: updated?.shareCount || 0 } })
  } catch (err) {
    next(err)
  }
})
// 创建
router.post('/create', authenticateToken as any, async (req, res, next) => {
  try {
    const userId = String((req as any).user?.id || '')
    if (!userId) return res.status(401).json({ code: 401, msg: '未登录' })
    const { content, images = [], category } = req.body || {}
    if (!content || !category) return res.status(400).json({ code: 400, msg: '参数错误' })

    const post = await prisma.forumPost.create({
      data: { authorId: userId, content, images, category },
      select: { id: true },
    })
    res.json({ code: 0, msg: 'ok', data: { id: post.id } })
  } catch (err) {
    next(err)
  }
})

// 点赞切换
router.post('/:id/like', authenticateToken as any, async (req, res, next) => {
  try {
    const userId = String((req as any).user?.id || '')
    if (!userId) return res.status(401).json({ code: 401, msg: '未登录' })
    const postId = String(req.params.id)

    const exist = await prisma.forumLike.findUnique({ where: { postId_userId: { postId, userId } } })
    if (exist) {
      await prisma.$transaction([
        prisma.forumLike.delete({ where: { id: exist.id } }),
        prisma.forumPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
      ])
      const updated = await prisma.forumPost.findUnique({ where: { id: postId }, select: { likeCount: true } })
      return res.json({ code: 0, msg: 'ok', data: { liked: false, likes: updated?.likeCount || 0 } })
    } else {
      await prisma.$transaction([
        prisma.forumLike.create({ data: { postId, userId } }),
        prisma.forumPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
      ])
      const updated = await prisma.forumPost.findUnique({ where: { id: postId }, select: { likeCount: true } })
      return res.json({ code: 0, msg: 'ok', data: { liked: true, likes: updated?.likeCount || 0 } })
    }
  } catch (err) {
    next(err)
  }
})

export default router


