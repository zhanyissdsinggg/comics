/**
 * SeriesPage - 闂侇偅姘ㄩ弫銈夋儍閸曨參鍏囬柛鎺擃殜閵嗗妫冮姀銏㈢煁濞? * 闁奸鑳剁敮鍥煂瀹ュ棛鈧垶鏁嶅顒佸€ゆ鐐殿浕omicsPage闁告粌顒velsPage闁挎稑鐭傛导鎺戭嚗閻欘枠Y闁告鍠庨崹?
 * 闂侇偅淇虹换鍍紋pe闁告瑥鍊归弳鐔煎礌閸濆嫬鐎绘繝鏇ㄥ亞閺侀箖宕仦鐣屾瘓閻? */

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "../layout/SiteHeader";
import PortraitCard from "../home/PortraitCard";
import SkeletonCard from "../common/SkeletonCard";
import FilterBar from "../common/FilterBar";
import EmptyState from "../common/EmptyState";
import { useAdultGateStore } from "../../store/useAdultGateStore";

// 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欏哺閵嗗妫冮姀銈呭赋缂傚喚鍣槐婵嬪冀鐟欏嫬绁ype闁告牕鎼崹搴☆煶椤愩倖鏆伴柛婊冭嫰閻剛鎷?
const PAGE_CONFIG = {
  comic: {
    title: "Comics",
    description: "Discover amazing comics and manga from around the world",
    emptyIcon: "search",
    emptyTitle: "No comics found",
    emptyDescription: "Try adjusting your filters or browse all comics.",
  },
  novel: {
    title: "Novels",
    description: "Discover amazing novels and web novels from talented authors",
    emptyIcon: "book",
    emptyTitle: "No novels found",
    emptyDescription: "Try adjusting your filters or browse all novels.",
  },
};

export default function SeriesPage({ type = "comic" }) {
  const router = useRouter();
  const { isAdultMode } = useAdultGateStore();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  // 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欐皑閻☆偊鏌呮径濠冨闁圭儤甯掔花顓㈡偐閼哥鍋?
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [status, setStatus] = useState("all");

  // 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欎亢楠炲繘宕ｉ弽顓溾偓澶愭閵忋倕甯崇紓?
  const config = PAGE_CONFIG[type];

  useEffect(() => {
    async function loadSeries() {
      try {
        setLoading(true);
        const response = await fetch(`/api/series?adult=${isAdultMode ? "1" : "0"}`);
        if (!response.ok) {
          throw new Error(`Failed to load ${type}s`);
        }
        const data = await response.json();
        // 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欑閻楁挳骞戦悾澧唒e閺夆晛娲﹂幎?
        const filtered = (data.series || []).filter((s) => s.type === type);
        setSeries(filtered);
      } catch (error) {
        console.error(`Failed to load ${type}s:`, error);
      } finally {
        setLoading(false);
      }
    }

    loadSeries();
  }, [isAdultMode, type]);

  // 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欑煯缁娀骞嶉埀顒勫嫉婢跺矂鍏囬柛鎺撱仦閼垫垿骞撻幇顒€绲跨紒顐ヮ嚙閻庣兘宕氬Δ鍕┾偓?
  const genres = useMemo(() => {
    const genreSet = new Set();
    series.forEach((s) => {
      if (s.genres && Array.isArray(s.genres)) {
        s.genres.forEach((g) => genreSet.add(g));
      }
    });
    return Array.from(genreSet).sort();
  }, [series]);

  // 闁奸鑳剁敮鍥ㄥ濡搫顕ч柨娑欐皑閻☆偊鏌呮径濠冨闁圭儤甯掔花顓㈡焻閺勫繒甯嗛柨娑樼焸娴尖晠宕楀鍕憹闊洤鎳撻々锕傛儍閸曨剚娈剁紓浣稿椤︽煡宕?
  const filteredAndSortedSeries = useMemo(() => {
    // 闁奸鑳剁敮鍥ㄥ濡搫顕ч柨娑欒壘閸樻稒娼婚崶銊﹀Б闁告劕绉电敮鎾存償韫囥儳绀夐梺顒€鐏濋崢銈団偓浣冾潐閺嗭絾绋夐鍛缂備礁瀚敮鎾存償?
    let result = series;

    // 缂侇偉顕ч悗椋庣驳濞戔懇鍋?
    if (selectedGenre !== "all") {
      result = result.filter(
        (s) => s.genres && s.genres.includes(selectedGenre)
      );
    }

    // 閻庣懓鐬肩划銊╂偐閼哥鍋撴担铏规懀闂?
    if (status !== "all") {
      result = result.filter((s) => {
        if (status === "completed") return s.status === "completed";
        if (status === "ongoing") return s.status !== "completed";
        return true;
      });
    }

    // 闁奸鑳剁敮鍥ㄥ濡搫顕ч柨娑欒壘瑜把囧捶閵娾晜浠橀悷鏇氱劍濡炲倿骞嶅鍜佹Щ闁告帟鍩栭弳鐔虹磼閸曨喚绠婚悶娑樻湰鐢挻鎯?
    if (result.length === 0) {
      return result;
    }

    // 闁圭儤甯掔花顓㈡晬閸儲浠橀悷鏇氱椤︽煡宕氶懜鍨缂備礁瀚哥槐婵嬪炊閻樿精绀媠ort濞村吋鐭幈銊╁绩閻熸澘鏂ч柡浣瑰缁秹鏁?
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "latest":
          return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "trending":
          return (b.views || 0) - (a.views || 0);
        case "popular":
        default:
          return (b.followers || 0) - (a.followers || 0);
      }
    });
  }, [series, selectedGenre, sortBy, status]);

  // 闁奸鑳剁敮鍥ㄥ濡搫顕ч柨娑欑煯婵炲洭鎮介埡鐪榚Callback闂侇剙鐏濋崢銈呅掕箛鏃戝仹render闂侇喛妫勯崹鍗烆嚈閻戞ɑ鐓€闁告垼濮ら弳?
  const handleSeriesClick = useCallback((seriesId) => {
    router.push(`/series/${seriesId}`);
  }, [router]);

  // 闁奸鑳剁敮鍥ㄥ濡搫顕ч柨娑欑煯婵炲洭鎮介埡鐪榚Callback濞村吋锚鐎垫煡鏌屽鍥╂瀭閺夆晛娲﹂幎銈夊闯?
  const handleResetFilters = useCallback(() => {
    setSelectedGenre("all");
    setStatus("all");
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欏哺閵嗗妫冮姀锛勫灱濡?- 闁哄秷顫夊畵涔紋pe濞达綀娉曢弫銈嗙▔瀹ュ懏鍊遍柣銊ュ缁楀酣宕ｅΟ鍨棌 */}
        {type === "comic" ? (
          <div className="mb-8 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 border border-emerald-500/20">
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {config.title}
            </h1>
            <p className="text-neutral-300">{config.description}</p>
          </div>
        ) : (
          <div className="mb-8 rounded-3xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 p-8 border border-purple-500/20">
            <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {config.title}
            </h1>
            <p className="text-neutral-300">{config.description}</p>
          </div>
        )}

        {/* 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欐皑閻☆偊鏌呮径瀣焿 */}
        {!loading && (
          <div className="mb-8">
            <FilterBar
              genres={genres}
              selectedGenre={selectedGenre}
              onGenreChange={setSelectedGenre}
              sortBy={sortBy}
              onSortChange={setSortBy}
              status={status}
              onStatusChange={setStatus}
              totalCount={filteredAndSortedSeries.length}
            />
          </div>
        )}

        {/* 闁奸鑳剁敮鍥р枖閵娾晛娅為柨娑欐皑闁挳宕氬Δ鈧崹顏嗘偘?- 闁衡偓閸︻厽鏆廹ap-6闁挎稑鑻幖閿嬫償閺傝法纭€闁哄洦娼欓妶?*/}
        {loading ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredAndSortedSeries.length === 0 ? (
          <EmptyState
            icon={config.emptyIcon}
            title={config.emptyTitle}
            description={config.emptyDescription}
            action={{
              label: "Reset Filters",
              onClick: handleResetFilters,
            }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredAndSortedSeries.map((item) => (
              <PortraitCard
                key={item.id}
                item={item}
                tone={item.coverTone}
                onClick={() => handleSeriesClick(item.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}