const config = require('../../config.js')
Page({
  data: { articles: [] },
  onLoad() { this.fetchMyLikes() },
  fetchMyLikes() {
    const token = wx.getStorageSync('token') || ''
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return }
    wx.request({
      url: `${config.api.article.likedList}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 10000,
      success: (res) => {
        const raw = Array.isArray(res.data) ? res.data : (res.data.items || [])
        const items = raw.map(a => ({
          id: a.id,
          tag: a.tag || '',
          content: a.content || '',
          imgs: String(a.img || '').split(',').map(s => s.trim()).filter(s => !!s)
        }))
        this.setData({ articles: items })
      }
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
