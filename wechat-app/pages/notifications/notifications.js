const config = require('../../config.js')

Page({
  data: {
    items: [],
    navigating: false,
    page: 1,
    page_size: 10,
    loading: false,
    hasMore: true
  },
  onShow() {
    const token = wx.getStorageSync('token')
    if (!token) { wx.showToast({ title: '请先登录', icon: 'none' }); return }
    this.setData({ navigating: false, items: [], page: 1, hasMore: true, loading: true })
    const uid = Number(wx.getStorageSync('user_id') || 0)
    // 拉取交互列表（分页）
    wx.request({
      url: `${config.api.user.interacts(uid)}?page=${this.data.page}&page_size=${this.data.page_size}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (r) => {
        const raw = Array.isArray(r.data) ? r.data : (Array.isArray(r.data.items) ? r.data.items : [])
        const normalized = (Array.isArray(raw) ? raw : []).map(it => ({
          sender_username: it.sender_username || '',
          sender_avatar: it.sender_avatar || '/images/tabbar/avator.png',
          content: it.sender_content || it.content || '',
          sender_img: it.sender_img || '',
          receiver_img: it.receiver_img || '',
          receiver_content: it.receiver_content || it.reciecer_content || '',
          create_time: it.create_time || '',
          interact_type: Number(it.interact_type || 0),
          article_id: Number(it.article_id || 0),
          relate_id: String(it.relate_id || ''),
          status: (it.status === undefined || it.status === null) ? 1 : Number(it.status)
        }))
        const sorted = normalized.slice().sort((a, b) => (String(a.create_time) < String(b.create_time) ? 1 : -1))
        this.setData({ items: sorted, loading: false, hasMore: normalized.length >= this.data.page_size })

      },
      fail: () => { this.setData({ loading: false }); wx.showToast({ title: '网络错误', icon: 'none' }) }
    })
  },
  onItemTap(e) {
    if (this.data.navigating) return
    const idx = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(idx) || idx < 0) return
    const it = (this.data.items || [])[idx]
    const type = Number(it && it.interact_type)
    const aid = Number(it && it.article_id)
    const ridRaw = String((it && it.relate_id) || '')
    if (!aid || !type) { wx.showToast({ title: '缺少必要参数', icon: 'none' }); return }
    const navigateArticle = (url, payload) => {
      this.setData({ navigating: true })
      setTimeout(() => {
        wx.navigateTo({
          url,
          success: (res) => { res.eventChannel.emit('article', payload) },
          complete: () => { this.setData({ navigating: false }) }
        })
      }, 0)
    }
    if (type === 1) {
      const url = `/pages/article/detail?id=${aid}`
      navigateArticle(url, { id: aid, content: it.receiver_content, img: it.receiver_img })
      return
    }
    if (type === 2 || type === 3) {
      const cid = Number(ridRaw.split('/').pop() || 0)
      const url = `/pages/article/detail?id=${aid}&comment_id=${cid}`
      navigateArticle(url, { id: aid, content: it.receiver_content, img: it.receiver_img, targetCommentId: cid })
      return
    }
    if (type === 4 || type === 5) {
      const parts = ridRaw.split('/')
      const pid = Number(parts[0] || 0)
      const cid = Number(parts[1] || parts[0] || 0)
      const url = pid > 0 ? `/pages/article/detail?id=${aid}&comment_id=${cid}&parent_id=${pid}` : `/pages/article/detail?id=${aid}&comment_id=${cid}`
      navigateArticle(url, { id: aid, content: it.receiver_content, img: it.receiver_img, targetCommentId: cid, targetCommentParentId: pid })
      return
    }
  },
  onReachBottom() {
    if (this.data.loading || !this.data.hasMore) return
    const token = wx.getStorageSync('token') || ''
    if (!token) return
    const uid = Number(wx.getStorageSync('user_id') || 0)
    const nextPage = this.data.page + 1
    this.setData({ loading: true })
    wx.request({
      url: `${config.api.user.interacts(uid)}?page=${nextPage}&page_size=${this.data.page_size}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (r) => {
        const raw = Array.isArray(r.data) ? r.data : (Array.isArray(r.data.items) ? r.data.items : [])
        const normalized = (Array.isArray(raw) ? raw : []).map(it => ({
          sender_username: it.sender_username || '',
          sender_avatar: it.sender_avatar || '/images/tabbar/avator.png',
          content: it.sender_content || it.content || '',
          sender_img: it.sender_img || '',
          receiver_img: it.receiver_img || '',
          receiver_content: it.receiver_content || it.reciecer_content || '',
          create_time: it.create_time || '',
          interact_type: Number(it.interact_type || 0),
          article_id: Number(it.article_id || 0),
          relate_id: String(it.relate_id || ''),
          status: (it.status === undefined || it.status === null) ? 1 : Number(it.status)
        }))
        const merged = (this.data.items || []).concat(normalized)
        this.setData({ items: merged, page: nextPage, loading: false, hasMore: normalized.length >= this.data.page_size })
      },
      fail: () => { this.setData({ loading: false }) }
    })
  },
  onUnload() {
    const token = wx.getStorageSync('token')
    if (!token) return
    const uid = Number(wx.getStorageSync('user_id') || 0)
    wx.request({
      url: `${config.api.user.interactsStatus(uid)}`,
      method: 'POST',
      header: { Authorization: `Bearer ${token}` },
      success: () => { try { wx.removeTabBarBadge({ index: 4 }) } catch (e) {} }
    })
  }
})