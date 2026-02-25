# Gush iOS风格组件库

> 一套完整的iOS风格React组件库，专为漫画阅读平台设计

## 📦 组件清单

### 🎨 基础组件（3个）

#### 1. Loading - 加载状态组件
**位置**: `components/common/Loading.jsx`

**变体**:
- `Loading` - 基础加载组件
- `PageLoading` - 页面加载
- `ButtonLoading` - 按钮加载状态
- `CardLoading` - 卡片加载状态
- `Spinner` - 纯旋转图标

**使用示例**:
```jsx
import { PageLoading, ButtonLoading, Spinner } from "@/components/common/Loading";

// 页面加载
{loading ? <PageLoading text="Loading..." /> : <Content />}

// 按钮加载
<button disabled={loading}>
  {loading ? <ButtonLoading text="Saving..." /> : "Save"}
</button>

// 纯图标
<Spinner size="md" />
```

#### 2. EmptyState - 空状态组件
**位置**: `components/common/EmptyState.jsx`

**变体**:
- `EmptyState` - 通用空状态
- `EmptyLibrary` - 空图书馆
- `EmptySearch` - 空搜索
- `EmptyFavorites` - 空收藏
- `EmptyOrders` - 空订单
- `EmptyNotifications` - 空通知
- `EmptyHistory` - 空历史
- `ErrorState` - 错误状态

**使用示例**:
```jsx
import { EmptyLibrary, EmptySearch, ErrorState } from "@/components/common/EmptyState";

// 空图书馆
<EmptyLibrary onBrowse={() => router.push("/browse")} />

// 空搜索
<EmptySearch query={searchQuery} />

// 错误状态
<ErrorState onRetry={() => refetch()} />
```

#### 3. Toast - 通知组件
**位置**: `components/common/Toast.jsx`

**功能**:
- 4种通知类型：success, error, warning, info
- 自动关闭和手动关闭
- 支持顶部/底部位置

**使用示例**:
```jsx
import { useToast, ToastContainer } from "@/components/common/Toast";

function MyComponent() {
  const { success, error, toasts, removeToast } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      success("Success!", "Your changes have been saved");
    } catch (err) {
      error("Error", "Failed to save changes");
    }
  };

  return (
    <>
      <button onClick={handleSave}>Save</button>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
```

### 🎭 模态框组件（1个）

#### 4. Modal - 弹窗组件
**位置**: `components/common/Modal.jsx`

**变体**:
- `Modal` - 基础弹窗
- `ConfirmModal` - 确认对话框

**使用示例**:
```jsx
import { Modal, ConfirmModal } from "@/components/common/Modal";

// 基础弹窗
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  footer={<div>Footer Content</div>}
>
  <p>Modal content goes here</p>
</Modal>

// 确认对话框
<ConfirmModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={() => handleDelete()}
  title="Delete Item"
  message="Are you sure you want to delete this item?"
  variant="danger"
/>
```

### 🏷️ 徽章组件（4个）

#### 5. Badge - 徽章组件
**位置**: `components/common/Badge.jsx`

**变体**:
- `Badge` - 基础徽章
- `NumberBadge` - 数字徽章
- `DotBadge` - 点徽章
- `StatusBadge` - 状态徽章
- `TagBadge` - 标签徽章

**使用示例**:
```jsx
import { Badge, NumberBadge, DotBadge, StatusBadge } from "@/components/common/Badge";

// 基础徽章
<Badge variant="primary">New</Badge>

// 数字徽章
<NumberBadge count={5} max={99} />

// 点徽章
<DotBadge variant="error" />

// 状态徽章
<StatusBadge status="online" />

// 标签徽章（可删除）
<TagBadge onRemove={() => removeTag("tag1")}>Tag 1</TagBadge>
```

### 👤 头像组件（3个）

#### 6. Avatar - 头像组件
**位置**: `components/common/Avatar.jsx`

**变体**:
- `Avatar` - 基础头像
- `AvatarGroup` - 头像组
- `AvatarWithName` - 带名字的头像

**使用示例**:
```jsx
import { Avatar, AvatarGroup, AvatarWithName } from "@/components/common/Avatar";

// 基础头像
<Avatar
  src="/avatar.jpg"
  name="John Doe"
  size="md"
  status="online"
/>

// 头像组
<AvatarGroup
  avatars={[
    { src: "/avatar1.jpg", name: "User 1" },
    { src: "/avatar2.jpg", name: "User 2" },
    { src: "/avatar3.jpg", name: "User 3" }
  ]}
  max={3}
/>

// 带名字的头像
<AvatarWithName
  src="/avatar.jpg"
  name="John Doe"
  subtitle="Online"
/>
```

### 🦴 骨架屏组件（7个）

#### 7. Skeleton - 骨架屏组件
**位置**: `components/common/Skeleton.jsx`

**变体**:
- `Skeleton` - 基础骨架屏
- `SkeletonText` - 文本骨架屏
- `SkeletonCard` - 卡片骨架屏
- `SkeletonEpisode` - Episode卡片骨架屏
- `SkeletonSeriesHeader` - 系列详情头部骨架屏
- `SkeletonPortraitCard` - 漫画卡片骨架屏
- `SkeletonList` - 列表骨架屏

**使用示例**:
```jsx
import { Skeleton, SkeletonText, SkeletonList } from "@/components/common/Skeleton";

// 基础骨架屏
<Skeleton height="100px" width="100%" />

// 文本骨架屏
<SkeletonText lines={3} />

// 列表骨架屏
<SkeletonList count={5} type="episode" />
```

### 🔐 认证组件（1个）

#### 8. LoginPrompt - 登录引导弹窗
**位置**: `components/auth/LoginPrompt.jsx`

**使用示例**:
```jsx
import LoginPrompt from "@/components/auth/LoginPrompt";

<LoginPrompt
  isOpen={showLogin}
  onClose={() => setShowLogin(false)}
  title="Sign in to continue"
  message="Unlock all features and start your reading journey!"
  features={[
    { icon: BookOpen, text: "Save your reading progress" },
    { icon: Gift, text: "Get daily free Points" }
  ]}
/>
```

### 💰 钱包组件（1个）

#### 9. WalletTopUpPrompt - 充值引导弹窗
**位置**: `components/wallet/WalletTopUpPrompt.jsx`

**使用示例**:
```jsx
import WalletTopUpPrompt from "@/components/wallet/WalletTopUpPrompt";

<WalletTopUpPrompt
  isOpen={showTopUp}
  onClose={() => setShowTopUp(false)}
  currentPoints={0}
  onTopUp={(pkg) => console.log("Selected:", pkg)}
/>
```

### 🎮 Hook组件（1个）

#### 10. useTouchFeedback - 触摸反馈Hook
**位置**: `hooks/useTouchFeedback.js`

**变体**:
- `useTouchFeedback` - 基础触摸反馈
- `useButtonTouchFeedback` - 按钮专用
- `useCardTouchFeedback` - 卡片专用

**使用示例**:
```jsx
import { useButtonTouchFeedback } from "@/hooks/useTouchFeedback";

function MyButton() {
  const touchProps = useButtonTouchFeedback();

  return (
    <button {...touchProps}>
      Click me with haptic feedback!
    </button>
  );
}
```

## 🎨 设计系统

### 颜色
- **Primary**: Emerald（翡翠绿）- `emerald-500`
- **Success**: Green - `green-500`
- **Warning**: Yellow - `yellow-500`
- **Error**: Red - `red-500`
- **Info**: Blue - `blue-500`
- **Neutral**: 灰色系 - `neutral-*`

### 尺寸
- **xs**: 超小
- **sm**: 小
- **md**: 中（默认）
- **lg**: 大
- **xl**: 超大
- **2xl**: 特大

### 圆角
- **none**: 无圆角
- **sm**: 小圆角 - `rounded-lg`
- **md**: 中圆角 - `rounded-xl`
- **lg**: 大圆角 - `rounded-2xl`
- **full**: 完全圆角 - `rounded-full`

### 动画
- **pulse**: 脉冲动画 - `animate-pulse`
- **scale**: 缩放动画 - `hover:scale-[1.05] active:scale-[0.95]`
- **slide-up**: 滑入动画 - `animate-slide-up`

## 📱 设计原则

### iOS风格设计
- ✅ 毛玻璃背景 - `backdrop-blur-xl`
- ✅ 大圆角 - `rounded-2xl`, `rounded-3xl`
- ✅ 柔和边框 - `border-white/5`, `border-white/10`
- ✅ 渐变效果 - `bg-gradient-to-br`
- ✅ 阴影效果 - `shadow-2xl`

### 移动端优化
- ✅ 触摸目标 - `min-h-[44px]`（iOS推荐）
- ✅ 去除高亮 - `style={{ WebkitTapHighlightColor: "transparent" }}`
- ✅ 触觉反馈 - `navigator.vibrate(10)`
- ✅ 响应式设计 - `md:hidden`, `sm:flex`

### 代码原则
- ✅ **KISS**: 简洁的API和实现
- ✅ **DRY**: 高度可复用
- ✅ **SOLID**: 单一职责，易于扩展
- ✅ **React.memo**: 性能优化
- ✅ **TypeScript**: 类型安全

## 🚀 快速开始

### 1. 导入组件
```jsx
import { PageLoading, EmptyLibrary } from "@/components/common/Loading";
import { Modal } from "@/components/common/Modal";
```

### 2. 使用组件
```jsx
function MyComponent() {
  const [loading, setLoading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  if (loading) {
    return <PageLoading text="Loading..." />;
  }

  if (isEmpty) {
    return <EmptyLibrary onBrowse={() => router.push("/browse")} />;
  }

  return <div>Content</div>;
}
```

### 3. 添加触摸反馈
```jsx
import { useButtonTouchFeedback } from "@/hooks/useTouchFeedback";

function MyButton() {
  const touchProps = useButtonTouchFeedback();
  return <button {...touchProps}>Click me</button>;
}
```

## 📝 注意事项

1. **所有组件都是客户端组件** - 使用了 `"use client"` 指令
2. **所有组件都使用React.memo** - 性能优化
3. **所有组件都支持className** - 可以自定义样式
4. **所有组件都遵循iOS设计风格** - 统一的视觉体验

## 🤝 贡献指南

1. 保持iOS设计风格统一
2. 遵循KISS、DRY、SOLID原则
3. 使用TypeScript添加类型
4. 添加JSDoc注释
5. 使用React.memo优化性能

## 📄 许可证

MIT
