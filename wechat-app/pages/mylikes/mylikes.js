const config = require('../../config.js')
Page({
  data: { articles: [], page: 1, pageSize: 10, hasMore: true, loading: false, likedIds: [], commentedSet: {} },
  onLoad() { this.initAndFetch() },
  initAndFetch() {
    const token = wx.getStorageSync('token') || ''
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return }
    // 一次性获取点赞ID列表并缓存
    wx.request({
      url: `${config.api.article.likeIdList}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (r) => {
        const ids = Array.isArray(r.data) ? r.data : []
        const likedIds = ids.map((id) => Number(id)).filter((n) => Number.isInteger(n))
        this.setData({ likedIds, page: 1, hasMore: true, articles: [] })
        // 一次性获取已评论文章ID集合
        wx.request({
          url: `${config.api.article.commentedArticleList}`,
          method: 'GET',
          header: { Authorization: `Bearer ${token}` },
          success: (cr) => {
            const cids = Array.isArray(cr.data) ? cr.data : []
            const commentedSet = {}
            for (let i = 0; i < cids.length; i++) commentedSet[Number(cids[i])] = 1
            this.setData({ commentedSet })
            this.fetchPage(1)
          },
          fail: () => { this.setData({ commentedSet: {} }); this.fetchPage(1) }
        })
      }
    })
  },
  buildIdsParam(ids) { return ids.map((id) => `article_ids=${encodeURIComponent(id)}`).join('&') },
  fetchPage(page = 1) {
    const token = wx.getStorageSync('token') || ''
    const ids = this.data.likedIds || []
    if (!token || !ids.length) { return }
    const pageSize = this.data.pageSize
    const start = (page - 1) * pageSize
    const pageIds = ids.slice(start, start + pageSize)
    if (!pageIds.length) { this.setData({ hasMore: false }); return }
    this.setData({ loading: true })
    const qp = this.buildIdsParam(pageIds)
    wx.request({
      url: `${config.api.article.likedList}?page=${page}&page_size=${pageSize}&${qp}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        const raw = Array.isArray(res.data) ? res.data : (res.data.items || [])
        const enhanced = raw.map(a => {
          const gender = a.gender || ''
          const year = a.year || ''
          return {
            ...a,
            avatar: a.avatar || '/images/tabbar/avator.png',
            genderIcon: gender === '男' ? 'man.png' : (gender === '女' ? 'women.png' : ''),
            yearText: year ? `${year}级` : '',
            imgs: String(a.img || '').split(',').map(s => s.trim()).filter(s => !!s),
            liked: true,
            commented: !!this.data.commentedSet[Number(a.id)]
          }
        })
        const map = {}
        for (let i = 0; i < enhanced.length; i++) { map[Number(enhanced[i].id)] = enhanced[i] }
        const ordered = pageIds.map(id => map[Number(id)]).filter(Boolean)
        const hasMore = ordered.length === pageSize
        const merged = page === 1 ? ordered : (this.data.articles || []).concat(ordered)
        this.setData({ articles: merged, page, hasMore })
      },
      complete: () => { this.setData({ loading: false }) }
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
  },
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this.fetchPage(this.data.page + 1)
  },
  onScrollToLower() {
    if (!this.data.hasMore || this.data.loading) return
    this.fetchPage(this.data.page + 1)
  },
  onLikeArticleTap(e) {
    const token = wx.getStorageSync('token') || ''
    if (!token) { wx.showToast({ title: '请先登录', icon: 'none' }); wx.navigateTo({ url: '/pages/login/login' }); return }
    const id = Number(e.currentTarget.dataset.id)
    wx.request({
      url: `${config.api.article.like}`,
      method: 'POST',
      header: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      data: { article_id: id },
      success: (res) => {
        if (res.statusCode === 401) { wx.showToast({ title: '请先登录', icon: 'none' }); wx.navigateTo({ url: '/pages/login/login' }); return }
        if (res.statusCode !== 200) { wx.showToast({ title: '操作失败', icon: 'none' }); return }
        const liked = !!(res.data && res.data.liked)
        const list = (this.data.articles || []).slice()
        const idx = list.findIndex(a => Number(a.id) === id)
        if (idx >= 0) {
          const a = list[idx]
          const like_count = liked ? (a.like_count || 0) + 1 : Math.max(0, (a.like_count || 0) - 1)
          list[idx] = { ...a, like_count, liked }
          this.setData({ articles: list })
        }
      },
      fail: () => { wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  },
  onCommentTap(e) {
    const id = Number(e.currentTarget.dataset.id)
    const item = (this.data.articles || []).find(a => Number(a.id) === id) || { id }
    wx.navigateTo({ url: '/pages/article/detail', success: (res) => { res.eventChannel.emit('article', { ...item, openComment: true }) } })
  }
})
