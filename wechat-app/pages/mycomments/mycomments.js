const config = require('../../config.js')
Page({
  data: { comments: [], deleteMode: false, selectedMap: {}, selectAll: false },
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
        this.setData({ comments: items, selectedMap: {}, selectAll: false })
      }
    })
  },
  onCardTap(e) {
    if (this.data.deleteMode) { return }
    const article_id = Number(e.currentTarget.dataset.id)
    const comment_id = Number(e.currentTarget.dataset.commentId)
    const parent_id = Number(e.currentTarget.dataset.parentId || 0)
    const item = { id: article_id, targetCommentId: comment_id, targetCommentParentId: parent_id }
    wx.navigateTo({ url: '/pages/article/detail', success: (res) => { res.eventChannel.emit('article', item) } })
  },
  toggleDeleteMode() {
    const next = !this.data.deleteMode
    this.setData({ deleteMode: next })
    if (!next) {
      this.setData({ selectedMap: {}, selectAll: false })
    }
  },
  onToggleSelectTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    const map = Object.assign({}, this.data.selectedMap)
    map[id] = !map[id]
    let all = true
    for (let i = 0; i < this.data.comments.length; i++) {
      const cid = this.data.comments[i].id
      if (!map[cid]) { all = false; break }
    }
    this.setData({ selectedMap: map, selectAll: all })
  },
  onSelectAllTap() {
    const next = !this.data.selectAll
    const map = {}
    if (next) {
      for (let i = 0; i < this.data.comments.length; i++) {
        map[this.data.comments[i].id] = true
      }
    }
    this.setData({ selectAll: next, selectedMap: map })
  },
  onConfirmDeleteTap() {
    const ids = Object.keys(this.data.selectedMap).filter(k => this.data.selectedMap[k]).map(k => Number(k))
    if (!ids.length) { wx.showToast({ title: '未选择评论', icon: 'none' }); return }
    const token = wx.getStorageSync('token') || ''
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return }
    wx.showModal({
      title: '确认删除',
      content: `确定删除选中的${ids.length}条评论吗？`,
      success: (res) => {
        if (!res.confirm) { return }
        wx.showLoading({ title: '删除中...', mask: true })
        let done = 0, failed = 0
        const next = () => {
          if (done + failed >= ids.length) {
            wx.hideLoading()
            if (failed === 0) {
              wx.showToast({ title: '删除成功', icon: 'success' })
            } else {
              wx.showToast({ title: `删除失败${failed}条`, icon: 'none' })
            }
            this.setData({ deleteMode: false, selectedMap: {}, selectAll: false })
            this.fetchMyComments()
            return
          }
          const id = ids[done + failed]
          wx.request({
            url: `${config.api.article.commentDelete}`,
            method: 'DELETE',
            data: { comment_id: id },
            header: { Authorization: `Bearer ${token}` },
            timeout: 10000,
            success: (r) => {
              if (r.statusCode === 200) { done++ } else { failed++ }
              next()
            },
            fail: () => { failed++; next() }
          })
        }
        next()
      }
    })
  }
})
