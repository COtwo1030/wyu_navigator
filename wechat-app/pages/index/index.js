const config = require('../../config.js')
Page({
  data: { articles: [], page: 1, pageSize: 5, hasMore: true, loading: false },
  navToPost() { wx.navigateTo({ url: '/pages/post/post' }) },
  onShow() { this.resetAndFetch() },
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this.fetchPage(this.data.page + 1)
  },
  onScrollToLower() {
    if (!this.data.hasMore || this.data.loading) return
    this.fetchPage(this.data.page + 1)
  },
  resetAndFetch() {
    this.setData({ articles: [], page: 1, hasMore: true })
    this.fetchPage(1)
  },
  fetchPage(page) {
    this.setData({ loading: true })
    wx.request({
      url: `${config.api.article.page}?page=${page}`,
      method: 'GET',
      timeout: 10000,
      success: (res) => {
        const pageSize = this.data.pageSize
        const list = Array.isArray(res.data) ? res.data : (res.data.items || [])
        const hasMore = list.length === pageSize
        this.setData({
          articles: page === 1 ? list : this.data.articles.concat(list),
          page,
          hasMore
        })
      },
      fail: () => { wx.showToast({ title: '网络异常', icon: 'none' }) },
      complete: () => { this.setData({ loading: false }) }
    })
  },
  onCommentTap(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.articles || []).find(a => a.id === id) || { id }
    wx.navigateTo({
      url: '/pages/article/detail',
      success: (res) => { res.eventChannel.emit('article', item) }
    })
  },
  onCardTap(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.articles || []).find(a => a.id === id) || {}
    wx.navigateTo({
      url: '/pages/article/detail',
      success: (res) => { res.eventChannel.emit('article', item) }
    })
  }
})
