const config = require('../../config.js')

Page({
  data: { article: {}, comments: [], threads: [], commentText: '', commentFocus: false, liked: false, likedComments: {}, commentParentId: 0, commentPlaceholder: '我也来说一句', commentPage: 1, commentHasMore: true },

  onLoad(options) {
    const ec = this.getOpenerEventChannel && this.getOpenerEventChannel()
    if (ec && ec.on) {
      ec.on('article', (item) => {
        this.setData({ article: item, commentFocus: true, commentPlaceholder: '我也来说一句', commentPage: 1, commentHasMore: true, comments: [], threads: [] })
        this.fetchComments(item.id)
      })
    } else if (options && options.id) {
      const id = Number(options.id)
      this.setData({ article: { id }, commentFocus: true, commentPlaceholder: '我也来说一句', commentPage: 1, commentHasMore: true, comments: [], threads: [] })
      this.fetchComments(id)
    }
  },

  fetchComments(articleId) {
    wx.request({
      url: `${config.api.article.comments}?article_id=${articleId}&page=${this.data.commentPage}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode !== 200) {
          this.setData({ comments: [], threads: [] })
          wx.showToast({ title: '评论接口不可用', icon: 'none' })
          return
        }
        const incoming = Array.isArray(res.data) ? res.data : (res.data.items || [])
        const existed = this.data.comments || []
        const existsMap = {}
        for (let i = 0; i < existed.length; i++) { existsMap[existed[i].id] = 1 }
        const merged = existed.slice()
        let added = 0
        for (let i = 0; i < incoming.length; i++) {
          const c = incoming[i]
          if (!existsMap[c.id]) { merged.push(c); existsMap[c.id] = 1; added++ }
        }
        const idMap = {}
        for (let i = 0; i < merged.length; i++) { idMap[merged[i].id] = merged[i] }
        for (let i = 0; i < merged.length; i++) {
          const c = merged[i]
          const pid = Number(c.parent_id || 0)
          let name = ''
          if (pid > 0 && idMap[pid]) {
            const p = idMap[pid]
            if (Number(p.parent_id || 0) > 0) {
              name = p.username || ''
            }
          }
          c.reply_to = name
        }
        const rootChildrenMap = {}
        for (let i = 0; i < merged.length; i++) {
          const c = merged[i]
          let pid = Number(c.parent_id || 0)
          if (pid > 0) {
            let p = idMap[pid]
            while (p && Number(p.parent_id || 0) > 0) {
              p = idMap[Number(p.parent_id || 0)]
            }
            const rootId = p ? p.id : pid
            if (!rootChildrenMap[rootId]) rootChildrenMap[rootId] = []
            rootChildrenMap[rootId].push(c)
          }
        }
        const top = merged.filter(c => Number(c.parent_id || 0) === 0)
        const threads = top.map(c => ({ ...c, children: rootChildrenMap[c.id] || [], showReplies: false }))
        const hasMore = incoming.length === 5
        this.setData({ comments: merged, threads, commentHasMore: hasMore })
        if (hasMore && added > 0) {
          this.setData({ commentPage: this.data.commentPage + 1 })
          this.fetchComments(articleId)
        }
      }
    })
  },

  onCommentInput(e) { this.setData({ commentText: e.detail.value }) },

  onLikeCommentTap(e) {
    const pid = e.currentTarget.dataset.parentIndex
    const cid = e.currentTarget.dataset.childIndex
    const id = e.currentTarget.dataset.id
    const liked = !!this.data.likedComments[id]
    const threads = (this.data.threads || []).slice()
    if (typeof cid === 'number') {
      const c = threads[pid].children[cid] || {}
      const next = Math.max(0, (c.like_count || 0) + (liked ? -1 : 1))
      threads[pid].children[cid] = { ...c, like_count: next }
    } else {
      const c = threads[pid] || {}
      const next = Math.max(0, (c.like_count || 0) + (liked ? -1 : 1))
      threads[pid] = { ...c, like_count: next }
    }
    this.setData({ threads, likedComments: { ...this.data.likedComments, [id]: !liked } })
  },

  onReplyCommentTap(e) {
    const id = e.currentTarget.dataset.id
    const username = e.currentTarget.dataset.username || ''
    this.setData({ commentParentId: id, commentFocus: true, commentPlaceholder: username ? `回复 @${username}` : '回复评论' })
  },

  onToggleRepliesTap(e) {
    const idx = e.currentTarget.dataset.index
    const threads = (this.data.threads || []).slice()
    const c = threads[idx] || {}
    threads[idx] = { ...c, showReplies: !c.showReplies }
    this.setData({ threads })
  },

  onLikeTap() {
    const token = wx.getStorageSync('token') || ''
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    const id = this.data.article.id
    wx.request({
      url: `${config.api.article.like}`,
      method: 'POST',
      header: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      data: { article_id: id },
      success: (res) => {
        if (res.statusCode !== 200) {
          wx.showToast({ title: '点赞失败', icon: 'none' })
          return
        }
        const liked = !!(res.data && res.data.liked)
        const a = this.data.article
        const like_count = liked ? (a.like_count || 0) + 1 : Math.max(0, (a.like_count || 0) - 1)
        this.setData({ article: { ...a, like_count }, liked })
      },
      fail: () => { wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  },

  sendComment() {
    const content = (this.data.commentText || '').trim()
    if (!content) { wx.showToast({ title: '请输入评论', icon: 'none' }); return }

    const token = wx.getStorageSync('token') || ''
    wx.request({
      url: `${config.api.article.comment}`,
      method: 'POST',
      header: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      data: { article_id: this.data.article.id, parent_id: this.data.commentParentId || 0, content },
      success: (res) => {
        const { statusCode } = res
        if (statusCode === 200) {
          wx.showToast({ title: '评论成功', icon: 'success' })
          this.setData({ commentText: '', commentParentId: 0, commentPlaceholder: '我也来说一句' })
          const a = this.data.article
          this.setData({ article: { ...a, comment_count: (a.comment_count || 0) + 1 } })
          this.setData({ commentPage: 1, commentHasMore: true, comments: [], threads: [] })
          this.fetchComments(this.data.article.id)
        } else if (statusCode === 401) {
          wx.showToast({ title: '请先登录', icon: 'none' })
          wx.navigateTo({ url: '/pages/login/login' })
        } else {
          wx.showToast({ title: '评论失败', icon: 'none' })
        }
      },
      fail: () => { wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  }
})
