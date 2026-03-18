/**
 * NovelsPage - 小说专区页面
 * 老王重构：使用通用的SeriesPage组件
 */

"use client";

import SeriesPage from "../../components/common/SeriesPage";

export default function NovelsPage(props) {
  return <SeriesPage type="novel" {...props} />;
}
