const config = require('../../config.js')
Page({
  data: {
    loggedIn: false,
    avatarSrc: '/images/tabbar/avator.png',
    username: '',
    gender: '',
    genderIcon: '',
    year: null,
    yearText: '',
    showForm: false,
    genderOptions: ['男','女'],
    formGender: '',
    formYear: '',
    formUsername: '',
    yearOptions: [],
    receivedLikeCount: 0,
    receivedCommentCount: 0,
    totalNotifyCount: 0
  },
  onAvatarTap() {
    const token = wx.getStorageSync('token') || ''
    const avatar = this.data.avatarSrc || ''
    wx.showActionSheet({
      itemList: ['更换头像','查看头像'],
      success: (res) => {
        if (res.tapIndex === 1) {
          const urls = [avatar].filter(Boolean)
          if (urls.length) wx.previewImage({ urls, current: urls[0] })
          return
        }
        if (res.tapIndex === 0) {
          if (!token) { wx.showToast({ title: '请先登录', icon: 'none' }); this.navToLogin(); return }
          wx.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            sourceType: ['album','camera'],
            success: async (sel) => {
              const paths = sel.tempFilePaths || []
              if (!paths.length) return
              wx.showLoading({ title: '上传中...' })
              try {
                const filePath = paths[0]
                const ext = (filePath.match(/\.(jpg|jpeg|png)$/i) || [])[0] || '.jpg'
                const ct = (/\.png$/i.test(ext)) ? 'image/png' : 'image/jpeg'
                const key = `${Date.now()}_${Math.floor(Math.random()*100000)}${ext}`
                const uploadUrl = await this.getUploadUrl(key, ct)
                const fs = wx.getFileSystemManager()
                const data = await new Promise((resolve, reject) => {
                  fs.readFile({ filePath, success: (r) => resolve(r.data), fail: reject })
                })
                await new Promise((resolve, reject) => {
                  wx.request({ url: uploadUrl, method: 'PUT', header: { 'Content-Type': ct }, data, success: (r) => { const code = r.statusCode; if (code >= 200 && code < 300) resolve(); else reject(new Error(String(code))) }, fail: reject })
                })
                const link = `https://wuyu.s3.bitiful.net/${key}`
                await new Promise((resolve) => {
                  wx.request({ url: `${config.api.user.avatar}?avatar_url=${encodeURIComponent(link)}`, method: 'POST', header: { Authorization: `Bearer ${token}` }, success: () => resolve(), fail: () => resolve() })
                })
                this.setData({ avatarSrc: link })
                wx.hideLoading()
                wx.showToast({ title: '更新成功', icon: 'success' })
              } catch (e) {
                wx.hideLoading()
                wx.showToast({ title: '上传失败', icon: 'none' })
              }
            }
          })
        }
      }
    })
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
  onShow() {
    const i = 4
    const r = Math.floor(Math.random() * 4) + 1
    wx.setTabBarItem({
      index: i,
      iconPath: '/images/tabbar/home.png',
      selectedIconPath: `/images/tabbar/home-active${r}.png`
    })
    const token = wx.getStorageSync('token') || ''
    const username = wx.getStorageSync('username') || ''
    if (!token) {
      this.setData({
        loggedIn: false,
        avatarSrc: '/images/tabbar/avator.png',
        username,
        gender: '',
        genderIcon: '',
        year: null,
        yearText: ''
      })
      return
    }
    wx.request({
      url: `${config.api.user.info}`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
      timeout: 10000,
      success: (res) => {
        if (res.statusCode !== 200) {
          this.setData({
            loggedIn: false,
            avatarSrc: '/images/tabbar/avator.png',
            username,
            gender: '',
            genderIcon: '',
            year: null
          })
          return
        }
        const info = res.data || {}
        const gender = info.gender || ''
        const year = info.year || null
        const genderIcon = gender === '男' ? 'man.png' : (gender === '女' ? 'women.png' : '')
        const yearText = year ? `${year}级` : ''
        this.setData({
          loggedIn: true,
          avatarSrc: info.avatar || '/images/tabbar/avator.png',
          username: info.username || username,
          gender,
          genderIcon,
          year,
          yearText
        })
        wx.request({
          url: config.api.user.interactsUnread,
          method: 'GET',
          header: { Authorization: `Bearer ${token}` },
          success: (r) => {
            const data = r.data || {}
            let count = 0
            if (Array.isArray(data)) {
              count = Array.isArray(data[1]) && typeof data[0] === 'number' ? Number(data[0]) : data.length
            } else {
              count = Number(data.unread_count || data.count || data.total || 0)
            }
            this.setData({ totalNotifyCount: count })
            if (count > 0) {
              wx.setTabBarBadge({ index: 4, text: String(Math.min(count, 99)) })
            } else {
              try { wx.removeTabBarBadge({ index: 4 }) } catch (e) {}
            }
          }
        })
      },
      fail: () => {
        this.setData({
          loggedIn: false,
          avatarSrc: '/images/tabbar/avator.png',
          username,
          gender: '',
          genderIcon: '',
          year: null,
          yearText: ''
        })
      }
    })
  },
  navToPost() {
    wx.navigateTo({ url: '/pages/post/post' })
  },
  navToMyPosts() {
    if (!this.data.loggedIn) { this.navToLogin(); return }
    wx.navigateTo({ url: '/pages/myposts/myposts' })
  },
  navToMyLikes() {
    if (!this.data.loggedIn) { this.navToLogin(); return }
    wx.navigateTo({ url: '/pages/mylikes/mylikes' })
  },
  navToMyComments() {
    if (!this.data.loggedIn) { this.navToLogin(); return }
    wx.navigateTo({ url: '/pages/mycomments/mycomments' })
  },
  navToMyPosts() {
    if (!this.data.loggedIn) { this.navToLogin(); return }
    wx.navigateTo({ url: '/pages/myposts/myposts' })
  },
  navToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },
  onNotifyTap() {
    if (!this.data.loggedIn) { this.navToLogin(); return }
    wx.navigateTo({ url: '/pages/notifications/notifications' })
  },
  onProfileActionTap() {
    if (!this.data.loggedIn) { this.navToLogin(); return }
    wx.showActionSheet({
      itemList: ['修改详情','退出登录'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.onEditProfile()
        } else if (res.tapIndex === 1) {
          this.onLogout()
        }
      }
    })
  },
  onLogout() {
    try {
      wx.removeStorageSync('token')
      wx.removeStorageSync('username')
    } catch (e) {}
    this.setData({
      loggedIn: false,
      avatarSrc: '/images/tabbar/avator.png',
      username: '',
      gender: '',
      genderIcon: '',
      year: null,
      yearText: '',
      showForm: false,
      formGender: '',
      formYear: ''
    })
    wx.showToast({ title: '已退出', icon: 'none' })
    try { wx.removeTabBarBadge({ index: 4 }) } catch (e) {}
    this.setData({ totalNotifyCount: 0 })
  },
  onEditProfile() {
    if (!this.data.loggedIn) { this.navToLogin(); return }
    if (!(this.data.yearOptions && this.data.yearOptions.length)) {
      const now = new Date().getFullYear()
      const list = []
      for (let y = now; y >= 1985; y--) list.push(String(y))
      this.setData({ yearOptions: list })
    }
    this.setData({ showForm: true, formUsername: this.data.username || '', formGender: this.data.gender || '', formYear: this.data.year || '' })
  },
  onUsernameInput(e) {
    const val = String(e.detail.value || '').trim()
    this.setData({ formUsername: val })
  },
  onYearChange(e) {
    const idx = Number(e.detail.value)
    const val = (this.data.yearOptions || [])[idx] || ''
    this.setData({ formYear: val })
  },
  onGenderChange(e) {
    const idx = Number(e.detail.value)
    const val = this.data.genderOptions[idx] || ''
    this.setData({ formGender: val })
  },
  onYearInput(e) {
    const val = String(e.detail.value || '').trim()
    this.setData({ formYear: val })
  },
  onCancelEdit() { this.setData({ showForm: false }) },
  onSubmitDetail() {
    const token = wx.getStorageSync('token') || ''
    if (!token) { this.navToLogin(); return }
    const username = (this.data.formUsername || '').trim()
    const gender = (this.data.formGender || '').trim()
    const year = (this.data.formYear || '').trim()
    if (!gender || !year) { wx.showToast({ title: '请完善信息', icon: 'none' }); return }
    wx.request({
      url: `${config.api.user.detail}?username=${encodeURIComponent(username)}&gender=${encodeURIComponent(gender)}&year=${encodeURIComponent(year)}`,
      method: 'POST',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode !== 200) { wx.showToast({ title: '保存失败', icon: 'none' }); return }
        const yearText = year ? `${year}级` : ''
        this.setData({ username, gender, year, yearText, showForm: false })
        wx.showToast({ title: '已保存', icon: 'success' })
      },
      fail: () => { wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  }
})
