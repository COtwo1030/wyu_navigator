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
    formYear: ''
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
          username,
          gender,
          genderIcon,
          year,
          yearText
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
  },
  onEditProfile() {
    if (!this.data.loggedIn) { this.navToLogin(); return }
    this.setData({ showForm: true, formGender: this.data.gender || '', formYear: this.data.year || '' })
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
    const gender = (this.data.formGender || '').trim()
    const year = (this.data.formYear || '').trim()
    if (!gender || !year) { wx.showToast({ title: '请完善信息', icon: 'none' }); return }
    wx.request({
      url: `${config.api.user.detail}?gender=${encodeURIComponent(gender)}&year=${encodeURIComponent(year)}`,
      method: 'POST',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode !== 200) { wx.showToast({ title: '保存失败', icon: 'none' }); return }
        const yearText = year ? `${year}级` : ''
        this.setData({ gender, year, yearText, showForm: false })
        wx.showToast({ title: '已保存', icon: 'success' })
      },
      fail: () => { wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  }
})
