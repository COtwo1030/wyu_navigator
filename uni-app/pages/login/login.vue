<template>
	<view class="viewport">
		<view class="bg-shape shape-1"></view>
		<view class="bg-shape shape-2"></view>
		
		<view class="container">
			<view class="login-card">
				<view class="card-header">
					<text class="main-title">欢迎登录</text>
				</view>

				<view class="form-area">
					<view class="input-item" :class="{ 'is-focus': active === 'email' }">
						<text class="input-label">邮箱地址</text>
						<input 
							type="text" 
							v-model="email" 
							placeholder="请输入您的邮箱" 
							@focus="active = 'email'" 
							@blur="active = ''"
						/>
					</view>

					<view class="input-item" :class="{ 'is-focus': active === 'pass' }">
						<text class="input-label">安全密码</text>
						<input 
							password 
							v-model="password" 
							placeholder="请输入登录密码" 
							@focus="active = 'pass'" 
							@blur="active = ''"
						/>
					</view>

					<view class="helper-line">
						<text class="forget-link" @click="toForget">忘记密码？</text>
					</view>

					<button class="login-button" :loading="loading" @click="login">
						登 录
					</button>
				</view>

				<view class="card-footer">
					<text>还没有账号？</text>
					<text class="reg-link" @click="toRegister">立即注册</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				email: '',
				password: '',
				loading: false,
				active: '',
				baseUrl: 'http://127.0.0.1:8080'
			}
		},
		methods: {
			async login() {
				if (!this.email || !this.password) {
					uni.showToast({ title: '请完善登录信息', icon: 'none' });
					return;
				}
				this.loading = true;
				
				uni.request({
					url: `${this.baseUrl}/auth/login`,
					method: 'POST',
					data: {
						email: this.email,
						password: this.password
					},
					success: (res) => {
						if (res.statusCode === 200) {
							uni.showToast({ title: '登录成功' });
							try {
								let payload = res.data;
								if (typeof payload === 'string') {
									try { payload = JSON.parse(payload); } catch (e) {}
								}
								if (payload && payload.token) {
									uni.setStorageSync('token', payload.token);
								}
								let uname = '';
								if (payload && payload.username) {
									uname = payload.username;
								} else if (payload && payload.user && payload.user.username) {
									uname = payload.user.username;
								} else if (this.email) {
									const idx = this.email.indexOf('@');
									uname = idx > 0 ? this.email.slice(0, idx) : this.email;
								}
								if (uname) {
									uni.setStorageSync('username', uname);
								}
							} catch (e) {}
							uni.reLaunch({ url: '/pages/index/index' });
						} else {
							uni.showToast({ title: res.data.detail || '登录失败', icon: 'none' });
						}
					},
					fail: () => {
						uni.showToast({ title: '服务器连接失败', icon: 'none' });
					},
					complete: () => {
						this.loading = false;
					}
				});
			},
			toRegister() {
				uni.navigateTo({ url: '/pages/register/register' });
			},
			toForget() {
				uni.navigateTo({ url: '/pages/fgps/fgps' });
			}
		}
	}
</script>

<style>
.viewport {
	min-height: 100vh;
	background-color: #f8fafc;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;
	overflow: hidden;
}

.bg-shape {
	position: absolute;
	border-radius: 50%;
	filter: blur(80px);
	z-index: 0;
}
.shape-1 { top: -10%; right: -10%; width: 500rpx; height: 500rpx; background: rgba(0, 98, 255, 0.08); }
.shape-2 { bottom: -10%; left: -5%; width: 600rpx; height: 600rpx; background: rgba(0, 198, 255, 0.06); }

.container {
	width: 100%;
	display: flex;
	justify-content: center;
	padding: 40rpx;
	z-index: 1;
}

.login-card {
	width: 100%;
	max-width: 440px;
	background: #ffffff;
	border-radius: 32rpx;
	padding: 60rpx;
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
	animation: slideUp 0.6s ease-out;
}

.card-header {
	text-align: left; /* 改为左对齐与注册页一致 */
	margin-bottom: 60rpx;
}

.main-title {
  font-size: 52rpx;
  font-weight: 700;
  color: #0f172a;
  display: block;
  /* 核心：文字水平居中 */
  text-align: center; 
}

.sub-title {
	font-size: 28rpx;
	color: #64748b;
	margin-top: 16rpx;
	display: block;
}

/* 关键：放大标签大小 */
.input-label {
	font-size: 30rpx; 
	color: #1e293b;
	font-weight: 600;
	margin-bottom: 20rpx;
	display: block;
}

.input-item {
	margin-bottom: 45rpx;
	border-bottom: 2px solid #f1f5f9;
	transition: all 0.3s;
	padding-bottom: 10rpx;
}

.is-focus {
	border-bottom-color: #0062ff;
	transform: translateY(-2rpx);
}

input {
	height: 80rpx;
	font-size: 32rpx;
	color: #334155;
}

.helper-line {
	display: flex;
	justify-content: flex-end;
	margin-top: -10rpx;
	margin-bottom: 60rpx;
}

.forget-link {
	font-size: 26rpx;
	color: #0062ff;
}

.login-button {
	width: 100%;
	height: 110rpx;
	line-height: 110rpx;
	background: #1e293b;
	color: #ffffff;
	border-radius: 16rpx;
	font-size: 32rpx;
	font-weight: 600;
	border: none;
}

.login-button:active {
	transform: scale(0.98);
}

.card-footer {
	margin-top: 60rpx;
	text-align: center;
	font-size: 28rpx;
	color: #64748b;
}

.reg-link {
	color: #0062ff;
	margin-left: 10rpx;
	font-weight: 600;
}

@keyframes slideUp {
	from { opacity: 0; transform: translateY(40px); }
	to { opacity: 1; transform: translateY(0); }
}
</style>
