const config = require('../../config.js')
Page({
  data: { comments: [] },
  onLoad() { this.fetchMyComments() },
  fetchMyComments() {
    const token = wx.getStorageSync('token') || ''
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return }
    wx.request({
      url: `${config.api.article.user}/commentlist`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 10000,
      success: (res) => {
        const raw = Array.isArray(res.data) ? res.data : (res.data.items || [])
        const items = raw.map(c => ({
          id: c.id,
          article_id: c.article_id,
          parent_id: c.parent_id || 0,
          content: c.content || ''
        }))
        this.setData({ comments: items })
      }
    })
  },
  onCardTap(e) {
    const article_id = Number(e.currentTarget.dataset.id)
    const comment_id = Number(e.currentTarget.dataset.commentId)
    const parent_id = Number(e.currentTarget.dataset.parentId || 0)
    const item = { id: article_id, targetCommentId: comment_id, targetCommentParentId: parent_id }
    wx.navigateTo({ url: '/pages/article/detail', success: (res) => { res.eventChannel.emit('article', item) } })
  }
})
