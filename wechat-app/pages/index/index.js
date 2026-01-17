const config = require('../../config.js')
Page({
  data: {
    articles: [],
    displayArticles: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false,
    categories: ['全部','求助','闲置','跑腿'],
    activeCategoryIndex: 0
  },
  onPreviewImages(e) {
    const aid = Number(e.currentTarget.dataset.id)
    const idx = Number(e.currentTarget.dataset.idx || 0)
    const list = this.data.displayArticles || []
    const item = list.find(a => Number(a.id) === aid) || {}
    const urls = (item.imgs || [])
    if (!urls.length) return
    const current = urls[Math.max(0, Math.min(idx, urls.length - 1))]
    wx.previewImage({ urls, current })
  },
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
    this.setData({ articles: [], displayArticles: [], page: 1, hasMore: true })
    this.fetchPage(1)
  },
  updateDisplay() {
    const list = this.data.articles || []
    this.setData({ displayArticles: list })
  },
  onCategoryTap(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    if (Number.isInteger(idx)) {
      this.setData({ activeCategoryIndex: idx, articles: [], displayArticles: [], page: 1, hasMore: true })
      this.fetchPage(1)
    }
  },
  fetchPage(page) {
    this.setData({ loading: true })
    const idx = this.data.activeCategoryIndex
    const cat = (this.data.categories || [])[idx] || '全部'
    const baseUrl = (cat === '全部') ? `${config.api.article.page}` : `${config.api.article.tag(cat)}`
    wx.request({
      url: `${baseUrl}?page=${page}&page_size=${this.data.pageSize}`,
      method: 'GET',
      timeout: 10000,
      success: (res) => {
        const pageSize = this.data.pageSize
        const raw = Array.isArray(res.data) ? res.data : (res.data.items || [])
        const enhanced = raw.map(a => {
          const gender = a.gender || ''
          const year = a.year || ''
          return {
            ...a,
            avatar: a.avatar || '/images/tabbar/avator.png',
            genderIcon: gender === '男' ? 'man.png' : (gender === '女' ? 'women.png' : ''),
            yearText: year ? `${year}级` : '',
            imgs: String(a.img || '').split(',').map(s => s.trim()).filter(s => !!s)
          }
        })
        const hasMore = enhanced.length === pageSize
        const merged = page === 1 ? enhanced : this.data.articles.concat(enhanced)
        const token = wx.getStorageSync('token') || ''
        const isLoggedIn = !!token
        if (isLoggedIn) {
          wx.request({
            url: `${config.api.article.likeIdList}`,
            method: 'GET',
            header: { Authorization: `Bearer ${token}` },
            success: (r) => {
              if (r.statusCode !== 200) {
                for (let i = 0; i < merged.length; i++) {
                  const a = merged[i]
                  merged[i] = { ...a, liked: false, commented: false }
                }
                try { wx.removeStorageSync('token'); wx.removeStorageSync('username') } catch (e) {}
                this.setData({ articles: merged, page, hasMore })
                this.updateDisplay()
                return
              }
              const ids = Array.isArray(r.data) ? r.data : []
              const likedSet = new Set(ids.map((id) => Number(id)))
              wx.request({
                url: `${config.api.article.commentedArticleList}`,
                method: 'GET',
                header: { Authorization: `Bearer ${token}` },
                success: (cr) => {
                  let commentedSet
                  if (cr.statusCode === 200) {
                    const cids = Array.isArray(cr.data) ? cr.data : []
                    commentedSet = new Set(cids.map((id) => Number(id)))
                  } else {
                    commentedSet = new Set()
                  }
                  for (let i = 0; i < merged.length; i++) {
                    const a = merged[i]
                    const aid = Number(a.id)
                    const isLiked = likedSet.has(aid)
                    const isCommented = commentedSet.has(aid)
                    merged[i] = { ...a, liked: isLiked, commented: isCommented }
                  }
                  this.setData({ articles: merged, page, hasMore })
                  this.updateDisplay()
                },
                fail: () => {
                  for (let i = 0; i < merged.length; i++) {
                    const a = merged[i]
                    const aid = Number(a.id)
                    const isLiked = likedSet.has(aid)
                    merged[i] = { ...a, liked: isLiked, commented: false }
                  }
                  this.setData({ articles: merged, page, hasMore })
                  this.updateDisplay()
                }
              })
            },
            fail: () => {
              for (let i = 0; i < merged.length; i++) {
                const a = merged[i]
                merged[i] = { ...a, liked: false, commented: false }
              }
              this.setData({ articles: merged, page, hasMore })
              this.updateDisplay()
            }
          })
        } else {
          for (let i = 0; i < merged.length; i++) {
            const a = merged[i]
            merged[i] = { ...a, liked: false, commented: false }
          }
          this.setData({ articles: merged, page, hasMore })
          this.updateDisplay()
        }
      },
      fail: () => { wx.showToast({ title: '网络异常', icon: 'none' }) },
      complete: () => { this.setData({ loading: false }) }
    })
  },
  onLikeArticleTap(e) {
    const token = wx.getStorageSync('token') || ''
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    const id = e.currentTarget.dataset.id
    wx.request({
      url: `${config.api.article.like}`,
      method: 'POST',
      header: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      data: { article_id: id },
      success: (res) => {
        if (res.statusCode === 401) {
          wx.showToast({ title: '请先登录', icon: 'none' })
          wx.navigateTo({ url: '/pages/login/login' })
          return
        }
        if (res.statusCode !== 200) {
          wx.showToast({ title: '操作失败', icon: 'none' })
          return
        }
        const liked = !!(res.data && res.data.liked)
        const list = (this.data.articles || []).slice()
        const aid = Number(id)
        const idx = list.findIndex(a => Number(a.id) === aid)
        if (idx >= 0) {
          const a = list[idx]
          const like_count = liked ? (a.like_count || 0) + 1 : Math.max(0, (a.like_count || 0) - 1)
          list[idx] = { ...a, like_count, liked }
          this.setData({ articles: list })
          this.updateDisplay()
        }
      },
      fail: () => { wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  },
  onCommentTap(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.articles || []).find(a => a.id === id) || { id }
    wx.navigateTo({
      url: `/pages/article/detail?id=${id}`,
      success: (res) => { res.eventChannel.emit('article', { ...item, openComment: true }) }
    })
  },
  onCardTap(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.articles || []).find(a => a.id === id) || {}
    wx.navigateTo({
      url: `/pages/article/detail?id=${id}`,
      success: (res) => { res.eventChannel.emit('article', item) }
    })
  }
})
