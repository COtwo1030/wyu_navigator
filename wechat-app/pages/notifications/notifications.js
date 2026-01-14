const config = require('../../config.js')

Page({
  data: {
    items: []
  },
  onShow() {
    const token = wx.getStorageSync('token')
    if (!token) { wx.showToast({ title: '请先登录', icon: 'none' }); return }

    // 先获取未读列表用于展示，再标记为已读
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
          create_time: it.create_time || ''
        }))
        const sorted = normalized.slice().sort((a, b) => (String(a.create_time) < String(b.create_time) ? 1 : -1))
        this.setData({ items: sorted })
        // 展示后再清未读并移除红点
        wx.request({
          url: config.api.user.readInteract,
          method: 'POST',
          header: { Authorization: `Bearer ${token}` },
          success: () => { try { wx.removeTabBarBadge({ index: 4 }) } catch (e) {} }
        })
      }
    })
  }
})