const config = require('../../config.js')
Page({
  data: { articles: [], page: 1, pageSize: 10, hasMore: true, loading: false, deleteMode: false, selectedIds: [], selectedMap: {} },
  onLoad() { this.fetchMyPosts(1) },
  onShow() { this.fetchMyPosts(1) },
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this.fetchMyPosts(this.data.page + 1)
  },
  fetchMyPosts(page = 1) {
    const token = wx.getStorageSync('token') || ''
    if (!token) { wx.navigateTo({ url: '/pages/login/login' }); return }
    this.setData({ loading: true })
    wx.request({
      url: `${config.api.article.user}?page=${page}&page_size=${this.data.pageSize}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
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
        const merged = page === 1 ? enhanced : (this.data.articles || []).concat(enhanced)
        if (token) {
          wx.request({
            url: `${config.api.article.likeIdList}`,
            method: 'GET',
            header: { Authorization: `Bearer ${token}` },
            success: (r) => {
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
                    merged[i] = { ...a, liked: likedSet.has(aid), commented: commentedSet.has(aid) }
                  }
                  this.setData({ articles: merged, page, hasMore })
                },
                fail: () => {
                  for (let i = 0; i < merged.length; i++) {
                    const a = merged[i]
                    const aid = Number(a.id)
                    merged[i] = { ...a, liked: likedSet.has(aid), commented: false }
                  }
                  this.setData({ articles: merged, page, hasMore })
                }
              })
            },
            fail: () => {
              for (let i = 0; i < merged.length; i++) {
                const a = merged[i]
                merged[i] = { ...a, liked: false, commented: false }
              }
              this.setData({ articles: merged, page, hasMore })
            }
          })
        } else {
          for (let i = 0; i < merged.length; i++) {
            const a = merged[i]
            merged[i] = { ...a, liked: false, commented: false }
          }
          this.setData({ articles: merged, page, hasMore })
        }
      },
      fail: () => { wx.showToast({ title: '网络异常', icon: 'none' }) },
      complete: () => { this.setData({ loading: false }) }
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
  },
  onScrollToLower() {
    if (!this.data.hasMore || this.data.loading) return
    this.fetchMyPosts(this.data.page + 1)
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
