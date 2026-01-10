const config = require('../../config.js')
Page({
  data: { articles: [], deleteMode: false, selectedIds: [], selectedMap: {} },
  onLoad() { this.fetchMyPosts() },
  onShow() { this.fetchMyPosts() },
  fetchMyPosts() {
    const token = wx.getStorageSync('token') || ''
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return }
    wx.request({
      url: `${config.api.article.user}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 10000,
      success: (res) => {
        const raw = Array.isArray(res.data) ? res.data : (res.data.items || [])
        const enhanced = raw.map(a => ({
          ...a,
          imgs: String(a.img || '').split(',').map(s => s.trim()).filter(s => !!s)
        }))
        this.setData({ articles: enhanced })
      }
    })
  },
  toggleDeleteMode() {
    const mode = !this.data.deleteMode
    this.setData({ deleteMode: mode })
    if (!mode) this.setData({ selectedIds: [], selectedMap: {} })
  },
  onToggleSelectTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    const map = { ...(this.data.selectedMap || {}) }
    const ids = new Set(this.data.selectedIds || [])
    if (map[id]) {
      delete map[id]
      ids.delete(id)
    } else {
      map[id] = true
      ids.add(id)
    }
    this.setData({ selectedMap: map, selectedIds: Array.from(ids) })
  },
  onSelectAllTap() {
    const list = this.data.articles || []
    const map = {}
    const ids = []
    for (let i = 0; i < list.length; i++) {
      const id = Number(list[i].id)
      map[id] = true
      ids.push(id)
    }
    this.setData({ selectedMap: map, selectedIds: ids })
  },
  onConfirmDeleteTap() {
    const ids = this.data.selectedIds || []
    if (!ids.length) { wx.showToast({ title: '未选择文章', icon: 'none' }); return }
    const token = wx.getStorageSync('token') || ''
    if (!token) { wx.showToast({ title: '请先登录', icon: 'none' }); wx.navigateTo({ url: '/pages/login/login' }); return }
    wx.showLoading({ title: '删除中...' })
    const requestDelete = (id) => new Promise((resolve) => {
      wx.request({
        url: `${config.api.article.delete}`,
        method: 'DELETE',
        header: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        data: { article_id: id },
        success: (res) => resolve(res.statusCode === 200),
        fail: () => resolve(false)
      })
    })
    Promise.all(ids.map(id => requestDelete(id))).then((results) => {
      const successIds = ids.filter((_, idx) => results[idx])
      const list = (this.data.articles || []).filter(a => !successIds.includes(Number(a.id)))
      this.setData({ articles: list, deleteMode: false, selectedIds: [], selectedMap: {} })
      wx.hideLoading()
      wx.showToast({ title: '已删除', icon: 'success' })
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '删除失败', icon: 'none' })
    })
  },
  onPreviewImages(e) {
    const aid = Number(e.currentTarget.dataset.id)
    const idx = Number(e.currentTarget.dataset.idx || 0)
    const list = this.data.articles || []
    const item = list.find(a => Number(a.id) === aid) || {}
    const urls = (item.imgs || [])
    if (!urls.length) return
    const current = urls[Math.max(0, Math.min(idx, urls.length - 1))]
    wx.previewImage({ urls, current })
  },
  onCardTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    const item = (this.data.articles || []).find(a => Number(a.id) === id) || { id }
    wx.navigateTo({ url: '/pages/article/detail', success: (res) => { res.eventChannel.emit('article', item) } })
  }
})
