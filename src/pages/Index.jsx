import { useState, useRef, useEffect, useCallback } from "react";
import homePageImg from "../assets/homepage.webp";
import centerPageImg from "../assets/ranking-center.webp";
import aceIconImg from "../assets/ace-icon.webp";

const SCREEN_W = 390;
const SCREEN_H = 844;
const HALF_RATIO = 0.8;
const ACE_TOP_CROP = 40; // 方案A半浮层态裁掉的头部状态栏区域(px)，展开成整页时恢复
const HALF_H = Math.round(SCREEN_H * HALF_RATIO);

const SCHEMES = [
  { id: "half", label: "方案A · 半浮层", short: "方案1" },
  { id: "up", label: "方案B · 上滑整页", short: "方案2" },
  { id: "left", label: "方案C · 左滑整页", short: "方案3" },
];

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"; /* 快出 + 明显缓收，上滑/左滑更利落 */

export default function Index() {
  const [scheme, setScheme] = useState("half");
  const [screen, setScreen] = useState("home"); // home | center
  const [ace, setAce] = useState("closed"); // closed | half | full(方案A整页) | open(方案B/C整页)
  const [sheetH, setSheetH] = useState(null); // 拖拽中的实时高度(px)
  const [dragging, setDragging] = useState(false);
  const [aceLoaded, setAceLoaded] = useState(false); // 王牌菜榜页是否加载完成
  const [iconBounceKey, setIconBounceKey] = useState(0); // 返回时王牌菜榜 icon 扫光动效重放计数
  const [animOn, setAnimOn] = useState(true); // 切换方案瞬间关闭过渡，避免穿帮
  const [bubbleOpen, setBubbleOpen] = useState(false); // 悬浮方案切换气泡展开态
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const dragRef = useRef(null);
  const iframeRef = useRef(null);
  const schemeRef = useRef(scheme);
  useEffect(() => { schemeRef.current = scheme; }, [scheme]);

  // 自适应不同屏幕尺寸：完整呈现手机屏幕（390×844）
  useEffect(() => {
    const fit = () => {
      const s = Math.max(0.2, Math.min(window.innerWidth / SCREEN_W, window.innerHeight / SCREEN_H));
      scaleRef.current = s;
      setScale(s);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // 王牌菜榜页直接引用 public/ace.html（资源外置按需加载），不再内联 10MB 大包
  const aceDocUrl = (import.meta.env.BASE_URL || "/") + "ace.html";

  // 演示画面固定 780×1688（2x），居中呈现

  const closeAce = useCallback(() => {
    setAce("closed");
    // 面板收起后，榜单中心页的王牌菜榜 icon 播放放大缩小动效
    window.setTimeout(() => setIconBounceKey((k) => k + 1), 420);
  }, []);

  // 每次进入王牌菜榜后，榜首（苏小柳点心）商卡橙色描边闪动 3 次
  const triggerCardHighlight = useCallback(() => {
    window.setTimeout(() => {
      try {
        iframeRef.current?.contentWindow?.postMessage("ace:highlight-card", "*");
      } catch (err) {}
    }, 700); // 等入场动画结束后再开始闪
  }, []);

  // 打开王牌菜榜：重置到白斩鸡榜 tab，并同步当前方案的返回图标形态（半浮层/上滑=叉号，左滑=返回箭头）
  const showAce = useCallback(() => {
    setAce(schemeRef.current === "half" ? "half" : "open");
    try {
      const win = iframeRef.current?.contentWindow;
      win?.postMessage("ace:reset-tab", "*");
      win?.postMessage("ace:mode:" + schemeRef.current, "*");
    } catch (err) {
      /* iframe 未就绪时由 URL 参数保证初始态 */
    }
    triggerCardHighlight();
  }, [triggerCardHighlight]);

  // 王牌菜榜页面常驻预加载，点击时直接呈现
  const openAce = showAce;

  // 方案A：从金刚区 icon 手动进入 → 整页从下往上滑出（自动出现仍为半浮层）
  const openAceFull = useCallback(() => {
    setAce("full");
    try {
      const win = iframeRef.current?.contentWindow;
      win?.postMessage("ace:reset-tab", "*");
      win?.postMessage("ace:mode:half", "*");
    } catch (err) {
      /* iframe 未就绪时由 URL 参数保证初始态 */
    }
    triggerCardHighlight();
  }, [triggerCardHighlight]);

  // 方案A：半浮层 ⇄ 全屏切换时通知 ace 页切换 Tab 形态（半浮层=文字药丸，全屏=圆图）
  useEffect(() => {
    if (scheme !== "half") return;
    try {
      iframeRef.current?.contentWindow?.postMessage("ace:sheet:" + (ace === "full" ? "full" : "half"), "*");
    } catch (err) {
      /* iframe 未就绪时忽略，恢复半浮层时会有下一次通知 */
    }
  }, [ace, scheme]);

  const switchScheme = (id) => {
    if (id === scheme) return;
    setAnimOn(false);
    setScheme(id);
    setAce("closed");
    setSheetH(null);
    setScreen("home"); // 切换方案时回到首页初始状态
    window.setTimeout(() => setAnimOn(true), 80);
  };

  // ===== 方案A 半浮层拖拽 =====
  const onHandleDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY };
    setDragging(true);
    setSheetH(HALF_H);
  };
  const onHandleMove = (e) => {
    if (!dragRef.current) return;
    const dy = (e.clientY - dragRef.current.startY) / scaleRef.current;
    const next = Math.min(SCREEN_H, Math.max(220, HALF_H - dy));
    setSheetH(next);
  };
  const onHandleUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    setSheetH((h) => {
      if (h == null) return null;
      if (h > SCREEN_H * 0.8) {
        setAce("full");
        return null;
      }
      if (h < HALF_H * 0.72) {
        setAce("closed");
        return null;
      }
      setAce("half");
      return null;
    });
  };

  // 进入榜单中心页后，王牌菜榜按当前方案自动出现（每次从首页进入触发一次；从王牌菜榜返回不重复触发）
  useEffect(() => {
    if (screen !== "center") return;
    const t = window.setTimeout(() => {
      showAce();
    }, 650);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const isAceVisible = ace !== "closed";
  const aceFull = scheme === "half" ? ace === "full" : ace === "open";

  // 常驻面板：一个容器承载三种方案的收起/展开，iframe 只加载一次
  const closedTransform = scheme === "left" ? "translateX(100%)" : "translateY(100%)";
  const panelHeight = scheme === "half" && ace === "half" ? sheetH ?? HALF_H : SCREEN_H;

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#f5f5f7] flex items-center justify-center" style={{ fontFamily: "-apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif" }}>
      <style>{`
        @keyframes ace-icon-shine {
          0% { transform: translateX(-130%) skewX(-20deg); }
          100% { transform: translateX(230%) skewX(-20deg); }
        }
        .ace-icon-shine__beam {
          background: linear-gradient(100deg, rgba(255,255,255,0) 18%, rgba(255,255,255,0.55) 40%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.55) 60%, rgba(255,255,255,0) 82%);
          transform: translateX(-130%) skewX(-20deg);
          animation: ace-icon-shine 1.6s cubic-bezier(0.45, 0, 0.25, 1) 0.05s both;
          will-change: transform;
        }
      `}</style>
      {/* 手机屏幕（自适应不同屏幕尺寸，无外壳描边与圆角） */}
      <div className="relative" style={{ width: SCREEN_W * scale, height: SCREEN_H * scale }}>
        <div
          className="relative overflow-hidden bg-white"
          style={{
            width: SCREEN_W,
            height: SCREEN_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
            {/* ===== 底层页面（首页 / 榜单中心页）===== */}
            <div
              className="absolute inset-0"
              style={{
                transition: animOn ? `transform 0.45s ${EASE}, filter 0.45s ${EASE}` : "none",
                transform:
                  aceFull && scheme === "up"
                    ? "scale(0.96)"
                    : aceFull && scheme === "left"
                      ? "translateX(-14%)"
                      : "none",
                filter: isAceVisible && scheme !== "half" ? "brightness(0.92)" : "none",
              }}
            >
              {/* 首页 */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{ opacity: screen === "home" ? 1 : 0, pointerEvents: screen === "home" ? "auto" : "none" }}
              >
                <img src={homePageImg} alt="首页" className="absolute inset-0 w-full h-full" draggable={false} />
                {/* 点评榜单入口热区 */}
                <button
                  aria-label="点评榜单入口"
                  onClick={() => setScreen("center")}
                  className="absolute rounded-xl active:bg-black/5"
                  style={{ left: "1.4%", top: "35.6%", width: "48.2%", height: "10.4%" }}
                />
              </div>

              {/* 榜单中心页 */}
              <div
                className="absolute inset-0 transition-opacity duration-300"
                style={{ opacity: screen === "center" ? 1 : 0, pointerEvents: screen === "center" ? "auto" : "none" }}
              >
                <img src={centerPageImg} alt="榜单中心页" className="absolute inset-0 w-full h-full" draggable={false} />
                {/* 返回首页热区 */}
                <button
                  aria-label="返回首页"
                  onClick={() => setScreen("home")}
                  className="absolute active:bg-black/5 rounded-full"
                  style={{ left: "2.5%", top: "7%", width: "7.5%", height: "4.2%" }}
                />
                {/* 王牌菜榜入口：新视觉 icon（返回时播放扫光动效） */}
                <div
                  key={iconBounceKey}
                  className="ace-icon-shine absolute pointer-events-none overflow-hidden"
                  style={{ left: "9.6%", top: "30.6%", width: "10.3%", height: "4.74%" }}
                >
                  <img src={aceIconImg} alt="王牌菜榜" className="w-full h-full" draggable={false} />
                  <div className="ace-icon-shine__beam absolute inset-0" />
                </div>
                {/* 王牌菜榜入口热区 */}
                <button
                  aria-label="进入王牌菜榜"
                  onClick={scheme === "half" ? openAceFull : openAce}
                  className="absolute rounded-xl active:bg-black/5"
                  style={{ left: "5.5%", top: "30.4%", width: "17%", height: "8.6%" }}
                />
              </div>
            </div>

            {/* ===== 方案A：半浮层蒙层 ===== */}
            {scheme === "half" && (
              <div
                className="absolute inset-0 z-20 transition-opacity duration-300"
                style={{ background: "rgba(17, 17, 17, 0.8)", opacity: ace !== "closed" ? 1 : 0, pointerEvents: ace === "half" ? "auto" : "none" }}
                onClick={() => {
                  if (ace === "half") closeAce();
                }}
              />
            )}

            {/* ===== 王牌菜榜常驻面板（iframe 预加载，仅加载一次）===== */}
            <div
              className="absolute left-0 right-0 bottom-0 z-30 overflow-hidden"
              style={{
                height: panelHeight,
                borderTopLeftRadius: scheme === "half" && ace === "half" && !dragging ? 16 : 0,
                borderTopRightRadius: scheme === "half" && ace === "half" && !dragging ? 16 : 0,
                background: "#1A1008",
                transform: ace === "closed" ? closedTransform : "translate(0, 0)",
                transition: dragging || !animOn ? "none" : `transform 0.38s ${EASE}, height 0.38s ${EASE}, border-radius 0.3s`,
                boxShadow: scheme === "left" ? "-8px 0 30px rgba(0,0,0,0.18)" : "0 -8px 30px rgba(0,0,0,0.18)",
                pointerEvents: ace === "closed" ? "none" : "auto",
              }}
            >
              {aceDocUrl && (
              <iframe
                src={aceDocUrl}
                title="王牌菜榜"
                ref={iframeRef}
                onLoad={() => {
                  setAceLoaded(true);
                  try {
                    iframeRef.current?.contentWindow?.postMessage("ace:mode:" + schemeRef.current, "*");
                  } catch (err) {}
                }}
                className="absolute left-0 border-0"
                style={{
                  width: SCREEN_W,
                  height: SCREEN_H,
                  background: "#1A1008",
                  top: scheme === "half" && ace === "half" ? -ACE_TOP_CROP : 0,
                  transition: dragging || !animOn ? "none" : `top 0.4s ${EASE}`,
                }}
              />
              )}
              {/* 整页态：状态栏浮在王牌菜榜顶部安全区之上（页面自身预留了 54px 状态栏空间） */}
              {aceFull && (
                <div
                  className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between pointer-events-none"
                  style={{ height: 54, paddingLeft: 30, paddingRight: 24 }}
                >
                  <span style={{ color: "#fff", fontSize: 16, fontWeight: 600, letterSpacing: 0.5, fontVariantNumeric: "tabular-nums" }}>9:41</span>
                  <div className="flex items-center" style={{ gap: 7 }}>
                    <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                      <rect x="0" y="8" width="3" height="4" rx="0.8" fill="#fff"/>
                      <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" fill="#fff"/>
                      <rect x="10" y="3" width="3" height="9" rx="0.8" fill="#fff"/>
                      <rect x="15" y="0.5" width="3" height="11.5" rx="0.8" fill="#fff" opacity="0.4"/>
                    </svg>
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                      <path d="M8 11 L5.6 8.4 A3.6 3.6 0 0 1 10.4 8.4 Z" fill="#fff"/>
                      <path d="M3.7 6.3 A6.2 6.2 0 0 1 12.3 6.3" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
                      <path d="M1.4 3.8 A9.4 9.4 0 0 1 14.6 3.8" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
                    </svg>
                    <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
                      <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="#fff" opacity="0.5"/>
                      <rect x="2" y="2" width="15.5" height="8" rx="1.8" fill="#fff"/>
                      <path d="M23 4 v4 a2.2 2.2 0 0 0 0 -4" fill="#fff" opacity="0.5"/>
                    </svg>
                  </div>
                </div>
              )}
              {/* 加载兜底：极少数情况下内容未就绪时给出提示，避免白屏观感 */}
              {!aceLoaded && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white">
                  <div className="w-6 h-6 rounded-full border-2 border-[#ff6633] border-t-transparent animate-spin" />
                  <div className="mt-3 text-[12px] text-[#999]">王牌菜榜加载中…</div>
                </div>
              )}
              {/* 半浮层拖拽把手 + 提示 */}
              {scheme === "half" && ace === "half" && (
                <div
                  className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
                  style={{ height: 14 }}
                  onPointerDown={onHandleDown}
                  onPointerMove={onHandleMove}
                  onPointerUp={onHandleUp}
                  onPointerCancel={onHandleUp}
                >
                  <div className="w-9 h-1 rounded-full bg-white/60" />
                </div>
              )}
            </div>

            {/* ===== 王牌菜榜页内返回热区（覆盖原生返回按钮位置）===== */}
            {isAceVisible && (
              <button
                aria-label="返回榜单中心页"
                onClick={closeAce}
                className="absolute z-40 active:bg-black/10 rounded-full"
                style={{
                  left: "2%",
                  width: "9.5%",
                  height: "4.8%",
                  top:
                    scheme === "half" && ace === "half"
                      ? `calc(${100 - ((sheetH ?? HALF_H) / SCREEN_H) * 100}% + 22px)`
                      : "6.2%",
                }}
              />
            )}

          </div>

        {/* ===== 悬浮方案切换（屏幕左缘，外露一小部分）===== */}
            <div
              className="absolute z-50"
              style={{ left: -7 * scale, top: "calc(44% + 100px)", transform: `scale(${scale * 1.2})`, transformOrigin: "top left" }}
            >
              {bubbleOpen && (
                <div
                  className="absolute flex flex-col overflow-hidden"
                  style={{ left: 0, top: "calc(100% + 6px)", borderRadius: 12, background: "rgba(17, 17, 17, 0.8)", backdropFilter: "blur(4px)" }}
                >
                  {SCHEMES.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setBubbleOpen(false);
                        switchScheme(s.id);
                      }}
                      className="whitespace-nowrap text-left px-3 py-1.5 text-[11px] active:opacity-70"
                      style={{
                        color: scheme === s.id ? "#ff6633" : "rgba(255,255,255,0.85)",
                        fontWeight: scheme === s.id ? 600 : 400,
                        borderBottom: i < SCHEMES.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                      }}
                    >
                      {s.short}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setBubbleOpen((v) => !v)}
                className="block text-center active:opacity-80"
                style={{
                  borderRadius: "0 8px 8px 0",
                  padding: "7px 6px 7px 4px",
                  fontSize: 10,
                  lineHeight: "13px",
                  color: "rgba(255,255,255,0.9)",
                  background: "rgba(17, 17, 17, 0.8)",
                  backdropFilter: "blur(4px)",
                }}
              >
                {SCHEMES.find((s) => s.id === scheme).short}
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  style={{ display: "block", margin: "2px auto 0" }}
                >
                  <path d="M1 1l4 4 4-4" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
        </div>
      </div>
  );
}
