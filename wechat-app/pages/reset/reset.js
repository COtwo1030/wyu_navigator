const config = require('../../config.js')
Page({
  data: { email: '', password: '', confirm_password: '', code: '', pwdVisible: false, cpwdVisible: false },
  onEmailInput(e) { this.setData({ email: e.detail.value || '' }) },
  onPasswordInput(e) { this.setData({ password: e.detail.value || '' }) },
  onConfirmPwdInput(e) { this.setData({ confirm_password: e.detail.value || '' }) },
  onCodeInput(e) { this.setData({ code: e.detail.value || '' }) },
  togglePwdVisible() { this.setData({ pwdVisible: !this.data.pwdVisible }) },
  toggleCpwdVisible() { this.setData({ cpwdVisible: !this.data.cpwdVisible }) },
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
        } else if (res.statusCode === 400) {
          wx.showToast({ title: '验证码发送频繁', icon: 'none' })
        } else {
          wx.showToast({ title: '发送失败', icon: 'none' })
        }
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  },
  onSubmit() {
    const email = (this.data.email || '').trim()
    const password = (this.data.password || '').trim()
    const confirm_password = (this.data.confirm_password || '').trim()
    const code = (this.data.code || '').trim()
    if (!email) return wx.showToast({ title: '请填写邮箱', icon: 'none' })
    if (!password) return wx.showToast({ title: '请填写新密码', icon: 'none' })
    if (!confirm_password) return wx.showToast({ title: '请确认新密码', icon: 'none' })
    if (!code) return wx.showToast({ title: '请填写验证码', icon: 'none' })
    wx.showLoading({ title: '重置中...' })
    wx.request({
      url: config.api.auth.resetPassword,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { password, confirm_password, email, code },
      timeout: 10000,
      success: (res) => {
        wx.hideLoading()
        if (res.statusCode !== 200) {
          return wx.showToast({ title: '重置失败', icon: 'none' })
        }
        wx.showToast({ title: '重置成功', icon: 'success' })
        setTimeout(() => wx.navigateBack({ delta: 1 }), 400)
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '网络异常', icon: 'none' }) }
    })
  }
})