const config = require('../../config.js')
Page({
  data: { email: '', password: '', code: '', isPwdMode: true, pwdVisible: false },
  onEmailInput(e) { this.setData({ email: e.detail.value || '' }) },
  onPasswordInput(e) { this.setData({ password: e.detail.value || '' }) },
  onCodeInput(e) { this.setData({ code: e.detail.value || '' }) },
  toggleMode() { this.setData({ isPwdMode: !this.data.isPwdMode }) },
  togglePwdVisible() { this.setData({ pwdVisible: !this.data.pwdVisible }) },
  onForgot() { wx.showToast({ title: '请联系管理员重置', icon: 'none' }) },
  navToRegister() { wx.navigateTo({ url: '/pages/register/register' }) },
  navToReset() { wx.navigateTo({ url: '/pages/reset/reset' }) },
  sendCode() {
    const email = (this.data.email || '').trim()
    if (!email) return wx.showToast({ title: '请先填写邮箱', icon: 'none' })
    wx.showLoading({ title: '发送中...' })
    wx.request({
      url: `${config.api.auth.code}?email=${encodeURIComponent(email)}`,
      method: 'POST',
      timeout: 10000,
      success: (res) => {
          wx.hideLoading()
          if (res.statusCode === 200) {
            wx.showToast({ title: '验证码已发送', icon: 'success' })
          } else if (res.statusCode === 422) {
            wx.showToast({ title: '邮箱格式不对', icon: 'none' })
          } else if (res.statusCode === 400) {
            wx.showToast({ title: (res.data && res.data.detail) ? res.data.detail : '发送失败', icon: 'none' })
          } else {
            wx.showToast({ title: (res.data && res.data.detail) ? res.data.detail : '发送失败', icon: 'none' })
          }
        },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  },
  onSubmit() {
    const email = (this.data.email || '').trim()
    if (!email) return wx.showToast({ title: '请填写邮箱', icon: 'none' })
    if (this.data.isPwdMode) {
      const password = (this.data.password || '').trim()
      if (!password) return wx.showToast({ title: '请填写密码', icon: 'none' })
      if (password.length < 6 || password.length > 20) return wx.showToast({ title: '密码长度需6-20位', icon: 'none' })
      wx.showLoading({ title: '登录中...' })
      wx.request({
        url: config.api.auth.pswlogin,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: { email, password },
        timeout: 10000,
        success: (res) => {
          wx.hideLoading()
          if (res.statusCode === 422) {
            return wx.showToast({ title: '邮箱格式不对', icon: 'none' })
          }
          if (res.statusCode === 400) {
            return wx.showToast({ title: (res.data && res.data.detail) ? res.data.detail : '登录失败', icon: 'none' })
          }
          if (res.statusCode !== 200 || !res.data?.access_token) {
            return wx.showToast({ title: '登录失败', icon: 'none' })
          }
          try {
            wx.setStorageSync('token', res.data.access_token)
            wx.setStorageSync('username', res.data.username || '')
          } catch (e) {}
          wx.showToast({ title: '登录成功', icon: 'success' })
          setTimeout(() => wx.navigateBack({ delta: 1 }), 400)
        },
        fail: (err) => {
          wx.hideLoading()
          wx.showToast({ title: '网络异常', icon: 'none' })
          console.error('login failed:', err)
        }
      })
    } else {
      const code = (this.data.code || '').trim()
      if (!code) return wx.showToast({ title: '请填写验证码', icon: 'none' })
      if (code.length !== 4) return wx.showToast({ title: '验证码需4位', icon: 'none' })
      wx.showLoading({ title: '登录中...' })
      wx.request({
        url: config.api.auth.emaillogin,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: { email, code },
        timeout: 10000,
        success: (res) => {
          wx.hideLoading()
          if (res.statusCode === 422) {
            return wx.showToast({ title: '邮箱格式不对', icon: 'none' })
          }
          if (res.statusCode === 400) {
            return wx.showToast({ title: (res.data && res.data.detail) ? res.data.detail : '登录失败', icon: 'none' })
          }
          if (res.statusCode !== 200 || !res.data?.access_token) {
            return wx.showToast({ title: '登录失败', icon: 'none' })
          }
          try {
            wx.setStorageSync('token', res.data.access_token)
            wx.setStorageSync('username', res.data.username || '')
          } catch (e) {}
          wx.showToast({ title: '登录成功', icon: 'success' })
          setTimeout(() => wx.navigateBack({ delta: 1 }), 400)
        },
        fail: (err) => {
          wx.hideLoading()
          wx.showToast({ title: '网络异常', icon: 'none' })
          console.error('emaillogin failed:', err)
        }
      })
    }
  }
})