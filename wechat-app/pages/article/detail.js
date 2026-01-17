const config = require('../../config.js')
const normalizeImgs = (val) => {
  if (Array.isArray(val)) return val.filter(s => !!s)
  return String(val || '').split(',').map(s => s.trim()).filter(s => !!s)
}

Page({
  data: { article: {}, comments: [], threads: [], commentText: '', commentFocus: false, liked: false, likedComments: {}, commentParentId: 0, commentPlaceholder: '我也来说一句', commentPage: 1, commentHasMore: true, targetCommentId: 0, targetCommentParentId: 0, targetLoadTries: 0, commentImages: [], hasImages: false, canAddMore: true, canShowAdd: false, showSendButton: false, inputExpanded: false, inputClass: 'comment-input', showNoMoreComments: false },

  onLoad(options) {
    const id = Number(options && options.id || 0)
    const ec = this.getOpenerEventChannel && this.getOpenerEventChannel()
    if (ec && ec.on) {
      ec.on('article', (item) => {
        const gender = item.gender || ''
        const year = item.year || ''
        const genderIcon = item.genderIcon || (gender === '男' ? 'man.png' : (gender === '女' ? 'women.png' : ''))
        const yearText = item.yearText || (year ? `${year}级` : '')
        const enhanced = { ...item, avatar: item.avatar || '/images/tabbar/avator.png', genderIcon, yearText, imgs: normalizeImgs(item.img || item.imgs) }
        const wantFocus = !!item.openComment
        this.setData({ article: enhanced, liked: !!enhanced.liked, commentFocus: wantFocus, commentPlaceholder: '我也来说一句', commentPage: 1, commentHasMore: true, comments: [], threads: [], targetCommentId: Number(item.targetCommentId || 0), targetCommentParentId: Number(item.targetCommentParentId || 0), targetLoadTries: 0 })

        this.increaseView(item.id)
        this.checkLikeStatus(item.id)
        this.checkCommentStatus(item.id)
        this.fetchArticleDetail(item.id)
        this.fetchComments(item.id)
      })
    }
    if (id > 0 && !(this.data.article && this.data.article.id)) {
      const tcid = Number(options && options.comment_id || 0)
      const tpid = Number(options && options.parent_id || 0)
      this.setData({ article: { id }, liked: false, commentFocus: false, commentPlaceholder: '我也来说一句', commentPage: 1, commentHasMore: true, comments: [], threads: [], targetCommentId: tcid, targetCommentParentId: tpid, targetLoadTries: 0 })
      this.increaseView(id)
      this.checkLikeStatus(id)
      this.checkCommentStatus(id)
      this.fetchArticleDetail(id)
      this.fetchComments(id)
    }
  },
  onPreviewImagesTap(e) {
    const idx = Number(e.currentTarget.dataset.idx || 0)
    const urls = (this.data.article.imgs || [])
    if (!urls.length) return
    const current = urls[Math.max(0, Math.min(idx, urls.length - 1))]
    wx.previewImage({ urls, current })
  },
  onPreviewCommentImageTap(e) {
    const idx = Number(e.currentTarget.dataset.idx || 0)
    const urls = e.currentTarget.dataset.urls || []
    if (!urls || !urls.length) return
    const current = urls[Math.max(0, Math.min(idx, urls.length - 1))]
    wx.previewImage({ urls, current })
  },

  increaseView(id) {
    const uid = wx.getStorageSync('user_id')
    const header = { 'content-type': 'application/json' }
    if (uid !== undefined && uid !== null) {
      const num = Number(uid)
      header['user_id'] = String(isNaN(num) ? 0 : num)
    }
    wx.request({
      url: `${config.api.article.view}`,
      method: 'POST',
      header,
      data: { article_id: id },
      success: (res) => {
        if (res.statusCode === 200) {
          const a = this.data.article || { id }
          this.setData({ article: { ...a, view_count: (a.view_count || 0) + 1 } })
        }
      }
    })
  },

  fetchArticleDetail(id) {
    wx.request({
      url: config.api.article.detail(id),
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const item = res.data
          const gender = item.gender || ''
          const year = item.year || ''
          const genderIcon = item.genderIcon || (gender === '男' ? 'man.png' : (gender === '女' ? 'women.png' : ''))
          const yearText = item.yearText || (year ? `${year}级` : '')
          const nextImgs = normalizeImgs(item.img || item.imgs)
          const enhanced = { ...item, avatar: item.avatar || '/images/tabbar/avator.png', genderIcon, yearText }
          const a = this.data.article || { id }
          const kept = Array.isArray(a.imgs) ? a.imgs : []
          const finalImgs = nextImgs.length ? nextImgs : kept
          this.setData({ article: { ...a, ...enhanced, imgs: finalImgs } })
        }
      }
    })
  },

  checkLikeStatus(id) {
    const token = wx.getStorageSync('token')
    if (!token) return
    wx.request({
      url: `${config.api.article.checkLike}?article_id=${id}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200) {
          const liked = !!res.data
          const a = this.data.article
          this.setData({ article: { ...a, liked }, liked })
        }
      }
    })
  },

  checkCommentStatus(id) {
    const token = wx.getStorageSync('token')
    if (!token) return
    wx.request({
      url: `${config.api.article.checkComment}?article_id=${id}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200) {
          const commented = !!res.data
          this.setData({ commented })
        }
      }
    })
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
        const top = incoming.map(c => ({
          ...c,
          imgs: normalizeImgs(c.img || c.imgs),
          reply_count: Number(c.reply_count || 0),
          replies: [],
          repliesPage: 1,
          repliesHasMore: Number(c.reply_count || 0) > 0,
          loadingReplies: false,
          showReplies: false
        }))
        const hasMore = incoming.length >= 10
        const existed = (this.data.threads || [])
        const merged = this.data.commentPage === 1 ? top : existed.concat(top)
        this.setData({ comments: merged, threads: merged, commentHasMore: hasMore, showNoMoreComments: (!hasMore && merged.length > 0) })
        const token = wx.getStorageSync('token') || ''
        if (token) {
          wx.request({
            url: `${config.api.article.commentLikedList}`,
            method: 'GET',
            header: { Authorization: `Bearer ${token}` },
            success: (r) => {
              const ids = Array.isArray(r.data) ? r.data : []
              const set = {}
              for (let i = 0; i < ids.length; i++) set[ids[i]] = 1
              const tds = (this.data.threads || []).slice()
              for (let i = 0; i < tds.length; i++) {
                const t = tds[i]
                t.liked = !!set[t.id]
              }
              this.setData({ threads: tds, likedComments: set })
            }
          })
        }
        const tcid = Number(this.data.targetCommentId || 0)
        const tpid = Number(this.data.targetCommentParentId || 0)
        const tds = (this.data.threads || []).slice()
        const articleId = Number(this.data.article && this.data.article.id)
        if (tcid > 0 && tpid > 0) {
          const idx = tds.findIndex(t => Number(t.id) === tpid)
          if (idx >= 0) {
            this.fetchReplies(idx, 1)
          } else if (this.data.commentHasMore && Number(this.data.targetLoadTries || 0) < 3) {
            this.setData({ commentPage: this.data.commentPage + 1, targetLoadTries: Number(this.data.targetLoadTries || 0) + 1 })
            this.fetchComments(articleId)
          } else {
            this.setData({ targetCommentId: 0, targetCommentParentId: 0, targetLoadTries: 0 })
          }
        } else if (tcid > 0) {
          const topFound = tds.find(t => Number(t.id) === tcid)
          if (topFound) {
            wx.pageScrollTo({ selector: `#comment-${tcid}`, duration: 200 })
            this.setData({ targetCommentId: 0, targetLoadTries: 0 })
          } else if (this.data.commentHasMore && Number(this.data.targetLoadTries || 0) < 3) {
            this.setData({ commentPage: this.data.commentPage + 1, targetLoadTries: Number(this.data.targetLoadTries || 0) + 1 })
            this.fetchComments(articleId)
          } else {
            this.setData({ targetCommentId: 0, targetLoadTries: 0 })
          }
        }
      }
    })
  },

  fetchReplies(index, page = 1) {
    const threads = (this.data.threads || []).slice()
    const item = threads[index]
    if (!item) return
    const articleId = Number(this.data.article && this.data.article.id)
    threads[index] = { ...item, loadingReplies: true }
    this.setData({ threads })
    wx.request({
      url: `${config.api.article.replies(articleId)}?parent_id=${item.id}&page=${page}`,
      method: 'GET',
      success: (res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data.items || [])
        const mapped = list.map(child => ({
          ...child,
          imgs: normalizeImgs(child.img || child.imgs),
          liked: !!(this.data.likedComments && this.data.likedComments[child.id])
        }))
        const tds = (this.data.threads || []).slice()
        const prev = tds[index] || {}
        const baseReplies = page === 1 ? [] : (prev.replies || [])
        const mergedReplies = baseReplies.concat(mapped)
        const hasMore = mergedReplies.length < Number(prev.reply_count || 0)
        tds[index] = { ...prev, replies: mergedReplies, repliesPage: page, repliesHasMore: hasMore, loadingReplies: false, showReplies: true }
        this.setData({ threads: tds })
        const tcid = Number(this.data.targetCommentId || 0)
        const tpid = Number(this.data.targetCommentParentId || 0)
        if (tpid > 0 && Number((this.data.threads || [])[index].id) === tpid && tcid > 0) {
          const childFound = mergedReplies.find(c => Number(c.id) === tcid)
          if (childFound) {
            wx.pageScrollTo({ selector: `#reply-${tcid}`, duration: 200 })
            this.setData({ targetCommentId: 0, targetCommentParentId: 0, targetLoadTries: 0 })
          } else if (hasMore && Number(this.data.targetLoadTries || 0) < 3) {
            this.setData({ targetLoadTries: Number(this.data.targetLoadTries || 0) + 1 })
            this.fetchReplies(index, Number(prev.repliesPage || 1) + 1)
          } else {
            this.setData({ targetCommentId: 0, targetCommentParentId: 0, targetLoadTries: 0 })
          }
        }
      },
      fail: () => {
        const tds = (this.data.threads || []).slice()
        const prev = tds[index] || {}
        tds[index] = { ...prev, loadingReplies: false }
        this.setData({ threads: tds })
        wx.showToast({ title: '回复加载失败', icon: 'none' })
      }
    })
  },

  onReachBottom() {
    if (this.data.commentHasMore) {
      this.setData({ commentPage: this.data.commentPage + 1 })
      this.fetchComments(this.data.article.id)
    }
  },

  onCommentInput(e) { const v = e.detail.value || ''; this.setData({ commentText: v, showSendButton: !!this.data.commentFocus }) },
  onCommentFocus() { this.setData({ commentFocus: true, showSendButton: true, inputExpanded: false, inputClass: 'comment-input' }) },
  onCommentBlur() { this.setData({ commentFocus: false, showSendButton: false, inputExpanded: false, inputClass: 'comment-input' }) },
  onUploadCommentImage() {
    const token = wx.getStorageSync('token') || ''
    if (!token) { wx.showToast({ title: '请先登录', icon: 'none' }); wx.navigateTo({ url: '/pages/login/login' }); return }
    const current = (this.data.commentImages || []).length
    const remain = Math.max(0, 3 - current)
    if (remain <= 0) { wx.showToast({ title: '最多选择3张图片', icon: 'none' }); return }
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album','camera'],
      success: async (sel) => {
        const paths = sel.tempFilePaths || []
        if (!paths.length) return
        wx.showLoading({ title: '上传中...' })
        try {
          for (let i = 0; i < paths.length; i++) {
            const filePath = paths[i]
            const ext = (filePath.match(/\.(jpg|jpeg|png)$/i) || [])[0] || '.jpg'
            const ct = (/\.png$/i.test(ext)) ? 'image/png' : 'image/jpeg'
            const key = `${Date.now()}_${Math.floor(Math.random()*100000)}${ext}`
            const uploadUrl = await this.getUploadUrl(key, ct)
            const fs = wx.getFileSystemManager()
            const data = await new Promise((resolve, reject) => {
              fs.readFile({
                filePath,
                success: (res) => resolve(res.data),
                fail: reject
              })
            })
            await new Promise((resolve, reject) => {
              wx.request({
                url: uploadUrl,
                method: 'PUT',
                header: { 'Content-Type': ct },
                data,
                success: (r) => {
                  const code = r.statusCode
                  if (code >= 200 && code < 300) resolve()
                  else reject(new Error(`上传失败(${code})`))
                },
                fail: reject
              })
            })
            const link = `https://wuyu.s3.bitiful.net/${key}`
            const imgs = (this.data.commentImages || []).slice()
            imgs.push(link)
            const hasText = ((this.data.commentText || '').trim().length > 0)
            const hasImages = imgs.length > 0
            this.setData({ commentImages: imgs, hasImages, canAddMore: imgs.length < 3, canShowAdd: hasImages && imgs.length < 3, showSendButton: !!this.data.commentFocus, inputExpanded: false, inputClass: 'comment-input' })
          }
          wx.hideLoading()
          wx.showToast({ title: '上传成功', icon: 'success' })
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: '上传失败', icon: 'none' })
        }
      }
    })
  },
  onRemoveCommentImage(e) {
    const d = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset : {}
    const idx = Number((d.idx !== undefined ? d.idx : (d.index !== undefined ? d.index : -1)))
    if (Number.isNaN(idx) || idx < 0) return
    const imgs = (this.data.commentImages || []).slice()
    imgs.splice(idx, 1)
    const hasText = ((this.data.commentText || '').trim().length > 0)
    const hasImages = imgs.length > 0
    this.setData({ commentImages: imgs, hasImages, canAddMore: imgs.length < 3, canShowAdd: hasImages && imgs.length < 3, showSendButton: hasText || !!this.data.commentFocus })
  },
  getUploadUrl(key, contentType) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${config.api.storage.uploadUrl}?key=${encodeURIComponent(key)}&content_type=${encodeURIComponent(contentType)}`,
        method: 'GET',
        timeout: 10000,
        success: (res) => {
          const ok = res.statusCode === 200
          const url = ok && res.data && res.data.url
          if (!url) return reject(new Error('缺少上传URL'))
          resolve(url)
        },
        fail: reject
      })
    })
  },

  onLikeCommentTap(e) {
    const token = wx.getStorageSync('token') || ''
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }
    const pid = e.currentTarget.dataset.parentIndex
    const cid = e.currentTarget.dataset.childIndex
    const id = e.currentTarget.dataset.id
    wx.request({
      url: `${config.api.article.commentLike}`,
      method: 'POST',
      header: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      data: { comment_id: id },
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
        const threads = (this.data.threads || []).slice()
        if (cid !== undefined && cid !== null && cid !== '') {
          const idx = Number(cid)
          const c = (threads[pid].replies || [])[idx] || {}
          const next = liked ? (c.like_count || 0) + 1 : Math.max(0, (c.like_count || 0) - 1)
          threads[pid].replies[idx] = { ...c, like_count: next }
        } else {
          const c = threads[pid] || {}
          const next = liked ? (c.like_count || 0) + 1 : Math.max(0, (c.like_count || 0) - 1)
          threads[pid] = { ...c, like_count: next }
        }
        this.setData({ threads, likedComments: { ...this.data.likedComments, [id]: liked } })
      },
      fail: () => { wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  },

  onReplyCommentTap(e) {
    const id = e.currentTarget.dataset.id
    const username = e.currentTarget.dataset.username || ''
    this.setData({ commentParentId: id, commentFocus: true, commentPlaceholder: username ? `回复 @${username}` : '回复评论' })
  },

  onToggleRepliesTap(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const action = e.currentTarget.dataset.action || ''
    const tds = (this.data.threads || []).slice()
    const item = tds[idx] || {}
    if (!item.showReplies) {
      tds[idx] = { ...item, showReplies: true }
      this.setData({ threads: tds })
      this.fetchReplies(idx, 1)
      return
    }
    if (action === 'collapse') {
      tds[idx] = { ...item, showReplies: false }
      this.setData({ threads: tds })
      wx.pageScrollTo({ selector: `#comment-${item.id}`, duration: 200 })
      return
    }
    if (item.repliesHasMore) {
      const page = Number(item.repliesPage || 1) + 1
      this.fetchReplies(idx, page)
    } else {
      tds[idx] = { ...item, showReplies: false }
      this.setData({ threads: tds })
      wx.pageScrollTo({ selector: `#comment-${item.id}`, duration: 200 })
    }
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
        if (res.statusCode === 401) {
          wx.showToast({ title: '请先登录', icon: 'none' })
          wx.navigateTo({ url: '/pages/login/login' })
          return
        }
        if (res.statusCode !== 200) {
          wx.showToast({ title: '点赞失败', icon: 'none' })
          return
        }
        const liked = !!(res.data && res.data.liked)
        const a = this.data.article
        const like_count = liked ? (a.like_count || 0) + 1 : Math.max(0, (a.like_count || 0) - 1)
        this.setData({ article: { ...a, like_count, liked }, liked })
      },
      fail: () => { wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  },

  sendComment() {
    const content = (this.data.commentText || '').trim()
    if (!content) { wx.showToast({ title: '请输入评论', icon: 'none' }); return }

    const token = wx.getStorageSync('token') || ''
    wx.request({
      url: config.api.article.commentPath(this.data.article.id),
      method: 'POST',
      header: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      data: { parent_id: this.data.commentParentId || 0, content, img: (this.data.commentImages || []).join(',') || null },
      success: (res) => {
        const { statusCode, data } = res
        if (statusCode === 201) {
          const newId = Number((data && data.id) || 0)
          const parentId = Number(this.data.commentParentId || 0)
          wx.showToast({ title: '评论成功', icon: 'success' })
          this.setData({ commentText: '', commentParentId: 0, commentPlaceholder: '我也来说一句', commentImages: [], hasImages: false, canAddMore: true, canShowAdd: false, showSendButton: false, inputExpanded: false, inputClass: 'comment-input' })
          const a = this.data.article
          this.setData({ article: { ...a, comment_count: (a.comment_count || 0) + 1 } })
          this.setData({ commentPage: 1, commentHasMore: true, comments: [], threads: [], targetCommentId: newId, targetCommentParentId: parentId > 0 ? parentId : 0, targetLoadTries: 0, showNoMoreComments: false })
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