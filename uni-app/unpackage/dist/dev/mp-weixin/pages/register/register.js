"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      email: "",
      code: "",
      username: "",
      password: "",
      confirm_password: "",
      counting: false,
      count: 60,
      codeBtnText: "获取验证码",
      active: "",
      loading: false,
      baseUrl: "http://127.0.0.1:8080"
    };
  },
  methods: {
    async getCode() {
      if (this.counting)
        return;
      if (!/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(this.email)) {
        common_vendor.index.showToast({ title: "邮箱格式错误", icon: "none" });
        return;
      }
      this.counting = true;
      this.countDown();
      common_vendor.index.request({
        url: `${this.baseUrl}/auth/code?email=${this.email}`,
        method: "POST",
        success: (res) => {
          if (res.statusCode === 200) {
            common_vendor.index.showToast({ title: "已发送至邮箱" });
          } else {
            common_vendor.index.showToast({ title: res.data.detail || "发送失败", icon: "none" });
            this.resetCountDown();
          }
        },
        fail: () => {
          common_vendor.index.showToast({ title: "请求失败", icon: "none" });
          this.resetCountDown();
        }
      });
    },
    countDown() {
      this.codeBtnText = `${this.count}s`;
      this.timer = setInterval(() => {
        this.count--;
        this.codeBtnText = `${this.count}s`;
        if (this.count <= 0) {
          clearInterval(this.timer);
          this.resetCountDown();
        }
      }, 1e3);
    },
    resetCountDown() {
      this.counting = false;
      this.count = 60;
      this.codeBtnText = "获取验证码";
      if (this.timer)
        clearInterval(this.timer);
    },
    register() {
      if (!this.email || !this.code || !this.username || !this.password || !this.confirm_password) {
        return common_vendor.index.showToast({ title: "请完善注册信息", icon: "none" });
      }
      if (this.password !== this.confirm_password) {
        return common_vendor.index.showToast({ title: "两次密码不一致", icon: "none" });
      }
      this.loading = true;
      common_vendor.index.request({
        url: `${this.baseUrl}/auth/register`,
        method: "POST",
        data: {
          username: this.username,
          password: this.password,
          confirm_password: this.confirm_password,
          email: this.email,
          code: this.code
        },
        success: (res) => {
          if (res.statusCode === 200) {
            common_vendor.index.showToast({ title: "注册成功" });
            setTimeout(() => this.toLogin(), 1500);
          } else {
            common_vendor.index.showToast({ title: res.data.detail || "注册失败", icon: "none" });
          }
        },
        complete: () => {
          this.loading = false;
        }
      });
    },
    toLogin() {
      common_vendor.index.navigateBack();
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.toLogin && $options.toLogin(...args)),
    b: common_vendor.o(($event) => $data.active = "email"),
    c: common_vendor.o(($event) => $data.active = ""),
    d: $data.email,
    e: common_vendor.o(($event) => $data.email = $event.detail.value),
    f: $data.active === "email" ? 1 : "",
    g: common_vendor.o(($event) => $data.active = "code"),
    h: common_vendor.o(($event) => $data.active = ""),
    i: $data.code,
    j: common_vendor.o(($event) => $data.code = $event.detail.value),
    k: $data.active === "code" ? 1 : "",
    l: common_vendor.t($data.codeBtnText),
    m: $data.counting ? 1 : "",
    n: common_vendor.o((...args) => $options.getCode && $options.getCode(...args)),
    o: common_vendor.o(($event) => $data.active = "user"),
    p: common_vendor.o(($event) => $data.active = ""),
    q: $data.username,
    r: common_vendor.o(($event) => $data.username = $event.detail.value),
    s: $data.active === "user" ? 1 : "",
    t: common_vendor.o(($event) => $data.active = "pass"),
    v: common_vendor.o(($event) => $data.active = ""),
    w: $data.password,
    x: common_vendor.o(($event) => $data.password = $event.detail.value),
    y: $data.active === "pass" ? 1 : "",
    z: common_vendor.o(($event) => $data.active = "confirm"),
    A: common_vendor.o(($event) => $data.active = ""),
    B: $data.confirm_password,
    C: common_vendor.o(($event) => $data.confirm_password = $event.detail.value),
    D: $data.active === "confirm" ? 1 : "",
    E: $data.loading,
    F: common_vendor.o((...args) => $options.register && $options.register(...args)),
    G: common_vendor.o((...args) => $options.toLogin && $options.toLogin(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/register/register.js.map
