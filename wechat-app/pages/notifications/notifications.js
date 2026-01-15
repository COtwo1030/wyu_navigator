const config = require('../../config.js')

Page({
  data: {
    items: [],
    commentArticleMap: {},
    mapReady: false,
    navigating: false
  },
  onShow() {
    const token = wx.getStorageSync('token')
    if (!token) { wx.showToast({ title: '请先登录', icon: 'none' }); return }
    this.setData({ navigating: false })

    // 拉取未读列表用于展示（不自动清未读）
    wx.request({
      url: config.api.user.interactsUnread,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      success: (r) => {
        const data = r.data || {}
        const items = Array.isArray(data)
          ? (Array.isArray(data[1]) ? data[1] : data)
          : (Array.isArray(data.items) ? data.items : [])
        const normalized = (Array.isArray(items) ? items : []).map(it => ({
          sender_username: it.sender_username || '',
          sender_avatar: it.sender_avatar || '/images/tabbar/avator.png',
          content: it.sender_content || it.content || '',
          sender_img: it.sender_img || '',
          receiver_img: it.receiver_img || '',
          receiver_content: it.receiver_content || it.reciecer_content || '',
          create_time: it.create_time || '',
          interact_type: Number(it.interact_type || 0),
          relate_id: Number(it.relate_id || 0)
        }))
        const sorted = normalized.slice().sort((a, b) => (String(a.create_time) < String(b.create_time) ? 1 : -1))
        this.setData({ items: sorted })
        if (!sorted.length) {
          wx.request({
            url: config.api.user.interactsRead,
            method: 'GET',
            header: { Authorization: `Bearer ${token}` },
            success: (rr) => {
              const d2 = rr.data || {}
              const items2 = Array.isArray(d2)
                ? (Array.isArray(d2[1]) ? d2[1] : d2)
                : (Array.isArray(d2.items) ? d2.items : [])
              const normalized2 = (Array.isArray(items2) ? items2 : []).map(it => ({
                sender_username: it.sender_username || '',
                sender_avatar: it.sender_avatar || '/images/tabbar/avator.png',
                content: it.sender_content || it.content || '',
                sender_img: it.sender_img || '',
                receiver_img: it.receiver_img || '',
                receiver_content: it.receiver_content || it.reciecer_content || '',
                create_time: it.create_time || '',
                interact_type: Number(it.interact_type || 0),
                relate_id: Number(it.relate_id || 0)
              }))
              const sorted2 = normalized2.slice().sort((a, b) => (String(a.create_time) < String(b.create_time) ? 1 : -1))
              this.setData({ items: sorted2 })
            }
          })
        }
        // 预拉取评论映射（comment_id -> article_id），用于类型3/4跳转
        wx.request({
          url: config.api.article.userCommentList,
          method: 'GET',
          header: { Authorization: `Bearer ${token}` },
          success: (res) => {
            const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.items) ? res.data.items : [])
            const map = {}
            for (let i = 0; i < list.length; i++) {
              const c = list[i]
              const cid = Number(c.id)
              const aid = Number(c.article_id)
              if (cid > 0 && aid > 0) map[cid] = aid
            }
            this.setData({ commentArticleMap: map, mapReady: true })
          }
        })
      }
    })
  },
  onItemTap(e) {
    if (this.data.navigating) return
    const idx = Number(e.currentTarget.dataset.index)
    if (Number.isNaN(idx) || idx < 0) return
    const it = (this.data.items || [])[idx]
    const type = Number(it && it.interact_type)
    const rid = Number(it && it.relate_id)
    if (!rid || !type) { wx.showToast({ title: '缺少必要参数', icon: 'none' }); return }
    if (type === 1 || type === 2) {
      this.setData({ navigating: true })
      const url = `/pages/article/detail?id=${rid}`
      setTimeout(() => {
        wx.navigateTo({
          url,
          success: (res) => { res.eventChannel.emit('article', { id: rid, content: it.receiver_content, img: it.receiver_img }) },
          complete: () => { this.setData({ navigating: false }) }
        })
      }, 0)
      return
    }
    if (type === 3 || type === 4) {
      const map = this.data.commentArticleMap || {}
      const aid = map[rid]
      const go = (aid2) => {
        this.setData({ navigating: true })
        const url = `/pages/article/detail?id=${aid2}&comment_id=${rid}`
        setTimeout(() => {
          wx.navigateTo({
            url,
            success: (res) => { res.eventChannel.emit('article', { id: aid2, content: it.receiver_content, img: it.receiver_img, targetCommentId: rid }) },
            complete: () => { this.setData({ navigating: false }) }
          })
        }, 0)
      }
      if (aid) { go(aid); return }
      const token = wx.getStorageSync('token')
      if (!token) { wx.showToast({ title: '请先登录', icon: 'none' }); return }
      wx.request({
        url: config.api.article.userCommentList,
        method: 'GET',
        header: { Authorization: `Bearer ${token}` },
        success: (res) => {
          const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.items) ? res.data.items : [])
          const m = {}
          for (let i = 0; i < list.length; i++) {
            const c = list[i]
            const cid = Number(c.id)
            const a = Number(c.article_id)
            if (cid > 0 && a > 0) m[cid] = a
          }
          const newAid = m[rid]
          this.setData({ commentArticleMap: m, mapReady: true })
          if (newAid) { go(newAid) }
          else { wx.showToast({ title: '暂不支持跳转（缺少文章ID）', icon: 'none' }) }
        },
        fail: () => { wx.showToast({ title: '网络错误，稍后重试', icon: 'none' }) }
      })
      return
    }
  },
  onUnload() {
    const token = wx.getStorageSync('token')
    if (!token) return
    wx.request({
      url: config.api.user.readInteract,
      method: 'POST',
      header: { Authorization: `Bearer ${token}` },
      success: () => { try { wx.removeTabBarBadge({ index: 4 }) } catch (e) {} }
    })
  }
})