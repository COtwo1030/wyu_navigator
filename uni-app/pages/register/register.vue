<template>
	<view class="viewport">
		<view class="bg-shape shape-1"></view>
		<view class="bg-shape shape-2"></view>
		
		<view class="container">
			<view class="register-card">
				<view class="back-icon" @click="toLogin">
					<text class="arrow">〈</text>
				</view>

				<view class="card-header">
					<text class="main-title">创建新账号</text>
				</view>

				<view class="form-area">
					<view class="input-item" :class="{ 'is-focus': active === 'email' }">
						<text class="input-label">电子邮箱</text>
						<input 
							type="text" 
							v-model="email" 
							placeholder="请输入邮箱地址" 
							@focus="active = 'email'" 
							@blur="active = ''"
						/>
					</view>

					<view class="code-row">
						<view class="input-item code-input" :class="{ 'is-focus': active === 'code' }">
							<text class="input-label">验证码</text>
							<input 
								type="number" 
								v-model="code" 
								placeholder="4 位验证码" 
								@focus="active = 'code'" 
								@blur="active = ''"
							/>
						</view>
						<button 
							class="standalone-code-btn" 
							:class="{ 'disabled': counting }"
							@click="getCode"
						>
							{{ codeBtnText }}
						</button>
					</view>

					<view class="input-item" :class="{ 'is-focus': active === 'user' }">
						<text class="input-label">用户名</text>
						<input 
							type="text" 
							v-model="username" 
							placeholder="设置您的账户名称" 
							@focus="active = 'user'" 
							@blur="active = ''"
						/>
					</view>

					<view class="input-item" :class="{ 'is-focus': active === 'pass' }">
						<text class="input-label">账户密码</text>
						<input 
							password 
							v-model="password" 
							placeholder="设置安全密码" 
							@focus="active = 'pass'" 
							@blur="active = ''"
						/>
					</view>

					<view class="input-item" :class="{ 'is-focus': active === 'confirm' }">
						<text class="input-label">确认密码</text>
						<input 
							password 
							v-model="confirm_password" 
							placeholder="再次输入密码" 
							@focus="active = 'confirm'" 
							@blur="active = ''"
						/>
					</view>

					<button class="submit-button" :loading="loading" @click="register">
						立即注册
					</button>
				</view>

				<view class="card-footer">
					<text>已经有账号了？</text>
					<text class="login-link" @click="toLogin">返回登录</text>
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
				code: '',
				username: '',
				password: '',
				confirm_password: '',
				counting: false,
				count: 60,
				codeBtnText: '获取验证码',
				active: '',
				loading: false,
				baseUrl: 'http://127.0.0.1:8080'
			}
		},
		methods: {
			async getCode() {
				if (this.counting) return;
				if (!/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(this.email)) {
					uni.showToast({ title: '邮箱格式错误', icon: 'none' });
					return;
				}
				this.counting = true;
				this.countDown();
				uni.request({
					url: `${this.baseUrl}/auth/code?email=${this.email}`,
					method: 'POST',
					success: (res) => {
						if (res.statusCode === 200) {
							uni.showToast({ title: '已发送至邮箱' });
						} else {
							uni.showToast({ title: res.data.detail || '发送失败', icon: 'none' });
							this.resetCountDown();
						}
					},
					fail: () => {
						uni.showToast({ title: '请求失败', icon: 'none' });
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
				}, 1000);
			},
			resetCountDown() {
				this.counting = false;
				this.count = 60;
				this.codeBtnText = '获取验证码';
				if(this.timer) clearInterval(this.timer);
			},
			register() {
				if (!this.email || !this.code || !this.username || !this.password || !this.confirm_password) {
					return uni.showToast({ title: '请完善注册信息', icon: 'none' });
				}
				if (this.password !== this.confirm_password) {
					return uni.showToast({ title: '两次密码不一致', icon: 'none' });
				}
				this.loading = true;
				uni.request({
					url: `${this.baseUrl}/auth/register`,
					method: 'POST',
					data: {
						username: this.username,
						password: this.password,
						confirm_password: this.confirm_password,
						email: this.email,
						code: this.code
					},
					success: (res) => {
						if (res.statusCode === 200) {
							uni.showToast({ title: '注册成功' });
							setTimeout(() => this.toLogin(), 1500);
						} else {
							uni.showToast({ title: res.data.detail || '注册失败', icon: 'none' });
						}
					},
					complete: () => { this.loading = false; }
				});
			},
			toLogin() { uni.navigateBack(); }
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
	padding: 40rpx 0;
}

.bg-shape {
	position: absolute;
	border-radius: 50%;
	filter: blur(80px);
	z-index: 0;
}
.shape-1 { top: -5%; right: -5%; width: 400rpx; height: 400rpx; background: rgba(0, 98, 255, 0.08); }
.shape-2 { bottom: -5%; left: -5%; width: 500rpx; height: 500rpx; background: rgba(0, 198, 255, 0.06); }

.container {
	width: 100%;
	display: flex;
	justify-content: center;
	z-index: 1;
}

.register-card {
	position: relative; /* 必须设为 relative 以便返回标志定位 */
	width: 90%;
	max-width: 460px;
	background: #ffffff;
	border-radius: 32rpx;
	padding: 80rpx 60rpx 60rpx; /* 顶部多留一点 padding 给返回键 */
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
	animation: slideUp 0.6s ease-out;
}

/* 返回标志样式 */
.back-icon {
	position: absolute;
	top: 30rpx;
	left: 30rpx;
	width: 60rpx;
	height: 60rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	cursor: pointer;
	border-radius: 50%;
	transition: background 0.2s;
}

.back-icon:active {
	background-color: #f1f5f9;
}

.arrow {
	font-size: 36rpx;
	color: #64748b;
	font-weight: bold;
}

.card-header {
	margin-bottom: 60rpx;
}

.main-title {
	font-size: 52rpx;
	font-weight: 700;
	color: #0f172a;
	display: block;
	text-align: center; 
}

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
}

input {
	height: 80rpx;
	font-size: 32rpx;
}

.code-row {
	display: flex;
	align-items: flex-end;
	gap: 20rpx;
	margin-bottom: 45rpx;
}

.code-input {
	flex: 1;
	margin-bottom: 0;
}

.standalone-code-btn {
	height: 90rpx;
	line-height: 90rpx;
	padding: 0 30rpx;
	font-size: 26rpx;
	background-color: #f1f5f9;
	color: #0062ff;
	border-radius: 12rpx;
	border: none;
	white-space: nowrap;
}

.standalone-code-btn::after { border: none; }

.submit-button {
	width: 100%;
	height: 110rpx;
	line-height: 110rpx;
	background: #1e293b;
	color: white;
	border-radius: 16rpx;
	font-size: 32rpx;
	font-weight: 600;
	margin-top: 40rpx;
}

.card-footer {
	margin-top: 60rpx;
	text-align: center;
	font-size: 28rpx;
	color: #64748b;
}

.login-link {
	color: #0062ff;
	margin-left: 10rpx;
	font-weight: 600;
}

@keyframes slideUp {
	from { opacity: 0; transform: translateY(40px); }
	to { opacity: 1; transform: translateY(0); }
}
</style>