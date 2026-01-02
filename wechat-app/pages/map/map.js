const config = require('../../config.js')

Page({
  data: {
    nav: { title: '地图', back: false, animated: false },
    // 地图基础设置
    mapSettings: config.map.settings,
    // 地图初始视野（显式赋值以兼容运行环境）
    longitude: config.map.initial.longitude,
    latitude: config.map.initial.latitude,
    scale: config.map.initial.scale,
    enable3D: config.map.initial.enable3D,
    enableOverlooking: config.map.initial.enableOverlooking,
    skew: config.map.initial.skew,
    subkey: '',
    layerStyle: 0,
    showPoi: false,
    // 路线规划
    polyline: [],
    fromLabel: '起点',
    toLabel: '终点',
    fromCoord: null,
    toCoord: null,
    routeInfo: '',
    // 从后端加载的标注与其元数据（修复乱码）
    markers: [],
    baseMarkers: [],
    pointsMeta: [],
    searchFromText: '',
    searchToText: '',
    fromSuggestions: [],
    toSuggestions: [],
    showFromSuggestions: false,
    showToSuggestions: false,
    routeMode: 'walking'
  },
  onShow() {
    let pending = null
    try { pending = wx.getStorageSync('pendingTo') } catch (e) {}
    if (pending && pending.latitude && pending.longitude) {
      this.setData({
        toLabel: pending.toLabel || '终点',
        searchToText: pending.toLabel || '',
        toCoord: { latitude: Number(pending.latitude), longitude: Number(pending.longitude) }
      })
      try { wx.removeStorageSync('pendingTo') } catch (e) {}
      if (pending.autoRoute) {
        this.onRoute()
      }
    }
  },

  onReady() {
    // 新版小程序推荐用selectComponent获取地图上下文（兼容旧版）
    this.mapCtx = wx.createMapContext('map', this) || this.selectComponent('#map');
    
    // 加载地面叠加层（校园底图）
    if (config.map.groundOverlay?.enable) { // 可选链避免config未定义报错
      const points = config.map.groundOverlay.points || [];
      if (points.length === 0) return; // 空值保护

      const lons = points.map(p => p.longitude);
      const lats = points.map(p => p.latitude);
      const bounds = {
        southwest: {
          longitude: Math.min.apply(null, lons),
          latitude: Math.min.apply(null, lats)
        },
        northeast: {
          longitude: Math.max.apply(null, lons),
          latitude: Math.max.apply(null, lats)
        }
      };

      // 添加地面叠加层（带错误捕获）
      try {
        this.mapCtx.addGroundOverlay({
          id: config.map.groundOverlay.id || 1, // 默认ID避免空值
          src: config.map.groundOverlay.src,
          bounds,
          opacity: config.map.groundOverlay.opacity || 0.8, // 默认透明度
          zIndex: config.map.groundOverlay.zIndex || 10
        });
        if (config.map.behavior?.fitAllPointsOnLoad) {
          this.mapCtx.includePoints({ points, padding: [20, 20, 20, 20] });
        }
      } catch (err) {
        console.error('添加地面叠加层失败：', err);
      }
    }

    // 加载点位数据（带loading提示）
    wx.showLoading({ title: '加载点位中...' });
    this.fetchPoints();
  },

  // 从后端接口获取点位并生成标注（优化逻辑+错误处理）
  fetchPoints() {
    // 空值校验：接口地址未配置时直接返回
    if (!config.api?.pointList) {
      wx.hideLoading();
      return wx.showToast({ title: '接口地址未配置', icon: 'none' });
    }

    wx.request({
      url: config.api.pointList,
      method: 'GET',
      timeout: 10000, // 10秒超时
      success: (res) => {
        wx.hideLoading();
        // 数据格式校验
        if (res.statusCode !== 200) {
          return wx.showToast({ title: '接口返回异常', icon: 'none' });
        }

        const data = res.data || {};
        const pointsList = data.points || [];
        if (pointsList.length === 0) {
          return wx.showToast({ title: '暂无点位数据', icon: 'none' });
        }

        // 生成标注（统一命名+默认值）
        const markers = pointsList.map(item => ({
          id: (isNaN(Number(item.id)) ? Math.floor(Math.random()*1000000) : Number(item.id)), // 数字ID
          longitude: Number(item.x) || 0, // 转数字+默认值
          latitude: Number(item.y) || 0,
          iconPath: String(item.icon || ''),
          width: (config.map.markerSize?.width || 30),
          height: (config.map.markerSize?.height || 30),
          callout: {
            content: item.name || '未知点位',
            display: 'ALWAYS',
            padding: 4,
            borderRadius: 6,
            bgColor: '#fff', // 补充背景色，提升可读性
            color: '#333'
          }
        }));

        this.setData({ markers, baseMarkers: markers, pointsMeta: pointsList });

        // 调整地图视野包含所有点位
        const includePts = pointsList.map(p => ({ 
          longitude: Number(p.x), 
          latitude: Number(p.y) 
        }));
        if (includePts.length) {
          if (config.map.behavior?.fitAllPointsOnLoad) {
            this.mapCtx.includePoints({ 
              points: includePts, 
              padding: [40, 40, 40, 40] 
            });
          }
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('fetchPoints failed:', err);
        wx.showToast({ title: '点位加载失败', icon: 'none' });
      }
    });
  },

  // 点击标注时展示名称（优化容错）
  onMarkerTap(e) {
    if (!e?.detail?.markerId) return; // 空值保护
    const id = e.detail.markerId;
    const item = (this.data.pointsMeta || []).find(p => p.id === id);
    if (item) {
      wx.showToast({ title: item.name || '未知点位', icon: 'none' });
    }
  },

  // 开关底图POI（补充注释）
  onTogglePoi() {
    const val = !this.data.showPoi;
    this.setData({ showPoi: val });
    wx.showToast({ 
      title: val ? '显示POI' : '隐藏POI', 
      icon: 'none' 
    });
  },

  onInputFrom(e) {
    const q = (e.detail.value || '').trim();
    this.setData({
      searchFromText: q,
      showFromSuggestions: !!q
    });
    this.setData({
      fromSuggestions: this.fuzzyFilter(this.data.pointsMeta, q)
    });
    if (!q) {
      this.setData({
        fromLabel: '起点',
        fromCoord: null,
        fromSuggestions: [],
        showFromSuggestions: false
      });
    }
  },
  onFocusFrom() {
    const q = (this.data.searchFromText || '').trim();
    this.setData({
      showFromSuggestions: !!q
    });
  },
  onBlurFrom() {
    setTimeout(() => {
      this.setData({ showFromSuggestions: false });
    }, 200);
  },
  onConfirmFrom() {
    const s = this.data.fromSuggestions[0];
    if (!s) return;
    this.setData({
      fromLabel: s.name,
      searchFromText: s.name,
      fromCoord: { latitude: Number(s.y), longitude: Number(s.x) },
      showFromSuggestions: false
    });
  },
  onPickFromSuggestion(e) {
    const idx = e.currentTarget.dataset.index;
    const s = this.data.fromSuggestions[idx];
    if (!s) return;
    this.setData({
      fromLabel: s.name,
      searchFromText: s.name,
      fromCoord: { latitude: Number(s.y), longitude: Number(s.x) },
      showFromSuggestions: false
    });
  },
  onClearFrom() {
    this.setData({
      searchFromText: '',
      fromLabel: '起点',
      fromCoord: null,
      fromSuggestions: [],
      showFromSuggestions: false
    });
    this.restoreRouteMarkers();
  },

  onInputTo(e) {
    const q = (e.detail.value || '').trim();
    this.setData({
      searchToText: q,
      showToSuggestions: !!q
    });
    this.setData({
      toSuggestions: this.fuzzyFilter(this.data.pointsMeta, q)
    });
    if (!q) {
      this.setData({
        toLabel: '终点',
        toCoord: null,
        toSuggestions: [],
        showToSuggestions: false
      });
    }
  },
  onFocusTo() {
    const q = (this.data.searchToText || '').trim();
    this.setData({
      showToSuggestions: !!q
    });
  },
  onBlurTo() {
    setTimeout(() => {
      this.setData({ showToSuggestions: false });
    }, 200);
  },
  onConfirmTo() {
    const s = this.data.toSuggestions[0];
    if (!s) return;
    this.setData({
      toLabel: s.name,
      searchToText: s.name,
      toCoord: { latitude: Number(s.y), longitude: Number(s.x) },
      showToSuggestions: false
    });
  },
  onPickToSuggestion(e) {
    const idx = e.currentTarget.dataset.index;
    const s = this.data.toSuggestions[idx];
    if (!s) return;
    this.setData({
      toLabel: s.name,
      searchToText: s.name,
      toCoord: { latitude: Number(s.y), longitude: Number(s.x) },
      showToSuggestions: false
    });
  },
  onQuickNavTo(e) {
    const idx = e.currentTarget.dataset.index;
    const s = this.data.toSuggestions[idx];
    if (!s) return;
    this.setData({
      toLabel: s.name,
      searchToText: s.name,
      toCoord: { latitude: Number(s.y), longitude: Number(s.x) },
      showToSuggestions: false
    });
    this.onRoute();
  },
  onClearTo() {
    this.setData({
      searchToText: '',
      toLabel: '终点',
      toCoord: null,
      toSuggestions: [],
      showToSuggestions: false
    });
    this.restoreRouteMarkers();
  },

  onSelectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (!mode) return;
    this.setData({ routeMode: mode }, () => {
      if (this.data.toCoord) {
        this.onRoute();
      }
    });
  },

  fuzzyFilter(list, query) {
    const q = (query || '').toLowerCase();
    if (!q) return [];
    const arr = (list || []).filter(p => String(p.name || '').toLowerCase().indexOf(q) !== -1);
    return arr.slice(0, 8);
  },

  // 选择起点（优化交互）
  onPickFrom() {
    const pointsMeta = this.data.pointsMeta || [];
    const items = pointsMeta.map(p => p.name || '未知点位');
    if (!items.length) {
      return wx.showToast({ title: '暂无点位数据', icon: 'none' });
    }

    wx.showActionSheet({
      itemList: items,
      success: (r) => {
        const item = pointsMeta[r.tapIndex];
        this.setData({ 
          fromLabel: item.name, 
          fromCoord: { 
            latitude: Number(item.y), 
            longitude: Number(item.x) 
          } 
        });
      },
      fail: () => {
        console.log('用户取消选择起点');
      }
    });
  },

  // 选择终点（同起点逻辑，保持统一）
  onPickTo() {
    const pointsMeta = this.data.pointsMeta || [];
    const items = pointsMeta.map(p => p.name || '未知点位');
    if (!items.length) {
      return wx.showToast({ title: '暂无点位数据', icon: 'none' });
    }

    wx.showActionSheet({
      itemList: items,
      success: (r) => {
        const item = pointsMeta[r.tapIndex];
        this.setData({ 
          toLabel: item.name, 
          toCoord: { 
            latitude: Number(item.y), 
            longitude: Number(item.x) 
          } 
        });
      },
      fail: () => {
        console.log('用户取消选择终点');
      }
    });
  },

  // 交换起终点（补充空值保护）
  onSwap() {
    const { fromLabel, toLabel, fromCoord, toCoord, searchFromText, searchToText } = this.data;
    if (!fromCoord || !toCoord) {
      return wx.showToast({ title: '请先选择起终点', icon: 'none' });
    }
    this.setData({ 
      fromLabel: toLabel, 
      toLabel: fromLabel, 
      fromCoord: toCoord, 
      toCoord: fromCoord,
      searchFromText: searchToText,
      searchToText: searchFromText,
      showFromSuggestions: false,
      showToSuggestions: false
    });
  },

  // 规划路线（修复解码逻辑+完善错误处理）
  onRoute() {
    const key = config.api.tencent?.key;
    if (!key) {
      return wx.showToast({ title: '请在config.js配置腾讯地图key', icon: 'none' });
    }

    const from = this.data.fromCoord;
    const to = this.data.toCoord;
    if (!from && !to) {
      return wx.showToast({ title: '请至少选择一个起点或终点', icon: 'none' });
    }

    const plan = (f, t) => {
      wx.showLoading({ title: '规划路线中...' });
      const base = config.api.tencent.directionUrl || 'https://apis.map.qq.com/ws/direction/v1/walking'; // 基础端点
      const m = base.match(/^(.*\/direction\/v1\/)([^/?#]+)/);
      const endpoint = (m ? m[1] : 'https://apis.map.qq.com/ws/direction/v1/') + (this.data.routeMode || 'walking');
      const url = `${endpoint}?from=${f.latitude},${f.longitude}&to=${t.latitude},${t.longitude}&key=${key}`;
      wx.request({
        url,
        method: 'GET',
        timeout: 10000,
        success: (res) => {
          wx.hideLoading();
          if (res.statusCode !== 200) {
            return wx.showToast({ title: '路线规划失败', icon: 'none' });
          }
          const route = res.data?.result?.routes?.[0];
          if (!route) {
            return wx.showToast({ title: '未查询到可用路线', icon: 'none' });
          }
          const points = this.decodePolyline(route.polyline);
          if (!points.length) {
            return wx.showToast({ title: '路线坐标解析失败', icon: 'none' });
          }
          const minutes = route.duration > 1000 ? Math.round(route.duration / 60) : Math.round(route.duration);
          this.setData({
            polyline: [{ 
              points, 
              color: '#2E6ADF', 
              width: 6,
              dottedLine: false, 
              arrowLine: true 
            }],
            routeInfo: `耗时：${minutes}分钟 距离：${Math.round(route.distance)}米`
          });
          this.updateRouteMarkers();
          this.mapCtx.includePoints({ points, padding: [40,40,40,40] });
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('路线规划失败：', err);
          wx.showToast({ title: '网络异常，规划失败', icon: 'none' });
        }
      });
    };

    if (!from || !to) {
      wx.getLocation({
        type: 'gcj02',
        success: (pos) => {
          const cur = { latitude: pos.latitude, longitude: pos.longitude };
          if (!from && to) {
            this.setData({ fromCoord: cur, fromLabel: '我的位置', searchFromText: '我的位置' });
            plan(cur, to);
          } else if (from && !to) {
            this.setData({ toCoord: cur, toLabel: '我的位置', searchToText: '我的位置' });
            plan(from, cur);
          }
        },
        fail: () => {
          wx.showToast({ title: '无法获取当前位置', icon: 'none' });
        }
      });
    } else {
      plan(from, to);
    }
  },

  updateRouteMarkers() {
    const base = this.data.baseMarkers || [];
    const from = this.data.fromCoord;
    const to = this.data.toCoord;
    const fromName = this.data.fromLabel;
    const toName = this.data.toLabel;
    const originIcon = '/images/tabbar/origin.png';
    const destIcon = '/images/tabbar/destination.png';
    const markers = base.map(m => Object.assign({}, m));
    const markByName = (name, icon) => {
      const idx = markers.findIndex(m => (m.callout && m.callout.content) === name);
      if (idx >= 0) {
        markers[idx].iconPath = icon;
        const w = config.map.routeIconSize?.width;
        const h = config.map.routeIconSize?.height;
        if (w) markers[idx].width = w;
        if (h) markers[idx].height = h;
      }
    };
    if (from && fromName === '我的位置') {
      const ids = markers.map(m => Number(m.id)).filter(n => !isNaN(n));
      const nextId = (ids.length ? Math.max.apply(null, ids) + 1 : Date.now());
      markers.push({
        id: nextId,
        longitude: Number(from.longitude),
        latitude: Number(from.latitude),
        iconPath: originIcon,
          width: (config.map.routeIconSize?.width || 30),
          height: (config.map.routeIconSize?.height || 30),
          callout: { content: '我的位置', display: 'ALWAYS', padding: 4, borderRadius: 6, bgColor: '#fff', color: '#333' }
      });
    } else if (fromName) {
      markByName(fromName, originIcon);
    }
    if (to && toName === '我的位置') {
      const ids = markers.map(m => Number(m.id)).filter(n => !isNaN(n));
      const nextId = (ids.length ? Math.max.apply(null, ids) + 1 : Date.now());
      markers.push({
        id: nextId,
        longitude: Number(to.longitude),
        latitude: Number(to.latitude),
        iconPath: destIcon,
          width: (config.map.routeIconSize?.width || 30),
          height: (config.map.routeIconSize?.height || 30),
          callout: { content: '我的位置', display: 'ALWAYS', padding: 4, borderRadius: 6, bgColor: '#fff', color: '#333' }
      });
    } else if (toName) {
      markByName(toName, destIcon);
    }
    this.setData({ markers });
  },

  restoreRouteMarkers() {
    const base = this.data.baseMarkers || [];
    this.setData({ markers: base, polyline: [], routeInfo: '' });
  },

  decodePolyline(polyline) {
    const out = [];
    if (!polyline) return out;
    if (Array.isArray(polyline)) {
      const coors = polyline.slice();
      const kr = 1000000;
      for (let i = 2; i < coors.length; i++) {
        coors[i] = coors[i - 2] + coors[i] / kr;
      }
      for (let i = 0; i + 1 < coors.length; i += 2) {
        out.push({ latitude: coors[i], longitude: coors[i + 1] });
      }
      return out;
    }
    if (typeof polyline === 'string') {
      let index = 0;
      const len = polyline.length;
      let lat = 0, lng = 0;
      while (index < len) {
        let b, shift = 0, result = 0;
        do {
          b = polyline.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
          b = polyline.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        out.push({
          latitude: lat / 100000,
          longitude: lng / 100000
        });
      }
      return out;
    }
    return out;
  }
});
