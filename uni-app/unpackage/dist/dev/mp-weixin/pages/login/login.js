"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      email: "",
      password: "",
      loading: false,
      active: "",
      baseUrl: "http://127.0.0.1:8080"
    };
  },
  methods: {
    async login() {
      if (!this.email || !this.password) {
        common_vendor.index.showToast({ title: "请完善登录信息", icon: "none" });
        return;
      }
      this.loading = true;
      common_vendor.index.request({
        url: `${this.baseUrl}/auth/login`,
        method: "POST",
        data: {
          email: this.email,
          password: this.password
        },
        success: (res) => {
          if (res.statusCode === 200) {
            common_vendor.index.showToast({ title: "登录成功" });
            try {
              let payload = res.data;
              if (typeof payload === "string") {
                try {
                  payload = JSON.parse(payload);
                } catch (e) {
                }
              }
              if (payload && payload.token) {
                common_vendor.index.setStorageSync("token", payload.token);
              }
              let uname = "";
              if (payload && payload.username) {
                uname = payload.username;
              } else if (payload && payload.user && payload.user.username) {
                uname = payload.user.username;
              } else if (this.email) {
                const idx = this.email.indexOf("@");
                uname = idx > 0 ? this.email.slice(0, idx) : this.email;
              }
              if (uname) {
                common_vendor.index.setStorageSync("username", uname);
              }
            } catch (e) {
            }
            common_vendor.index.reLaunch({ url: "/pages/index/index" });
          } else {
            common_vendor.index.showToast({ title: res.data.detail || "登录失败", icon: "none" });
          }
        },
        fail: () => {
          common_vendor.index.showToast({ title: "服务器连接失败", icon: "none" });
        },
        complete: () => {
          this.loading = false;
        }
      });
    },
    toRegister() {
      common_vendor.index.navigateTo({ url: "/pages/register/register" });
    },
    toForget() {
      common_vendor.index.navigateTo({ url: "/pages/fgps/fgps" });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o(($event) => $data.active = "email"),
    b: common_vendor.o(($event) => $data.active = ""),
    c: $data.email,
    d: common_vendor.o(($event) => $data.email = $event.detail.value),
    e: $data.active === "email" ? 1 : "",
    f: common_vendor.o(($event) => $data.active = "pass"),
    g: common_vendor.o(($event) => $data.active = ""),
    h: $data.password,
    i: common_vendor.o(($event) => $data.password = $event.detail.value),
    j: $data.active === "pass" ? 1 : "",
    k: common_vendor.o((...args) => $options.toForget && $options.toForget(...args)),
    l: $data.loading,
    m: common_vendor.o((...args) => $options.login && $options.login(...args)),
    n: common_vendor.o((...args) => $options.toRegister && $options.toRegister(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/login/login.js.map
