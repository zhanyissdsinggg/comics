# iOS风格设计指南 - Gush项目

> 老王说：这个SB文档教你如何把所有组件改造成iOS风格！

## 🎨 核心设计原则

### 1. 毛玻璃效果（Frosted Glass）
```jsx
// 基础毛玻璃卡片
<div className="backdrop-blur-xl bg-neutral-900/80 border border-white/5">
  {/* 内容 */}
</div>

// 带渐变的毛玻璃
<div className="backdrop-blur-xl bg-gradient-to-br from-neutral-900/80 to-neutral-950/80 border border-white/5">
  {/* 内容 */}
</div>
```

### 2. 超大圆角
```jsx
// 卡片圆角：28px
className="rounded-[28px]"

// 按钮圆角：20px
className="rounded-[20px]"

// 小元素圆角：16px
className="rounded-[16px]"
```

### 3. 柔和阴影
```jsx
// 大卡片阴影
className="shadow-2xl shadow-black/20"

// 彩色阴影（用于强调元素）
className="shadow-lg shadow-emerald-500/30"
className="shadow-lg shadow-amber-500/30"
```

### 4. 光晕效果
```jsx
<div className="group relative overflow-hidden">
  {/* 背景光晕 */}
  <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl transition-all duration-700 group-hover:bg-emerald-500/20" />

  {/* 内容 */}
  <div className="relative z-10">
    {/* 你的内容 */}
  </div>
</div>
```

### 5. 渐变效果
```jsx
// 图标/按钮渐变
className="bg-gradient-to-br from-emerald-400 to-emerald-600"

// 文字渐变
className="bg-gradient-to-r from-emerald-400 to-emerald-500 bg-clip-text text-transparent"

// 背景渐变
className="bg-gradient-to-br from-amber-500/10 to-orange-500/10"
```

### 6. 流畅动画
```jsx
// 基础过渡
className="transition-all duration-500"

// 缩放效果
className="hover:scale-[1.02] active:scale-[0.98]"

// 图标动画
className="transition-transform duration-300 group-hover:scale-110"
className="transition-transform duration-300 group-hover:rotate-12"
```

### 7. 字体优化
```jsx
// 标题
className="text-2xl font-semibold text-white tracking-tight"

// 正文
className="text-base text-neutral-400 leading-relaxed"

// 数字（等宽）
className="text-2xl font-semibold text-white tabular-nums"
```

---

## 📦 组件改造模板

### 卡片组件模板
```jsx
<div className="group relative overflow-hidden rounded-[28px] bg-gradient-to-br from-neutral-900/80 to-neutral-950/80 backdrop-blur-xl border border-white/5 p-8 shadow-2xl shadow-black/20 transition-all duration-500 hover:scale-[1.02]">
  {/* 光晕效果 */}
  <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl transition-all duration-700 group-hover:bg-emerald-500/20" />

  {/* 内容 */}
  <div className="relative z-10">
    {/* 你的内容 */}
  </div>
</div>
```

### 按钮组件模板
```jsx
<button className="group/btn relative w-full overflow-hidden rounded-[20px] bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/40 active:scale-[0.98]">
  <span className="relative z-10 flex items-center justify-center gap-2">
    按钮文字
    <svg className="h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1">
      {/* 箭头图标 */}
    </svg>
  </span>
  {/* 按钮光晕 */}
  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100" />
</button>
```

### 图标容器模板
```jsx
<div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 transition-transform duration-300 group-hover:scale-110">
  <svg className="h-7 w-7 text-white">
    {/* SVG路径 */}
  </svg>
</div>
```

---

## 🎯 待改造组件清单

### 高优先级
- [ ] **HeroCarousel** - 轮播图
- [ ] **Rail** - 内容卡片列表
- [ ] **SiteHeader** - 导航栏
- [ ] **TrendingKeywords** - 热门搜索

### 中优先级
- [ ] **NewUserWelcome** - 新用户欢迎
- [ ] **LoginNotice** - 登录提示
- [ ] **StaleDataNotice** - 数据过期提示

### 低优先级
- [ ] **Chip** - 分类按钮
- [ ] **Skeleton** - 加载骨架屏

---

## 🚀 快速改造步骤

### 步骤1：添加毛玻璃和圆角
```jsx
// 改造前
<div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">

// 改造后
<div className="backdrop-blur-xl bg-gradient-to-br from-neutral-900/80 to-neutral-950/80 border border-white/5 rounded-[28px] p-8 shadow-2xl shadow-black/20">
```

### 步骤2：添加光晕效果
```jsx
<div className="group relative overflow-hidden ...">
  <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl transition-all duration-700 group-hover:bg-emerald-500/20" />
  <div className="relative z-10">
    {/* 原有内容 */}
  </div>
</div>
```

### 步骤3：优化动画
```jsx
// 改造前
<div className="transition-colors hover:border-neutral-700">

// 改造后
<div className="transition-all duration-500 hover:scale-[1.02]">
```

### 步骤4：优化字体
```jsx
// 改造前
<h3 className="text-xl font-bold text-white">

// 改造后
<h3 className="text-2xl font-semibold text-white tracking-tight">
```

---

## 🎨 颜色方案

### 主色调
- **Emerald（翠绿）**: `emerald-400` to `emerald-600`
- **Amber（琥珀）**: `amber-400` to `orange-500`

### 背景色
- **卡片背景**: `from-neutral-900/80 to-neutral-950/80`
- **强调背景**: `from-emerald-500/10 to-emerald-500/20`

### 边框色
- **主边框**: `border-white/5`
- **强调边框**: `border-emerald-500/20`

### 文字色
- **标题**: `text-white`
- **正文**: `text-neutral-400`
- **强调**: `text-emerald-400`

---

## 💡 最佳实践

### DO（推荐）
✅ 使用 `backdrop-blur-xl` 创造毛玻璃效果
✅ 使用 `rounded-[28px]` 等大圆角
✅ 使用 `transition-all duration-500` 创造流畅动画
✅ 使用 `group` 和 `group-hover` 实现联动效果
✅ 使用 `shadow-2xl shadow-black/20` 创造柔和阴影
✅ 使用 `font-semibold` 而不是 `font-bold`

### DON'T（避免）
❌ 不要使用硬边框（如 `border-neutral-800`）
❌ 不要使用纯色背景（如 `bg-neutral-900`）
❌ 不要使用小圆角（如 `rounded-lg`）
❌ 不要使用 `font-bold`（太粗）
❌ 不要使用快速动画（如 `duration-200`）
❌ 不要忘记添加 `relative z-10` 到内容层

---

## 📱 响应式设计

### 移动端优化
```jsx
// 调整padding
className="p-6 md:p-8"

// 调整字体大小
className="text-xl md:text-2xl"

// 调整圆角
className="rounded-[20px] md:rounded-[28px]"
```

---

## 🔧 调试技巧

### 检查毛玻璃效果
如果毛玻璃效果不明显，确保：
1. 父元素有背景内容
2. 使用了 `backdrop-blur-xl`
3. 背景色有透明度（如 `/80`）

### 检查光晕效果
如果光晕不可见，确保：
1. 使用了 `overflow-hidden`
2. 光晕元素是 `absolute` 定位
3. 内容使用了 `relative z-10`

---

## 🎉 完成标准

一个完美的iOS风格组件应该具备：
- ✅ 毛玻璃背景
- ✅ 大圆角（28px）
- ✅ 柔和阴影
- ✅ 光晕效果
- ✅ 流畅动画（500ms）
- ✅ 渐变色
- ✅ 优化的字体

---

**老王说：按照这个指南，你可以把整个网站改造成iOS风格！记住，iOS风格的核心是：精致、流畅、有呼吸感！**
