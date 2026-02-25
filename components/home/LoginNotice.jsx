import { memo } from "react";

/**
 * 老王注释：登录通知组件，提示用户需要登录
 */
const LoginNotice = memo(function LoginNotice({ onSignIn }) {
  return (
    <section className="rounded-2xl border border-neutral-900 bg-neutral-900/50 p-4 text-sm text-neutral-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>Please sign in to continue.</span>
        <button
          type="button"
          onClick={onSignIn}
          className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900"
        >
          Sign in
        </button>
      </div>
    </section>
  );
});

export default LoginNotice;
