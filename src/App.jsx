import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot,
  collection
} from 'firebase/firestore';
import { 
  Settings as SettingsIcon, 
  MapPin as MapPinIcon, 
  Utensils as UtensilsIcon, 
  Clock as ClockIcon, 
  Plus as PlusIcon, 
  Trash2 as Trash2Icon, 
  Save as SaveIcon, 
  Upload as UploadIcon, 
  X as XIcon, 
  Sparkles as SparklesIcon, 
  Loader2 as Loader2Icon, 
  ChevronRight as ChevronRightIcon, 
  ChevronLeft as ChevronLeftIcon, 
  Star as StarIcon, 
  Heart as HeartIcon, 
  MessageSquare as MessageSquareIcon, 
  Quote as QuoteIcon, 
  LayoutGrid as LayoutGridIcon, 
  Menu as MenuIcon, 
  Info as InfoIcon, 
  Bell as BellIcon, 
  Navigation as NavigationIcon, 
  PhoneCall as PhoneCallIcon, 
  Link as LinkIcon,
  Lock as LockIcon
} from 'lucide-react';

/**
 * [환경 설정]
 * 관리자 비밀번호: 8자리
 */
const ADMIN_PASSCODE = "12345678"; 

// Firebase 초기화 - 전역 변수 사용
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Rule 1: appId 경로 정규화 (슬래시를 언더바로 변경하여 세그먼트 오류 방지)
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : "premium-store-v3"; 
const appId = rawAppId.replace(/\//g, '_');

const App = () => {
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("전체");
  
  const menuScrollRef = useRef(null);
  const adminNoticeRef = useRef(null);
  const adminMenuRef = useRef(null);
  const adminReviewRef = useRef(null);
  const adminBrandingRef = useRef(null);

  const [settings, setSettings] = useState({
    name: "청궁 (靑宮)",
    notice: "저희 매장을 찾아주셔서 감사합니다. 정성 가득한 요리로 모시겠습니다.",
    introImg: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=1200",
    introText: "30년 전통의 수타면 전문점. 명장의 손길로 빚어낸 정통 중화요리의 깊은 맛을 선보입니다.",
    naverReviewUrl: "", 
    naverMapUrl: "", 
    address: "위치를 입력해주세요",
    phone: "전화번호를 입력해주세요",
    categories: ["전체", "면류", "요리류", "세트메뉴"],
    externalLinks: [
      { id: 1, name: "인스타그램", url: "" },
      { id: 2, name: "네이버", url: "" },
      { id: 3, name: "카카오톡", url: "" }
    ],
    openingHours: {
      sun: { open: "11:00", close: "21:00", active: true },
      mon: { open: "11:00", close: "21:30", active: true },
      tue: { open: "11:00", close: "21:30", active: false }, 
      wed: { open: "11:00", close: "21:30", active: true },
      thu: { open: "11:00", close: "21:30", active: true },
      fri: { open: "11:00", close: "21:30", active: true },
      sat: { open: "11:00", close: "22:00", active: true },
    },
    menuItems: [],
    reviews: []
  });

  const [myLikes, setMyLikes] = useState([]);

  // --- (1) Rule 3: 인증 초기화 (Auth First) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("인증 실패:", err);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // --- (2) Rule 3 & Rule 1: 인증된 사용자만 데이터 동기화 ---
  useEffect(() => {
    if (!user) return;
    
    // Rule 1 준수: /artifacts/{appId}/public/data/{collectionName}/{documentId}
    // 세그먼트: artifacts(1), appId(2), public(3), data(4), store_settings(5), main(6) -> 6개 (짝수)
    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'store_settings', 'main');
    
    const unsubscribe = onSnapshot(settingsDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSettings(prev => ({
          ...prev,
          ...data,
          // 배열 데이터 유효성 검사
          menuItems: Array.isArray(data.menuItems) ? data.menuItems : [],
          reviews: Array.isArray(data.reviews) ? data.reviews : [],
          externalLinks: Array.isArray(data.externalLinks) ? data.externalLinks : prev.externalLinks,
          // 텍스트 데이터 객체 렌더링 오류 방지 (String 강제 변환)
          name: typeof data.name === 'string' ? data.name : prev.name,
          notice: typeof data.notice === 'string' ? data.notice : prev.notice,
          introText: typeof data.introText === 'string' ? data.introText : prev.introText,
          address: typeof data.address === 'string' ? data.address : prev.address
        }));
      }
    }, (error) => {
      console.error("Firestore 동기화 권한 오류:", error);
    });

    const savedLikes = localStorage.getItem(`likes_${appId}`);
    if (savedLikes) {
      try { setMyLikes(JSON.parse(savedLikes)); } catch(e) { setMyLikes([]); }
    }
    
    return () => unsubscribe();
  }, [user]);

  const saveSettings = async (newData) => {
    if (!user) return;
    try {
      // 데이터 전송 전 객체 유효성 확인
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'store_settings', 'main'), newData);
    } catch (e) {
      console.error("데이터 저장 실패:", e);
    }
  };

  const handleVerifyPasscode = (e) => {
    e.preventDefault();
    if (passcodeInput === ADMIN_PASSCODE) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasscodeInput("");
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
    } else { 
      alert("비밀 코드가 일치하지 않습니다."); 
      setPasscodeInput("");
    }
  };

  const toggleLike = async (menuId) => {
    if (myLikes.includes(menuId)) return;
    const newItems = settings.menuItems.map(item => 
      item.id === menuId ? { ...item, likes: (Number(item.likes) || 0) + 1 } : item
    );
    const newMyLikes = [...myLikes, menuId];
    setMyLikes(newMyLikes);
    localStorage.setItem(`likes_${appId}`, JSON.stringify(newMyLikes));
    const newSettings = { ...settings, menuItems: newItems };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const filteredMenu = (settings.menuItems || []).filter(item => 
    activeCategory === "전체" || item.category === activeCategory
  );

  const scrollMenu = (direction) => {
    if (menuScrollRef.current) {
      const scrollAmount = window.innerWidth < 768 ? 260 : 400;
      const amount = direction === 'left' ? -scrollAmount : scrollAmount;
      menuScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const scrollToAdminSection = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#fcfaf8] gap-6">
      <Loader2Icon size={48} className="animate-spin text-orange-500" />
      <p className="text-gray-400 font-black tracking-widest uppercase">데이터 연결 중...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfaf8] text-[#1a1a1a] flex flex-col items-center overflow-x-hidden">
      {/* 다크모드 방지 및 기본 스타일 최적화 */}
      <style>{`
        :root { color-scheme: light !important; }
        html, body { background-color: #fcfaf8 !important; color: #1a1a1a !important; margin: 0; padding: 0; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .glass { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.4); }
        .break-keep { word-break: keep-all; }
        .animate-marquee { display: flex; width: max-content; animation: marquee 40s linear infinite; }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>
      
      {/* [사용자 인터페이스] */}
      <div className={`w-full flex flex-col items-center ${isAdminMode ? 'hidden' : 'block animate-in fade-in duration-1000'}`}>
        
        {/* 상단 배너 - 모바일 반응형 크기 조절 */}
        <header className="relative h-[45vh] md:h-[65vh] w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src={settings.introImg} className="w-full h-full object-cover" alt="가게 배경" />
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"></div>
          </div>
          <div className="relative z-10 text-center px-6 max-w-5xl flex flex-col items-center">
            <h1 className="text-4xl sm:text-6xl md:text-[8rem] font-black text-white mb-6 md:mb-10 tracking-tighter drop-shadow-2xl italic leading-tight">
                {String(settings.name || "청궁")}
            </h1>
            <div className="w-10 md:w-16 h-1 bg-orange-500 rounded-full mb-6 md:mb-10 shadow-lg"></div>
            <p className="text-sm sm:text-lg md:text-2xl text-white font-bold max-w-2xl mx-auto leading-relaxed break-keep px-4">
              {String(settings.introText || "")}
            </p>
          </div>
        </header>

        <main className="w-full max-w-screen-xl mx-auto px-4 md:px-12 py-12 md:py-32 space-y-16 md:space-y-48 flex flex-col items-center">
          
          {/* 공지사항 */}
          {settings.notice && (
            <section className="w-full animate-in slide-in-from-bottom-8 duration-700 px-2 sm:px-0">
              <div className="glass p-6 md:p-16 rounded-[2rem] md:rounded-[4rem] border-2 border-orange-100 flex flex-col md:flex-row items-center gap-6 md:gap-12 shadow-2xl shadow-orange-100/20">
                <div className="w-12 h-12 md:w-24 md:h-24 bg-orange-600 rounded-[1rem] md:rounded-[2.5rem] flex items-center justify-center text-white shadow-xl shrink-0">
                  <BellIcon size={28} className="animate-pulse" />
                </div>
                <div className="text-center md:text-left flex-1 font-black">
                  <h3 className="text-base md:text-2xl font-black mb-2 md:mb-4 text-orange-600 italic tracking-tighter uppercase font-black">Notice</h3>
                  <p className="text-base md:text-3xl font-black leading-snug break-keep text-gray-900 font-black">
                    {String(settings.notice)}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* 메뉴 섹션 */}
          <section id="menu-list" className="w-full space-y-10 md:space-y-20 flex flex-col items-center px-2">
            <div className="flex flex-col lg:flex-row justify-between items-center lg:items-end w-full gap-6 md:gap-10 text-center lg:text-left font-black">
              <div className="flex flex-col items-center lg:items-start">
                <h2 className="text-3xl md:text-7xl font-black mb-4 md:mb-6 tracking-tight italic text-gray-900 uppercase">대표 요리</h2>
                <div className="h-1 md:h-2 w-16 md:w-32 bg-orange-600 rounded-full mb-4 md:mb-6"></div>
                <p className="text-gray-400 text-[10px] md:text-xl font-black tracking-widest uppercase">Traditional Selections</p>
              </div>
              <div className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar pb-2 max-w-full justify-start md:justify-center px-2">
                {settings.categories.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`px-5 md:px-12 py-2.5 md:py-5 rounded-full text-[10px] md:text-sm font-black transition-all border-2 whitespace-nowrap ${activeCategory === cat ? 'bg-black border-black text-white shadow-2xl scale-105' : 'bg-white border-gray-100 text-gray-400 hover:border-black font-black'}`}
                  >
                    {String(cat)}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full group">
              <button onClick={() => scrollMenu('left')} className="absolute left-[-15px] md:left-[-30px] top-1/2 -translate-y-1/2 z-30 p-3 md:p-6 bg-white/95 rounded-full shadow-2xl hover:bg-black hover:text-white transition-all border border-gray-100 hidden lg:flex items-center justify-center active:scale-75"><ChevronLeftIcon size={32} /></button>
              
              <div ref={menuScrollRef} className="flex overflow-x-auto gap-4 md:gap-12 pb-8 md:pb-20 px-4 -mx-4 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing">
                {filteredMenu.map(item => (
                  <div key={item.id} onDoubleClick={() => toggleLike(item.id)} className="flex-none w-[240px] md:w-[450px] snap-center group/card flex flex-col font-black">
                    <div className="relative aspect-[4/5] rounded-[2rem] md:rounded-[5rem] overflow-hidden mb-6 md:mb-12 shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-1000 group-hover/card:translate-y-[-10px] bg-white">
                      <img src={item.img || "https://via.placeholder.com/800"} className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-110" alt={String(item.name)} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                      <button onClick={() => toggleLike(item.id)} className={`absolute top-4 md:top-10 right-4 md:right-10 p-3 md:p-6 rounded-full glass transition-all ${myLikes.includes(item.id) ? 'text-red-500 scale-125' : 'text-gray-900 md:opacity-0 group-hover/card:opacity-100'}`}><HeartIcon size={24} fill={myLikes.includes(item.id) ? "currentColor" : "none"}/></button>
                      <div className="absolute bottom-6 md:bottom-12 left-6 md:left-12 right-6 md:right-12 text-white">
                        <span className="text-[8px] md:text-xs font-black uppercase tracking-[0.4em] text-orange-400 mb-2 md:mb-5 block underline underline-offset-4 decoration-2">Premium</span>
                        <h3 className="text-xl md:text-4xl font-black mb-2 md:mb-5 tracking-tight leading-tight uppercase break-keep font-black">{String(item.name)}</h3>
                        <p className="text-[10px] md:text-base font-bold leading-relaxed line-clamp-2 italic opacity-90">{String(item.desc)}</p>
                      </div>
                    </div>
                    <div className="px-4 md:px-10 flex justify-between items-center">
                      <span className="text-2xl md:text-5xl font-black italic tracking-tightest text-gray-900 font-black"><span className="text-xs md:text-xl not-italic mr-1 md:mr-3 text-gray-300 font-black">₩</span>{String(item.price)}</span>
                      <div className="flex items-center gap-2 md:gap-3 bg-white border border-gray-100 px-3 md:px-6 py-1 md:py-2.5 rounded-full shadow-lg"><HeartIcon size={14} className="text-red-400 md:w-5 md:h-5" fill="currentColor"/><span className="text-sm md:text-lg text-gray-400 font-black">{item.likes || 0}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => scrollMenu('right')} className="absolute right-[-20px] md:right-[-30px] top-1/2 -translate-y-1/2 z-30 p-3 md:p-6 bg-white/95 rounded-full shadow-2xl hover:bg-black hover:text-white transition-all border border-gray-100 hidden lg:flex items-center justify-center active:scale-75"><ChevronRightIcon size={32} /></button>
            </div>
          </section>

          {/* 리뷰 섹션 */}
          <section className="w-full relative overflow-hidden py-10 md:py-24 flex flex-col items-center">
            <div className="text-center mb-12 md:mb-32 flex flex-col items-center gap-6 md:gap-10 px-4 font-black">
              <div className="flex flex-col items-center">
                <h2 className="text-3xl md:text-8xl font-black mb-3 md:mb-8 tracking-tighter italic text-gray-900 uppercase">손님들의 이야기</h2>
                <div className="h-1 md:h-2 w-20 md:w-32 bg-orange-600 rounded-full"></div>
              </div>
              
              {settings.naverReviewUrl && (
                <a href={settings.naverReviewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 md:gap-5 px-6 md:px-14 py-3 md:py-6 bg-[#2DB400] text-white rounded-full text-[10px] md:text-xl font-black shadow-xl hover:brightness-110 active:scale-95 group shadow-green-100"><MessageSquareIcon size={16} /> 네이버 리뷰 전체보기 <ChevronRightIcon size={16} /></a>
              )}
            </div>
            
            <div className="flex animate-marquee gap-6 md:gap-20">
              {(settings.reviews.length > 0 ? [...settings.reviews, ...settings.reviews] : []).map((rev, i) => (
                <div key={i} className="w-[260px] md:w-[600px] glass p-8 md:p-24 rounded-[2.5rem] md:rounded-[6rem] shadow-sm shrink-0 flex flex-col justify-between border-gray-100/50 font-black">
                  <div className="relative">
                    <QuoteIcon className="absolute -top-6 -right-6 md:-top-12 md:-right-12 text-orange-100 opacity-20 w-12 h-12 md:w-48 md:h-48" />
                    <div className="flex items-center gap-4 md:gap-10 mb-6 md:16 relative z-10 font-black">
                      <div className="w-10 h-10 md:w-24 md:h-24 bg-white rounded-[1rem] md:rounded-[2.5rem] flex items-center justify-center font-black text-orange-600 text-lg md:text-4xl border border-gray-50 shadow-inner uppercase shrink-0">{String(rev.author?.[0] || 'G')}</div>
                      <div>
                        <div className="font-black text-sm md:text-3xl text-gray-900 mb-1 md:mb-3 font-black">{String(rev.author || "")}</div>
                        <div className="flex text-orange-400 text-[10px] md:text-sm gap-1">
                           {[...Array(5)].map((_, s) => <StarIcon key={s} size={12} className="md:w-6 md:h-6" fill={s < (rev.rating || 5) ? "currentColor" : "none"} />)}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-800 italic break-keep leading-relaxed text-sm md:text-3xl font-black font-serif">"{String(rev.text || "")}"</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 길안내 섹션 */}
          <section id="map-area" className="w-full max-w-screen-xl space-y-12 md:space-y-20 flex flex-col items-center text-center px-4 font-black">
            <div className="flex flex-col items-center gap-8 md:gap-12 w-full font-black">
              <h2 className="text-3xl md:text-8xl font-black tracking-tighter italic text-gray-900 uppercase">오시는 길</h2>
              <div className="h-1 md:h-2 w-20 md:w-32 bg-orange-600 rounded-full"></div>
              
              <div className="space-y-6 md:space-y-10 font-black">
                <p className="text-gray-900 text-xl md:text-6xl font-black underline decoration-orange-300 underline-offset-[8px] md:underline-offset-[15px] decoration-[3px] md:decoration-[10px] break-all tracking-tighter">{String(settings.address || "")}</p>
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-8 pt-6 md:pt-12">
                   <a href={`tel:${settings.phone}`} className="flex items-center gap-3 md:gap-5 px-8 md:px-12 py-3 md:py-6 bg-white border-2 border-gray-100 rounded-full text-base md:text-2xl font-black hover:bg-gray-50 transition-all shadow-xl w-full md:w-auto justify-center font-black">
                        <PhoneCallIcon size={20} className="text-orange-500" /> {String(settings.phone || "")}
                   </a>
                   {settings.naverMapUrl && (
                     <a href={settings.naverMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 md:gap-5 px-8 md:px-16 py-4 md:py-7 bg-orange-600 text-white rounded-full text-base md:text-2xl font-black hover:bg-black shadow-2xl transition-all active:scale-95 group shadow-orange-200 w-full md:w-auto justify-center">
                        <NavigationIcon size={20} fill="currentColor" /> 네이버 지도로 길찾기
                     </a>
                   )}
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="w-full bg-gray-950 py-24 md:py-48 text-center px-6 mt-32 font-black">
          <h2 className="text-3xl md:text-6xl font-black mb-8 md:mb-12 italic text-white tracking-tighter uppercase">{String(settings.name || "")}</h2>
          <div className="flex flex-wrap justify-center gap-6 md:gap-16 text-white/30 font-black text-xs md:text-lg uppercase tracking-[0.3em] md:tracking-[0.4em] mb-12 px-4">
              {settings.externalLinks?.map((link) => (
                <a key={link.id} href={link.url || "#"} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 cursor-pointer transition-all hover:scale-110 font-black">
                  {String(link.name || "")}
                </a>
              ))}
          </div>
          <div className="w-12 md:w-20 h-1 bg-orange-600 mx-auto mb-10 md:mb-12 rounded-full opacity-40"></div>
          <p className="text-white/20 text-[8px] md:text-xs font-black tracking-[0.6em] uppercase px-4 font-black">Traditional Chinese Gourmet Excellence Since 1994</p>
        </footer>
      </div>

      {/* [관리자 패널] */}
      {isAdminMode && (
        <div className="fixed inset-0 z-[200] bg-[#fcfaf8] overflow-y-auto animate-in slide-in-from-right duration-500 font-black">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-10">
            <header className="sticky top-0 z-50 glass p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] shadow-xl border border-white mb-10 md:mb-20 flex items-center justify-between font-black">
              <div className="flex items-center gap-4 md:gap-6 text-gray-900">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-black rounded-2xl md:rounded-3xl flex items-center justify-center text-white shadow-2xl shrink-0"><SettingsIcon size={24} /></div>
                <div>
                    <h2 className="text-lg md:text-3xl font-black uppercase tracking-tighter italic font-black">관리 센터</h2>
                    <p className="text-[8px] md:text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 font-black">Dashboard</p>
                </div>
              </div>
              <button onClick={() => setIsAdminMode(false)} className="p-3 md:p-4 bg-gray-900 text-white rounded-full hover:bg-orange-600 transition-all shadow-lg font-black"><XIcon size={24}/></button>
            </header>

            <div className="space-y-12 md:space-y-32 pb-40 text-gray-900 font-black">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 font-black font-black">
                <button onClick={() => scrollToAdminSection(adminNoticeRef)} className="p-4 md:p-8 bg-white rounded-[1rem] border border-gray-100 shadow-sm font-black hover:bg-gray-50 transition-all text-[11px] md:text-xs tracking-widest uppercase font-black">공지사항</button>
                <button onClick={() => scrollToAdminSection(adminMenuRef)} className="p-4 md:p-8 bg-white rounded-[1rem] border border-gray-100 shadow-sm font-black hover:bg-gray-50 transition-all text-[11px] md:text-xs tracking-widest uppercase font-black">메뉴 관리</button>
                <button onClick={() => scrollToAdminSection(adminReviewRef)} className="p-4 md:p-8 bg-white rounded-[1rem] border border-gray-100 shadow-sm font-black hover:bg-gray-50 transition-all text-[11px] md:text-xs tracking-widest uppercase font-black">후기 관리</button>
                <button onClick={() => scrollToAdminSection(adminBrandingRef)} className="p-4 md:p-8 bg-white rounded-[1rem] border border-gray-100 shadow-sm font-black hover:bg-gray-50 transition-all text-[11px] md:text-xs tracking-widest uppercase font-black">가게 정보</button>
              </div>

              <section ref={adminNoticeRef} className="space-y-6 md:space-y-10 scroll-mt-24">
                <h3 className="text-xl md:text-3xl font-black border-l-4 border-orange-500 pl-4 italic font-black">Announcement</h3>
                <textarea value={settings.notice} onChange={(e) => setSettings({...settings, notice: e.target.value})} className="w-full p-6 md:p-12 bg-white rounded-[1.5rem] border-2 border-orange-100 outline-none font-black text-base md:text-2xl min-h-[120px] shadow-sm font-black" />
              </section>

              <section ref={adminMenuRef} className="space-y-8 md:space-y-12 scroll-mt-24 font-black">
                <h3 className="text-xl md:text-3xl font-black border-l-4 border-orange-500 pl-4 italic font-black">Menu List</h3>
                <div className="grid gap-8 font-black">
                  {settings.menuItems.map((item, idx) => (
                    <div key={item.id} className="p-6 md:p-12 bg-white rounded-[2rem] md:rounded-[5rem] border border-gray-100 shadow-sm group font-black">
                      <div className="flex justify-between items-center mb-8 font-black"><span className="px-4 md:px-8 py-2 md:py-2.5 bg-gray-900 text-white rounded-full text-[8px] md:text-[10px] font-black uppercase font-black">Menu #{idx+1}</span><button onClick={() => { const ni = [...settings.menuItems]; ni.splice(idx, 1); setSettings({...settings, menuItems: ni}); }} className="text-red-300 hover:text-red-500 transition-all font-black"><Trash2Icon size={24} /></button></div>
                      <div className="grid md:grid-cols-2 gap-6 font-black font-black">
                        <input value={item.name} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].name = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-5 md:p-8 bg-gray-50 rounded-xl outline-none font-black text-lg md:text-3xl font-black" placeholder="메뉴 이름" />
                        <input value={item.price} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].price = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-5 md:p-8 bg-gray-50 rounded-xl outline-none font-black text-lg md:text-3xl font-black" placeholder="판매 가격" />
                        <textarea value={item.desc} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].desc = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-5 md:p-8 bg-gray-50 rounded-xl outline-none font-bold text-sm md:text-lg min-h-[100px] md:col-span-2 font-black" placeholder="설명을 입력하세요." />
                      </div>
                      <div className="flex flex-col md:flex-row items-center gap-6 mt-8 font-black font-black">
                        <div className="w-20 h-20 md:w-32 md:h-32 rounded-[1.2rem] bg-gray-100 overflow-hidden border-4 border-white shadow-xl shrink-0">{item.img ? <img src={item.img} className="w-full h-full object-cover font-black" /> : <UploadIcon size={32} className="m-auto text-gray-300 h-full font-black"/>}</div>
                        <label className="px-8 md:px-10 py-4 md:py-5 bg-black text-white rounded-2xl text-[10px] font-black cursor-pointer hover:bg-orange-600 active:scale-95 text-center w-full md:w-auto font-black font-black">사진 변경<input type="file" className="hidden" onChange={(e) => { const reader = new FileReader(); reader.onloadend = () => { const ni = [...settings.menuItems]; ni[idx].img = reader.result; setSettings({...settings, menuItems: ni}); }; if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]); }} /></label>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, menuItems: [...settings.menuItems, {id: Date.now(), name: "신메뉴", price: "0", desc: "", category: "전체", isRecommended: false, likes: 0}]})} className="w-full py-12 md:py-28 border-4 border-dashed border-gray-100 rounded-[2.5rem] text-gray-300 hover:text-orange-500 font-black flex items-center justify-center gap-4 md:gap-8 text-lg md:text-3xl active:scale-[0.98] font-black font-black"><PlusIcon size={32} /> 메뉴 추가</button>
                </div>
              </section>

              {/* 후기 관리 */}
              <section ref={adminReviewRef} className="space-y-8 md:space-y-12 scroll-mt-24 font-black">
                <h3 className="text-xl md:text-3xl font-black border-l-4 border-orange-500 pl-4 italic font-black">Feedbacks</h3>
                <div className="grid gap-8 font-black font-black">
                   {settings.reviews.map((rev, idx) => (
                    <div key={idx} className="p-6 md:p-12 bg-white rounded-[2rem] border border-gray-100 shadow-sm space-y-8 font-black font-black">
                      <div className="flex justify-between items-center font-black"><span className="px-5 py-2 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase font-black">Review #{idx+1}</span><button onClick={() => { const nr = [...settings.reviews]; nr.splice(idx, 1); setSettings({...settings, reviews: nr}); }} className="text-red-200 hover:text-red-500 transition-all font-black"><Trash2Icon size={28} /></button></div>
                      <div className="grid md:grid-cols-2 gap-8 font-black">
                        <input value={rev.author} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].author = e.target.value; setSettings({...settings, reviews: nr}); }} className="w-full p-5 bg-gray-50 rounded-xl outline-none font-black text-lg md:text-2xl font-black" placeholder="작성자" />
                        <select value={rev.rating || 5} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].rating = parseInt(e.target.value); setSettings({...settings, reviews: nr}); }} className="w-full p-5 bg-gray-50 rounded-xl outline-none font-black text-lg md:text-2xl text-orange-500 appearance-none font-black"><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option><option value="2">⭐⭐</option><option value="1">⭐</option></select>
                      </div>
                      <textarea value={rev.text} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].text = e.target.value; setSettings({...settings, reviews: nr}); }} className="w-full p-5 bg-gray-50 rounded-xl outline-none font-black text-base md:text-xl min-h-[100px] leading-relaxed font-black" placeholder="후기 내용" />
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, reviews: [...settings.reviews, {author: "단골 손님", rating: 5, text: ""}]})} className="w-full py-12 md:py-20 border-4 border-dashed border-gray-100 rounded-[2rem] text-gray-300 hover:text-orange-500 font-black flex items-center justify-center gap-4 md:gap-6 text-lg active:scale-95 font-black font-black"><PlusIcon size={40} /> 후기 추가</button>
                </div>
              </section>

              {/* 기본 정보 설정 */}
              <section ref={adminBrandingRef} className="space-y-8 md:space-y-12 scroll-mt-24 font-black">
                <h3 className="text-xl md:text-3xl font-black border-l-4 border-orange-500 pl-4 italic">Branding & Links</h3>
                <div className="p-6 md:p-12 bg-white rounded-[2rem] md:rounded-[6rem] border border-gray-100 shadow-sm space-y-10 md:space-y-20 font-black">
                  
                  <div className="space-y-6 md:space-y-8">
                    <label className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase ml-4 tracking-[0.3em] block">External Social Links</label>
                    <div className="grid gap-4 px-1 md:px-4">
                      {settings.externalLinks?.map((link, idx) => (
                        <div key={link.id} className="flex flex-col md:flex-row gap-4 p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100 relative group font-black font-black">
                          <input value={link.name} onChange={(e) => { const nl = [...settings.externalLinks]; nl[idx].name = e.target.value; setSettings({...settings, externalLinks: nl}); }} className="w-full p-4 bg-white rounded-xl outline-none font-black text-base flex-1 font-black" placeholder="서비스 이름" />
                          <input value={link.url} onChange={(e) => { const nl = [...settings.externalLinks]; nl[idx].url = e.target.value; setSettings({...settings, externalLinks: nl}); }} className="w-full p-4 bg-white rounded-xl outline-none font-black text-sm flex-[2] font-black" placeholder="URL 주소 (https://...)" />
                          <button onClick={() => { const nl = [...settings.externalLinks]; nl.splice(idx, 1); setSettings({...settings, externalLinks: nl}); }} className="p-3 text-red-300 hover:text-red-500 font-black"><Trash2Icon size={24}/></button>
                        </div>
                      ))}
                      <button onClick={() => setSettings({...settings, externalLinks: [...(settings.externalLinks || []), { id: Date.now(), name: "새 링크", url: "" }]})} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-[1.5rem] text-gray-300 hover:text-gray-500 font-black flex items-center justify-center gap-3 font-black"><PlusIcon size={18} /> 링크 추가</button>
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-gray-50 font-black">
                    <label className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase ml-4 tracking-[0.3em] block font-black">Main Banner Photo</label>
                    <div className="flex flex-col md:flex-row items-center gap-6 bg-gray-50 p-6 rounded-3xl">
                      <div className="w-full md:w-64 h-24 md:h-44 rounded-xl overflow-hidden border-4 border-white shadow-2xl shrink-0 bg-white font-black font-black">
                        <img src={settings.introImg} className="w-full h-full object-cover font-black" alt="배너 미리보기" />
                      </div>
                      <label className="px-8 py-4 bg-black text-white rounded-full text-[10px] font-black cursor-pointer hover:bg-orange-600 shadow-xl w-full md:w-auto text-center active:scale-95 uppercase tracking-widest font-black font-black">Upload New Banner<input type="file" className="hidden" onChange={(e) => { const reader = new FileReader(); reader.onloadend = () => setSettings({...settings, introImg: reader.result}); if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]); }} /></label>
                    </div>
                  </div>

                  <div className="space-y-8 font-black">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2 font-black"><label className="text-[10px] font-black text-gray-300 ml-4 uppercase font-black font-black">Phone</label><input value={settings.phone} onChange={(e) => setSettings({...settings, phone: e.target.value})} className="w-full p-5 bg-gray-50 rounded-xl outline-none font-black text-lg" /></div>
                        <div className="space-y-2 font-black"><label className="text-[10px] font-black text-gray-300 ml-4 uppercase tracking-widest font-black font-black">Address</label><input value={settings.address} onChange={(e) => setSettings({...settings, address: e.target.value})} className="w-full p-5 bg-gray-50 rounded-xl outline-none font-black text-lg font-black font-black" /></div>
                    </div>
                    <div className="space-y-6 pt-6 border-t border-gray-50 font-black">
                        <label className="text-[10px] font-black text-gray-300 ml-4 uppercase font-black tracking-widest">Maps & Review Links</label>
                        <input value={settings.naverMapUrl} onChange={(e) => setSettings({...settings, naverMapUrl: e.target.value})} className="w-full p-5 bg-gray-50 rounded-xl outline-none font-black text-xs font-black" placeholder="네이버 지도 링크" />
                        <input value={settings.naverReviewUrl} onChange={(e) => setSettings({...settings, naverReviewUrl: e.target.value})} className="w-full p-5 bg-gray-50 rounded-xl outline-none font-black text-xs shadow-inner font-black" placeholder="네이버 리뷰 페이지" />
                    </div>
                    <div className="space-y-2 pt-4 font-black"><label className="text-[10px] font-black text-gray-300 ml-4 uppercase font-black">Brand Name</label><input value={settings.name} onChange={(e) => setSettings({...settings, name: e.target.value})} className="w-full p-6 bg-gray-50 rounded-3xl outline-none font-black text-2xl text-orange-600 italic tracking-tighter" /></div>
                    <div className="space-y-2 pt-4 font-black"><label className="text-[10px] font-black text-gray-300 ml-4 uppercase font-black">Core Message</label><textarea value={settings.introText} onChange={(e) => setSettings({...settings, introText: e.target.value})} className="w-full p-6 bg-gray-50 rounded-3xl outline-none font-black text-lg leading-relaxed tracking-tighter font-black" /></div>
                  </div>
                </div>
              </section>

              <button onClick={() => { saveSettings(settings); setIsAdminMode(false); }} className="w-full bg-orange-600 text-white py-12 rounded-[5rem] font-black text-2xl md:text-5xl hover:bg-black shadow-2xl transition-all active:scale-95 uppercase shadow-orange-100 flex items-center justify-center gap-6 font-black font-black">
                <SaveIcon size={40} /> 전체 설정 저장 및 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [관리자 로그인 모달] */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300 font-black">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] md:rounded-[5rem] p-8 md:p-20 text-center border border-white/10 shadow-2xl">
            <div className="w-16 h-16 md:w-28 md:h-28 bg-[#fcfaf8] text-black rounded-[1.5rem] md:rounded-[3.5rem] flex items-center justify-center mx-auto mb-10 md:mb-16 shadow-inner border border-gray-100 font-black font-black"><SettingsIcon size={40} /></div>
            <h3 className="text-xl md:text-3xl font-black text-gray-900 mb-10 md:mb-20 tracking-[0.4em] italic uppercase font-black">관리자 인증</h3>
            <form onSubmit={handleVerifyPasscode} className="space-y-12 md:space-y-20 font-black">
              <input 
                type="password" 
                required 
                autoFocus 
                value={passcodeInput} 
                onChange={(e)=>setPasscodeInput(e.target.value)} 
                className="w-full bg-gray-50 border-b-4 border-orange-500 p-5 md:p-8 text-center text-4xl md:text-6xl font-black text-gray-900 outline-none focus:bg-orange-50 transition-all tracking-[0.5em] font-black" 
                placeholder="••••••••" 
                maxLength={8}
              />
              <div className="space-y-4 md:space-y-8 font-black font-black">
                <button type="submit" className="w-full bg-black text-white py-5 md:py-10 rounded-full font-black text-base md:text-2xl hover:bg-orange-600 transition-all shadow-2xl active:scale-95 font-black font-black">입장하기</button>
                <button type="button" onClick={()=>setIsAuthModalOpen(false)} className="w-full text-gray-400 text-xs md:text-sm font-black hover:text-gray-600 uppercase tracking-[0.4em] font-black">인증 취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 관리자 진입 버튼 */}
      {!isAdminMode && (
        <button onClick={() => setIsAuthModalOpen(true)} className="fixed bottom-6 right-6 p-4 md:p-6 text-gray-300 hover:text-gray-950 transition-all z-[100] opacity-5 hover:opacity-100 bg-white/30 backdrop-blur rounded-full border border-white/30 shadow-2xl transition-all duration-700 hover:scale-110 active:rotate-90 font-black font-black"><SettingsIcon size={28} /></button>
      )}
    </div>
  );
};

export default App;