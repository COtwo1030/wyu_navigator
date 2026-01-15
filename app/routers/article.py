from fastapi import APIRouter, Depends, Body, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.article import ArticleData, ArticleCommentData
from app.services.article import ArticleService
from app.dependencies import get_session, get_current_user_id

router = APIRouter(prefix="/article",tags=["文章"])

# 创建文章
@router.post("/create", status_code=201,description="创建文章")
async def create_article(
    data: ArticleData,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await ArticleService(session).create(data, user_id)

# 删除文章
@router.delete("/delete", status_code=200,description="删除文章")
async def delete_article(
    article_id: int = Body(..., embed=True),
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await ArticleService(session).delete(article_id, user_id)

# 按时间倒序分页获取最新的文章
@router.get("/page", status_code=200,description="按时间倒序分页获取最新的文章")
async def get_articles_by_page(
    page: int = Query(1, description="页码"),
    page_size: int = Query(10, description="每页数量"),
    session: AsyncSession = Depends(get_session),
):
    return await ArticleService(session).get_by_page(page, page_size)

# 文章评论
@router.post("/{article_id}/comments", status_code=201,description="文章评论")
async def comment_article(
    article_id: int,
    data: ArticleCommentData,
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id), # token不放参数更安全
):
    return await ArticleService(session).comment(article_id, data, user_id)

# 删除文章评论
@router.delete("/comment/delete", status_code=200,description="删除文章评论")
async def delete_comment(
    comment_id: int = Body(..., embed=True),
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await ArticleService(session).delete_comment(comment_id, user_id)

# 按时间顺序获取文章评论
@router.get("/comments", status_code=200,description="按时间顺序获取文章评论（一页5条）")
async def get_article_comments(
    article_id: int,
    page: int = 1,
    session: AsyncSession = Depends(get_session),
):
    return await ArticleService(session).get_comments(article_id, page)

# 文章点赞/取消点赞
@router.post("/like", status_code=200,description="文章点赞/取消点赞")
async def like_article(
    article_id: int = Body(..., embed=True),
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await ArticleService(session).like(article_id, user_id)

# 文章评论点赞/取消点赞
@router.post("/comment/like", status_code=200,description="评论点赞/取消点赞")
async def like_comment(
    comment_id: int = Body(..., embed=True),
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await ArticleService(session).like_comment(comment_id, user_id)

# 查询用户点赞的文章id列表
@router.get("/likeidlist", status_code=200,description="查询用户点赞的文章id列表")
async def get_liked_articles(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await ArticleService(session).get_liked_articles(user_id)

# 查询用户点赞的评论id列表
@router.get("/comment/likelist", status_code=200,description="查询用户点赞的评论id列表")
async def get_liked_comments(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await ArticleService(session).get_liked_comments(user_id)

# 查询用户评论过的文章id列表
@router.get("/comment/articlelist", status_code=200,description="查询用户评论过的文章id列表")
async def get_commented_articles(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await ArticleService(session).get_commented_articles(user_id)

# 浏览量增加
@router.post("/view", status_code=200,description="浏览量增加")
async def increase_view_count(
    article_id: int = Body(..., embed=True),
    session: AsyncSession = Depends(get_session),
    authorization: str | None = Header(default=None),
):
    if authorization and authorization.lower().startswith("bearer "):
        try:
            user_id = await get_current_user_id(authorization)
        except:
            user_id = 0
    else:
        user_id = 0
    return await ArticleService(session).increase_view_count(article_id, user_id)

# 查询用户发表的文章
@router.get("/user", status_code=200,description="查询用户发表的文章")
async def get_user_articles(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    return await ArticleService(session).get_by_user(user_id)

# 查询用户点赞过的文章
@router.get("/user/likelist", status_code=200,description="查询用户点赞的文章列表")
async def get_liked_articles(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    # 查询用户点赞的文章id列表
    articles_ids = await ArticleService(session).get_liked_articles(user_id)
    # 查询用户点赞的文章列表
    articles = await ArticleService(session).get_articles_by_article_ids(articles_ids)
    return articles

# 查询用户的评论
@router.get("/user/commentlist", status_code=200,description="查询用户的评论列表")
async def get_user_comments(
    session: AsyncSession = Depends(get_session),
    user_id: int = Depends(get_current_user_id),
):
    return await ArticleService(session).get_comments_by_user_id(user_id)
