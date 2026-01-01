"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
let mapInst = null;
let markersInst = null;
let routeLayerInst = null;
let seMarkersInst = null;
let seLabelsInst = null;
const _sfc_main = {
  data() {
    return {
      map: null,
      keyword: "",
      results: [],
      startKeyword: "",
      endKeyword: "",
      searchService: null,
      markers: null,
      routeLayer: null,
      username: "",
      showRoutePanel: false,
      routeMode: "walking",
      routeBoxLeft: 0,
      routeBoxTop: 80,
      dragging: false,
      dragMode: "",
      dragStart: { x: 0, y: 0 },
      boxStart: { left: 0, top: 0 },
      startSuggestions: [],
      endSuggestions: [],
      startTimer: null,
      endTimer: null,
      startBlurTimer: null,
      endBlurTimer: null,
      focusedField: "",
      dropdownOpen: false,
      dropdownCloseTimer: null,
      showSummaryPanel: false,
      summaryCategories: [],
      selectedCategory: "",
      summaryPoints: [],
      _allSummaryPoints: [],
      pointCardVisible: false,
      pointCard: null,
      pointCardLeft: 100,
      pointCardTop: 120,
      pcDragging: false,
      pcDragMode: "",
      pcDragStart: { x: 0, y: 0 },
      pcBoxStart: { left: 0, top: 0 },
      summaryBoxLeft: 0,
      summaryBoxTop: 80,
      sDragging: false,
      sDragMode: "",
      sDragStart: { x: 0, y: 0 },
      sBoxStart: { left: 0, top: 0 }
    };
  },
  onShow() {
    const name = common_vendor.index.getStorageSync("username");
    this.username = name || "";
  },
  onReady() {
    if (typeof TMap !== "undefined") {
      this.initMap();
    } else {
      const interval = setInterval(() => {
        if (typeof TMap !== "undefined") {
          clearInterval(interval);
          this.initMap();
        }
      }, 500);
    }
  },
  methods: {
    initMap() {
      const center = new TMap.LatLng(22.596002, 113.086019);
      const boundary = new TMap.LatLngBounds(
        new TMap.LatLng(22.581284, 113.064394),
        new TMap.LatLng(22.612047, 113.108468)
      );
      mapInst = new TMap.Map("container", {
        center,
        zoom: 16.2,
        boundary,
        baseMap: { features: ["base", "building3d"] }
      });
      TMap.ImageTileLayer.createCustomLayer({
        layerId: "693674ac4012",
        map: mapInst
      }).then((customLayer) => {
        common_vendor.index.__f__("log", "at pages/index/index.vue:208", "个性化图层创建成功");
      }).catch((err) => {
        common_vendor.index.__f__("error", "at pages/index/index.vue:210", "个性化图层加载错误:", err);
      });
      seMarkersInst = new TMap.MultiMarker({
        map: mapInst,
        styles: {
          start: new TMap.MarkerStyle({ width: 25, height: 35, anchor: { x: 16, y: 32 }, src: "https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/start.png" }),
          end: new TMap.MarkerStyle({ width: 25, height: 35, anchor: { x: 16, y: 32 }, src: "https://mapapi.qq.com/web/lbs/javascriptGL/demo/img/end.png" })
        }
      });
      seLabelsInst = new TMap.MultiLabel({
        map: mapInst,
        styles: {
          startLabel: new TMap.LabelStyle({ color: "#2E7D32", size: 14, offset: { x: 0, y: -40 } }),
          endLabel: new TMap.LabelStyle({ color: "#1565C0", size: 14, offset: { x: 0, y: -40 } })
        }
      });
      markersInst = new TMap.MultiMarker({
        map: mapInst
      });
      common_vendor.index.request({
        url: "http://127.0.0.1:8080/point/list",
        method: "GET",
        success: (res) => {
          const points = res.data && res.data.points || [];
          const geometries = [];
          for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (typeof p.x === "number" && typeof p.y === "number" && p.y >= -90 && p.y <= 90 && p.x >= -180 && p.x <= 180) {
              geometries.push({
                id: String(p.id),
                position: new TMap.LatLng(p.y, p.x),
                content: p.name
              });
            }
          }
          markersInst.setGeometries(geometries);
        },
        fail: () => {
          common_vendor.index.showToast({ title: "地点加载失败", icon: "none" });
        }
      });
    },
    search() {
      if (!this.keyword)
        return;
      this.results = [];
      if (typeof TMap.service !== "undefined" && TMap.service.Search) {
        const search = new TMap.service.Search({
          pageSize: 10
        });
        search.searchRegion({
          keyword: this.keyword,
          cityName: "江门市"
          // 修改为江门市以匹配五邑大学
        }).then((result) => {
          this.results = result.data;
          this.displayMarkers(result.data);
        }).catch((error) => {
          common_vendor.index.__f__("error", "at pages/index/index.vue:277", "搜索错误:", error);
          common_vendor.index.showToast({
            title: "搜索失败",
            icon: "none"
          });
        });
      } else {
        common_vendor.index.__f__("error", "at pages/index/index.vue:284", "搜索服务不可用");
        common_vendor.index.showToast({
          title: "服务不可用",
          icon: "none"
        });
      }
    },
    clearRoute() {
      if (routeLayerInst) {
        routeLayerInst.setGeometries([]);
        routeLayerInst.destroy();
        routeLayerInst = null;
      }
      if (seMarkersInst) {
        seMarkersInst.setGeometries([]);
      }
      if (seLabelsInst) {
        seLabelsInst.setGeometries([]);
      }
      common_vendor.index.request({
        url: "http://127.0.0.1:8080/point/list",
        method: "GET",
        success: (res) => {
          const points = res.data && res.data.points || [];
          const geometries = [];
          for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (typeof p.x === "number" && typeof p.y === "number" && p.y >= -90 && p.y <= 90 && p.x >= -180 && p.x <= 180) {
              geometries.push({ id: String(p.id), position: new TMap.LatLng(p.y, p.x), content: p.name });
            }
          }
          if (markersInst) {
            markersInst.setGeometries(geometries);
          }
        },
        fail: () => {
          common_vendor.index.showToast({ title: "地点加载失败", icon: "none" });
        }
      });
    },
    clearStart() {
      this.startKeyword = "";
    },
    clearEnd() {
      this.endKeyword = "";
    },
    closePanel() {
      this.showRoutePanel = false;
      this.clearRoute();
    },
    changeMode(mode) {
      this.routeMode = mode;
      if (this.endKeyword) {
        this.handleRoutePlan();
      }
    },
    swapPoints() {
      const s = this.startKeyword;
      this.startKeyword = this.endKeyword;
      this.endKeyword = s;
      if (seMarkersInst) {
        seMarkersInst.setGeometries([]);
      }
      if (this.endKeyword) {
        this.handleRoutePlan();
      }
    },
    displayMarkers(data) {
      const geometries = data.map((item) => ({
        id: String(item.id),
        position: item.location,
        properties: {
          title: item.title
        }
      }));
      markersInst.setGeometries(geometries);
      if (data.length > 0) {
        const bounds = new TMap.LatLngBounds();
        data.forEach((item) => bounds.extend(item.location));
        mapInst.fitBounds(bounds);
      }
    },
    selectLocation(item) {
      mapInst.setCenter(item.location);
    },
    startNavigation(item) {
      this.endKeyword = item.title;
      this.startKeyword = "";
      this.handleRoutePlan();
    },
    onLoginClick() {
      if (!this.username) {
        common_vendor.index.navigateTo({ url: "/pages/login/login" });
      }
    },
    onLoginMouseEnter() {
      if (this.dropdownCloseTimer)
        clearTimeout(this.dropdownCloseTimer);
      if (this.username)
        this.dropdownOpen = true;
    },
    onLoginMouseLeave() {
      if (this.dropdownCloseTimer)
        clearTimeout(this.dropdownCloseTimer);
      this.dropdownCloseTimer = setTimeout(() => {
        this.dropdownOpen = false;
      }, 2e3);
    },
    logout() {
      if (this.dropdownCloseTimer)
        clearTimeout(this.dropdownCloseTimer);
      this.dropdownOpen = false;
      common_vendor.index.removeStorageSync("username");
      this.username = "";
      common_vendor.index.showToast({ title: "已退出", icon: "none" });
    },
    toSummary() {
      this.showSummaryPanel = !this.showSummaryPanel;
      if (this.showSummaryPanel) {
        this.fetchSummaryPoints();
      } else {
        this.loadAllMarkers();
      }
    },
    fetchSummaryPoints() {
      common_vendor.index.request({
        url: "http://127.0.0.1:8080/point/list",
        method: "GET",
        success: (res) => {
          const points = res.data && res.data.points || [];
          this._allSummaryPoints = points;
          const seen = {};
          const cats = [];
          for (let i = 0; i < points.length; i++) {
            const c = points[i].category || "其他";
            if (!seen[c]) {
              seen[c] = 1;
              cats.push(c);
            }
          }
          this.summaryCategories = cats;
          this.selectedCategory = cats[0] || "";
          this.summaryPoints = this.selectedCategory ? points.filter((p) => (p.category || "其他") === this.selectedCategory) : points;
          this.applySummaryMarkers();
        },
        fail: () => {
          common_vendor.index.showToast({ title: "地点加载失败", icon: "none" });
        }
      });
    },
    selectCategory(c) {
      this.selectedCategory = c;
      const list = (this._allSummaryPoints || []).filter((p) => (p.category || "其他") === c);
      this.summaryPoints = list;
      this.applySummaryMarkers();
    },
    applySummaryMarkers() {
      if (!markersInst)
        return;
      const list = this.summaryPoints || [];
      const geos = [];
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (typeof p.x === "number" && typeof p.y === "number") {
          geos.push({ id: String(p.id), position: new TMap.LatLng(p.y, p.x), styleId: "poi", content: p.name });
        }
      }
      markersInst.setGeometries(geos);
    },
    closeSummary() {
      this.showSummaryPanel = false;
      this.loadAllMarkers();
    },
    openPointCard(p) {
      this.pointCard = p;
      this.pointCardVisible = true;
      const w = 560, h = 520;
      common_vendor.index.getSystemInfo({
        success: (info) => {
          const left = Math.max(10, Math.floor((info.windowWidth - w) / 2));
          const top = Math.max(60, Math.floor((info.windowHeight - h) / 2));
          this.pointCardLeft = left;
          this.pointCardTop = top;
        }
      });
    },
    closePointCard() {
      this.pointCardVisible = false;
      this.pointCard = null;
    },
    startNavToPoint() {
      if (!this.pointCard)
        return;
      this.endKeyword = this.pointCard.name || "";
      this.pointCardVisible = false;
      this.showSummaryPanel = false;
      if (markersInst) {
        markersInst.setGeometries([]);
      }
      this.handleRoutePlan();
    },
    setAsEnd() {
      if (!this.pointCard)
        return;
      this.endKeyword = this.pointCard.name || "";
      this.pointCardVisible = false;
      this.showSummaryPanel = false;
      if (markersInst) {
        markersInst.setGeometries([]);
      }
    },
    previewImage(src) {
      if (!src)
        return;
      const urls = Array.isArray(src) ? src : [src];
      common_vendor.index.previewImage({ current: urls[0], urls });
    },
    onPointCardTouchStart(e) {
      const t = e.touches && e.touches[0] || null;
      this.pcDragging = true;
      this.pcDragMode = "touch";
      this.pcDragStart = t ? { x: t.clientX || t.pageX, y: t.clientY || t.pageY } : { x: 0, y: 0 };
      this.pcBoxStart = { left: this.pointCardLeft, top: this.pointCardTop };
    },
    onPointCardTouchMove(e) {
      if (!this.pcDragging || this.pcDragMode !== "touch")
        return;
      const t = e.touches && e.touches[0] || null;
      if (!t)
        return;
      const dx = (t.clientX || t.pageX) - this.pcDragStart.x;
      const dy = (t.clientY || t.pageY) - this.pcDragStart.y;
      this.pointCardLeft = this.pcBoxStart.left + dx;
      this.pointCardTop = this.pcBoxStart.top + dy;
    },
    onPointCardTouchEnd() {
      this.pcDragging = false;
      this.pcDragMode = "";
    },
    onPointCardMouseDown(e) {
      this.pcDragging = true;
      this.pcDragMode = "mouse";
      this.pcDragStart = { x: e.clientX, y: e.clientY };
      this.pcBoxStart = { left: this.pointCardLeft, top: this.pointCardTop };
      if (typeof document !== "undefined") {
        document.addEventListener("mousemove", this.onPointCardMouseMove);
        document.addEventListener("mouseup", this.onPointCardMouseUp);
      }
    },
    onPointCardMouseMove(e) {
      if (!this.pcDragging || this.pcDragMode !== "mouse")
        return;
      const dx = e.clientX - this.pcDragStart.x;
      const dy = e.clientY - this.pcDragStart.y;
      this.pointCardLeft = this.pcBoxStart.left + dx;
      this.pointCardTop = this.pcBoxStart.top + dy;
    },
    onPointCardMouseUp() {
      this.pcDragging = false;
      this.pcDragMode = "";
      if (typeof document !== "undefined") {
        document.removeEventListener("mousemove", this.onPointCardMouseMove);
        document.removeEventListener("mouseup", this.onPointCardMouseUp);
      }
    },
    onSummaryTouchStart(e) {
      const t = e.touches && e.touches[0] || null;
      this.sDragging = true;
      this.sDragMode = "touch";
      if (t) {
        this.sDragStart = { x: t.clientX || t.pageX, y: t.clientY || t.pageY };
      } else {
        this.sDragStart = { x: 0, y: 0 };
      }
      this.sBoxStart = { left: this.summaryBoxLeft, top: this.summaryBoxTop };
    },
    onSummaryTouchMove(e) {
      if (!this.sDragging || this.sDragMode !== "touch")
        return;
      const t = e.touches && e.touches[0] || null;
      if (!t)
        return;
      const dx = (t.clientX || t.pageX) - this.sDragStart.x;
      const dy = (t.clientY || t.pageY) - this.sDragStart.y;
      this.summaryBoxLeft = this.sBoxStart.left + dx;
      this.summaryBoxTop = this.sBoxStart.top + dy;
    },
    onSummaryTouchEnd() {
      this.sDragging = false;
      this.sDragMode = "";
    },
    onSummaryMouseDown(e) {
      this.sDragging = true;
      this.sDragMode = "mouse";
      this.sDragStart = { x: e.clientX, y: e.clientY };
      this.sBoxStart = { left: this.summaryBoxLeft, top: this.summaryBoxTop };
      if (typeof document !== "undefined") {
        document.addEventListener("mousemove", this.onSummaryMouseMove);
        document.addEventListener("mouseup", this.onSummaryMouseUp);
      }
    },
    onSummaryMouseMove(e) {
      if (!this.sDragging || this.sDragMode !== "mouse")
        return;
      const dx = e.clientX - this.sDragStart.x;
      const dy = e.clientY - this.sDragStart.y;
      this.summaryBoxLeft = this.sBoxStart.left + dx;
      this.summaryBoxTop = this.sBoxStart.top + dy;
    },
    onSummaryMouseUp() {
      this.sDragging = false;
      this.sDragMode = "";
      if (typeof document !== "undefined") {
        document.removeEventListener("mousemove", this.onSummaryMouseMove);
        document.removeEventListener("mouseup", this.onSummaryMouseUp);
      }
    },
    loadAllMarkers() {
      common_vendor.index.request({
        url: "http://127.0.0.1:8080/point/list",
        method: "GET",
        success: (res) => {
          const points = res.data && res.data.points || [];
          const geometries = [];
          for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (typeof p.x === "number" && typeof p.y === "number") {
              geometries.push({ id: String(p.id), position: new TMap.LatLng(p.y, p.x), styleId: "poi", content: p.name });
            }
          }
          if (markersInst) {
            markersInst.setGeometries(geometries);
          }
        },
        fail: () => {
        }
      });
    },
    toggleSearchPanel() {
      this.showRoutePanel = !this.showRoutePanel;
    },
    async handleRoutePlan() {
      common_vendor.index.showLoading({ title: "准备路线中..." });
      if (markersInst) {
        markersInst.setGeometries([]);
      }
      this.results = [];
      try {
        let startLocation = null;
        if (!this.startKeyword || this.startKeyword.trim() === "" || this.startKeyword === "我的位置") {
          startLocation = await this.getCurrentLocation();
        } else {
          startLocation = await this.getCoordsByKeyword(this.startKeyword);
        }
        let endLocation = null;
        if (!this.endKeyword) {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "请输入终点", icon: "none" });
          return;
        }
        endLocation = await this.getCoordsByKeyword(this.endKeyword);
        if (startLocation && endLocation) {
          this.planRoute(startLocation, endLocation);
        }
      } catch (e) {
        common_vendor.index.hideLoading();
        common_vendor.index.__f__("error", "at pages/index/index.vue:521", e);
        common_vendor.index.showToast({ title: "地址解析失败", icon: "none" });
      }
    },
    getCurrentLocation() {
      return new Promise((resolve) => {
        common_vendor.index.getLocation({
          type: "gcj02",
          isHighAccuracy: true,
          highAccuracyExpireTime: 5e3,
          timeout: 8e3,
          success: (res) => {
            resolve(new TMap.LatLng(res.latitude, res.longitude));
          },
          fail: () => {
            resolve(new TMap.LatLng(22.595546, 113.086064));
          }
        });
      });
    },
    getCoordsByKeyword(keyword) {
      return new Promise((resolve, reject) => {
        common_vendor.index.request({
          url: "http://127.0.0.1:8080/point/list",
          method: "GET",
          success: (res) => {
            const points = res.data && res.data.points || [];
            const k = String(keyword).trim();
            let p = points.find((it) => it && typeof it.name === "string" && it.name === k);
            if (!p)
              p = points.find((it) => it && typeof it.name === "string" && it.name.includes(k));
            if (p && typeof p.x === "number" && typeof p.y === "number") {
              resolve(new TMap.LatLng(p.y, p.x));
            } else {
              reject("未找到该地点");
            }
          },
          fail: reject
        });
      });
    },
    async planRoute(start, end) {
      const slat = start.getLat ? start.getLat() : start.lat;
      const slng = start.getLng ? start.getLng() : start.lng;
      const elat = end.getLat ? end.getLat() : end.lat;
      const elng = end.getLng ? end.getLng() : end.lng;
      const from = `${slat},${slng}`;
      const to = `${elat},${elng}`;
      const mode = this.routeMode || "driving";
      common_vendor.index.request({
        url: `/qqmap/ws/direction/v1/${mode}`,
        method: "GET",
        data: { from, to, key: "SWABZ-BCY64-WIHUL-KCDGA-OMFUV-JWFS5" },
        success: (res) => {
          common_vendor.index.hideLoading();
          const route = res.data && res.data.result && res.data.result.routes && res.data.result.routes[0];
          if (!route || !route.polyline) {
            common_vendor.index.showToast({ title: "未找到路线", icon: "none" });
            return;
          }
          const pl = route.polyline.slice();
          for (let i = 2; i < pl.length; i++)
            pl[i] = pl[i - 2] + pl[i] / 1e6;
          const path = [];
          for (let i = 0; i < pl.length; i += 2)
            path.push(new TMap.LatLng(pl[i], pl[i + 1]));
          this.drawRoute(path);
          seMarkersInst && seMarkersInst.setGeometries([
            { id: "start", styleId: "start", position: new TMap.LatLng(slat, slng) },
            { id: "end", styleId: "end", position: new TMap.LatLng(elat, elng) }
          ]);
          const startName = !this.startKeyword || this.startKeyword.trim() === "" || this.startKeyword === "我的位置" ? "我的位置" : this.startKeyword;
          const endName = this.endKeyword;
          seLabelsInst && seLabelsInst.setGeometries([
            { id: "startLabel", styleId: "startLabel", position: new TMap.LatLng(slat, slng), content: startName },
            { id: "endLabel", styleId: "endLabel", position: new TMap.LatLng(elat, elng), content: endName }
          ]);
          const bounds = new TMap.LatLngBounds();
          path.forEach((pt) => bounds.extend(pt));
          mapInst.fitBounds(bounds, { padding: 80 });
          this.results = [];
        },
        fail: () => {
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "路线规划失败", icon: "none" });
        }
      });
    },
    drawRoute(path) {
      if (routeLayerInst) {
        routeLayerInst.setGeometries([]);
        routeLayerInst.destroy();
      }
      routeLayerInst = new TMap.MultiPolyline({
        id: "route-layer",
        map: mapInst,
        styles: {
          "route": new TMap.PolylineStyle({ color: "#3777FF", width: 6, borderWidth: 2, borderColor: "#FFF", lineCap: "round" })
        },
        geometries: [{ id: "route", styleId: "route", paths: path }]
      });
    },
    onRouteBoxTouchStart(e) {
      const t = e.touches && e.touches[0] || null;
      this.dragging = true;
      this.dragMode = "touch";
      if (t) {
        this.dragStart = { x: t.clientX || t.pageX, y: t.clientY || t.pageY };
      } else {
        this.dragStart = { x: 0, y: 0 };
      }
      this.boxStart = { left: this.routeBoxLeft, top: this.routeBoxTop };
    },
    onRouteBoxTouchMove(e) {
      if (!this.dragging || this.dragMode !== "touch")
        return;
      const t = e.touches && e.touches[0] || null;
      if (!t)
        return;
      const dx = (t.clientX || t.pageX) - this.dragStart.x;
      const dy = (t.clientY || t.pageY) - this.dragStart.y;
      this.routeBoxLeft = this.boxStart.left + dx;
      this.routeBoxTop = this.boxStart.top + dy;
    },
    onRouteBoxTouchEnd() {
      this.dragging = false;
      this.dragMode = "";
    },
    onRouteBoxMouseDown(e) {
      this.dragging = true;
      this.dragMode = "mouse";
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.boxStart = { left: this.routeBoxLeft, top: this.routeBoxTop };
      if (typeof document !== "undefined") {
        document.addEventListener("mousemove", this.onRouteBoxMouseMove);
        document.addEventListener("mouseup", this.onRouteBoxMouseUp);
      }
    },
    onRouteBoxMouseMove(e) {
      if (!this.dragging || this.dragMode !== "mouse")
        return;
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      this.routeBoxLeft = this.boxStart.left + dx;
      this.routeBoxTop = this.boxStart.top + dy;
    },
    onRouteBoxMouseUp() {
      this.dragging = false;
      this.dragMode = "";
      if (typeof document !== "undefined") {
        document.removeEventListener("mousemove", this.onRouteBoxMouseMove);
        document.removeEventListener("mouseup", this.onRouteBoxMouseUp);
      }
    },
    onStartInput(e) {
      this.focusedField = "start";
      const v = e && e.detail ? e.detail.value : this.startKeyword;
      this.startKeyword = v;
      if (this.startTimer)
        clearTimeout(this.startTimer);
      this.startTimer = setTimeout(() => {
        this.fetchSuggestions("start", v);
      }, 200);
    },
    onEndInput(e) {
      this.focusedField = "end";
      const v = e && e.detail ? e.detail.value : this.endKeyword;
      this.endKeyword = v;
      if (this.endTimer)
        clearTimeout(this.endTimer);
      this.endTimer = setTimeout(() => {
        this.fetchSuggestions("end", v);
      }, 200);
    },
    fetchSuggestions(field, keyword) {
      const k = String(keyword || "").trim();
      if (!k) {
        this.startSuggestions = [];
        this.endSuggestions = [];
        return;
      }
      common_vendor.index.request({
        url: "http://127.0.0.1:8080/point/list",
        method: "GET",
        success: (res) => {
          const points = res.data && res.data.points || [];
          const list = points.filter((it) => it && typeof it.name === "string" && it.name.includes(k)).slice(0, 10).map((it) => ({ id: String(it.id), name: it.name, x: it.x, y: it.y }));
          if (field === "start")
            this.startSuggestions = list;
          else
            this.endSuggestions = list;
        },
        fail: () => {
          if (field === "start")
            this.startSuggestions = [];
          else
            this.endSuggestions = [];
        }
      });
    },
    selectStartSuggestion(s) {
      this.startKeyword = s && s.name ? s.name : this.startKeyword;
      this.startSuggestions = [];
      this.focusedField = "";
    },
    selectEndSuggestion(s) {
      this.endKeyword = s && s.name ? s.name : this.endKeyword;
      this.endSuggestions = [];
      this.focusedField = "";
    },
    onStartBlur() {
      if (this.startBlurTimer)
        clearTimeout(this.startBlurTimer);
      this.startBlurTimer = setTimeout(() => {
        if (this.focusedField === "start") {
          this.focusedField = "";
          this.startSuggestions = [];
        }
      }, 150);
    },
    onEndBlur() {
      if (this.endBlurTimer)
        clearTimeout(this.endBlurTimer);
      this.endBlurTimer = setTimeout(() => {
        if (this.focusedField === "end") {
          this.focusedField = "";
          this.endSuggestions = [];
        }
      }, 150);
    }
  },
  onUnload() {
    if (mapInst) {
      mapInst.destroy();
      mapInst = null;
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_assets._imports_0,
    b: common_vendor.o((...args) => $options.toggleSearchPanel && $options.toggleSearchPanel(...args)),
    c: common_vendor.o((...args) => $options.toSummary && $options.toSummary(...args)),
    d: common_vendor.t($data.username || "登录"),
    e: common_vendor.o((...args) => $options.onLoginClick && $options.onLoginClick(...args)),
    f: $data.username && $data.dropdownOpen
  }, $data.username && $data.dropdownOpen ? {
    g: common_vendor.o((...args) => $options.logout && $options.logout(...args)),
    h: common_vendor.o((...args) => $options.onLoginMouseEnter && $options.onLoginMouseEnter(...args)),
    i: common_vendor.o((...args) => $options.onLoginMouseLeave && $options.onLoginMouseLeave(...args))
  } : {}, {
    j: common_vendor.o((...args) => $options.onLoginMouseEnter && $options.onLoginMouseEnter(...args)),
    k: common_vendor.o((...args) => $options.onLoginMouseLeave && $options.onLoginMouseLeave(...args)),
    l: $data.showRoutePanel
  }, $data.showRoutePanel ? common_vendor.e({
    m: common_vendor.o((...args) => $options.closePanel && $options.closePanel(...args)),
    n: $data.routeMode === "walking" ? 1 : "",
    o: common_vendor.o(($event) => $options.changeMode("walking")),
    p: $data.routeMode === "driving" ? 1 : "",
    q: common_vendor.o(($event) => $options.changeMode("driving")),
    r: $data.routeMode === "bicycling" ? 1 : "",
    s: common_vendor.o(($event) => $options.changeMode("bicycling")),
    t: common_vendor.o((...args) => $options.swapPoints && $options.swapPoints(...args)),
    v: common_vendor.o([($event) => $data.startKeyword = $event.detail.value, (...args) => $options.onStartInput && $options.onStartInput(...args)]),
    w: common_vendor.o(($event) => $data.focusedField = "start"),
    x: common_vendor.o((...args) => $options.onStartBlur && $options.onStartBlur(...args)),
    y: $data.startKeyword,
    z: common_vendor.o((...args) => $options.clearStart && $options.clearStart(...args)),
    A: $data.focusedField === "start" && $data.startSuggestions.length
  }, $data.focusedField === "start" && $data.startSuggestions.length ? {
    B: common_vendor.f($data.startSuggestions, (s, k0, i0) => {
      return {
        a: common_vendor.t(s.name),
        b: s.id,
        c: common_vendor.o(($event) => $options.selectStartSuggestion(s), s.id)
      };
    })
  } : {}, {
    C: common_vendor.o([($event) => $data.endKeyword = $event.detail.value, (...args) => $options.onEndInput && $options.onEndInput(...args)]),
    D: common_vendor.o(($event) => $data.focusedField = "end"),
    E: common_vendor.o((...args) => $options.onEndBlur && $options.onEndBlur(...args)),
    F: $data.endKeyword,
    G: common_vendor.o((...args) => $options.clearEnd && $options.clearEnd(...args)),
    H: $data.focusedField === "end" && $data.endSuggestions.length
  }, $data.focusedField === "end" && $data.endSuggestions.length ? {
    I: common_vendor.f($data.endSuggestions, (s, k0, i0) => {
      return {
        a: common_vendor.t(s.name),
        b: s.id,
        c: common_vendor.o(($event) => $options.selectEndSuggestion(s), s.id)
      };
    })
  } : {}, {
    J: common_vendor.o((...args) => $options.handleRoutePlan && $options.handleRoutePlan(...args)),
    K: common_vendor.o((...args) => $options.clearRoute && $options.clearRoute(...args)),
    L: $data.routeBoxLeft + "px",
    M: $data.routeBoxTop + "px",
    N: common_vendor.o((...args) => $options.onRouteBoxTouchStart && $options.onRouteBoxTouchStart(...args)),
    O: common_vendor.o((...args) => $options.onRouteBoxTouchMove && $options.onRouteBoxTouchMove(...args)),
    P: common_vendor.o((...args) => $options.onRouteBoxTouchEnd && $options.onRouteBoxTouchEnd(...args)),
    Q: common_vendor.o((...args) => $options.onRouteBoxMouseDown && $options.onRouteBoxMouseDown(...args))
  }) : {}, {
    R: $data.showSummaryPanel
  }, $data.showSummaryPanel ? {
    S: common_vendor.o((...args) => $options.closeSummary && $options.closeSummary(...args)),
    T: common_vendor.f($data.summaryCategories, (c, k0, i0) => {
      return {
        a: common_vendor.t(c),
        b: c,
        c: $data.selectedCategory === c ? 1 : "",
        d: common_vendor.o(($event) => $options.selectCategory(c), c)
      };
    }),
    U: common_vendor.f($data.summaryPoints, (p, k0, i0) => {
      return {
        a: p.img,
        b: common_vendor.t(p.name),
        c: p.id,
        d: common_vendor.o(($event) => $options.openPointCard(p), p.id)
      };
    }),
    V: $data.summaryBoxLeft + "px",
    W: $data.summaryBoxTop + "px",
    X: common_vendor.o((...args) => $options.onSummaryTouchStart && $options.onSummaryTouchStart(...args)),
    Y: common_vendor.o((...args) => $options.onSummaryTouchMove && $options.onSummaryTouchMove(...args)),
    Z: common_vendor.o((...args) => $options.onSummaryTouchEnd && $options.onSummaryTouchEnd(...args)),
    aa: common_vendor.o((...args) => $options.onSummaryMouseDown && $options.onSummaryMouseDown(...args))
  } : {}, {
    ab: $data.pointCardVisible
  }, $data.pointCardVisible ? {
    ac: common_vendor.t($data.pointCard.name),
    ad: common_vendor.o((...args) => $options.closePointCard && $options.closePointCard(...args)),
    ae: $data.pointCard.img,
    af: common_vendor.o(($event) => $options.previewImage($data.pointCard.img)),
    ag: common_vendor.t($data.pointCard.description),
    ah: common_vendor.o((...args) => $options.startNavToPoint && $options.startNavToPoint(...args)),
    ai: common_vendor.o((...args) => $options.setAsEnd && $options.setAsEnd(...args)),
    aj: $data.pointCardLeft + "px",
    ak: $data.pointCardTop + "px",
    al: common_vendor.o((...args) => $options.onPointCardTouchStart && $options.onPointCardTouchStart(...args)),
    am: common_vendor.o((...args) => $options.onPointCardTouchMove && $options.onPointCardTouchMove(...args)),
    an: common_vendor.o((...args) => $options.onPointCardTouchEnd && $options.onPointCardTouchEnd(...args)),
    ao: common_vendor.o((...args) => $options.onPointCardMouseDown && $options.onPointCardMouseDown(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
