const config = require('../../config.js')
Page({
  data: { articles: [] },
  onLoad() { this.fetchMyPosts() },
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
        const enhanced = raw.map(a => {
          const gender = a.gender || ''
          const year = a.year || ''
          return {
            ...a,
            avatar: a.avatar || '/images/tabbar/avator.png',
            genderIcon: gender === '男' ? 'man.png' : (gender === '女' ? 'women.png' : ''),
            yearText: year ? `${year}级` : ''
          }
        })
        this.setData({ articles: enhanced })
      }
    })
  },
  onCardTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    const item = (this.data.articles || []).find(a => Number(a.id) === id) || { id }
    wx.navigateTo({ url: '/pages/article/detail', success: (res) => { res.eventChannel.emit('article', item) } })
  }
})