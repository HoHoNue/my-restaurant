import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, onSnapshot 
} from 'firebase/firestore';
import { 
  Settings, MapPin, Utensils, Clock, Plus, Trash2, 
  Save, Upload, X, Sparkles, Loader2, ChevronRight, 
  ChevronLeft, Star, Heart, MessageSquare, Quote, 
  LayoutGrid, Menu as MenuIcon, Info, Bell, Navigation, PhoneCall, Link as LinkIcon
} from 'lucide-react';

// --- [사장님 설정] 관리자 접속 비밀 코드 (8자리) ---
const ADMIN_PASSCODE = "12345678"; 

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAMOfzHa8q_rrJnOTEUlXvDtmSSOG3rbwk",
  authDomain: "storename-fd521.firebaseapp.com",
  projectId: "storename-fd521",
  storageBucket: "storename-fd521.firebasestorage.app",
  messagingSenderId: "84170436191",
  appId: "1:84170436191:web:5ef6bb52029e816a6675ea"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "premium-store-v3"; 

const App = () => {
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("전체");
  
  const menuScrollRef = useRef(null);
  const adminCategoryRef = useRef(null);
  const adminMenuRef = useRef(null);
  const adminReviewRef = useRef(null);
  const adminBrandingRef = useRef(null);
  const adminNoticeRef = useRef(null);

  const [settings, setSettings] = useState({
    name: "청궁 (靑宮)",
    notice: "봄맞이 신메뉴 '전복 유산슬' 출시! 평일 런치 방문 시 군만두 서비스 증정",
    introImg: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=1200",
    introText: "30년 전통의 수타면 전문점. 명장의 손길로 빚어낸 정통 중화요리의 깊은 맛을 선보입니다.",
    naverReviewUrl: "https://m.place.naver.com", 
    naverMapUrl: "", 
    address: "서울특별시 강남구 맛집로 88길 1층 청궁",
    phone: "02-1234-5678",
    categories: ["전체", "면류", "요리류", "세트메뉴"],
    // 외부 링크 수동 관리 데이터 추가
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
    menuItems: [
      { id: 1, name: "명품 수타 짜장면", price: "8,000", desc: "매일 아침 직접 치댄 쫄깃한 수타면과 깊은 풍미의 특제 춘장 소스", category: "면류", isRecommended: true, likes: 124, img: "https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?auto=format&fit=crop&q=80&w=400" },
      { id: 2, name: "삼선 해물 짬뽕", price: "10,000", desc: "신선한 전복과 해산물이 듬뿍 들어간 시원하고 얼큰한 국물", category: "면류", isRecommended: true, likes: 98, img: "https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&q=80&w=400" },
      { id: 3, name: "찹쌀 꿔바로우", price: "24,000", desc: "겉은 바삭하고 속은 쫄깃한 최상급 국내산 돼지고기 탕수육", category: "요리류", isRecommended: true, likes: 256, img: "https://images.unsplash.com/photo-1623341214825-9f4f963727da?auto=format&fit=crop&q=80&w=400" }
    ],
    reviews: [
      { author: "이현주 님", rating: 5, text: "아이들과 주말마다 오는데 짜장면 면발이 정말 달라요. 꿔바로우는 식어도 바삭합니다." },
      { author: "김민석 님", rating: 5, text: "중요한 미팅이 있어서 방문했는데 분위기가 너무 고급스럽고 음식 플레이팅도 예술이었습니다." }
    ]
  });

  const [myLikes, setMyLikes] = useState([]);

  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      if (!u) { try { await signInAnonymously(auth); } catch(e){} }
      setUser(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'storeSettings', 'main');
    const unsubscribe = onSnapshot(settingsDoc, (snapshot) => {
      if (snapshot.exists()) setSettings(prev => ({ ...prev, ...snapshot.data() }));
    });
    const savedLikes = localStorage.getItem(`likes_${appId}`);
    if (savedLikes) setMyLikes(JSON.parse(savedLikes));
    return () => unsubscribe();
  }, [user]);

  const saveSettings = async (newData) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'storeSettings', 'main'), newData);
    } catch (e) {
      console.error("저장 중 오류 발생", e);
    }
  };

  const handleVerifyPasscode = (e) => {
    e.preventDefault();
    if (passcodeInput === ADMIN_PASSCODE) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasscodeInput("");
      window.scrollTo(0, 0); // 관리자 페이지 진입 시 상단으로 이동
    } else { 
      alert("비밀 코드가 일치하지 않습니다."); 
      setPasscodeInput("");
    }
  };

  const toggleLike = async (menuId) => {
    if (myLikes.includes(menuId)) return;
    const newItems = settings.menuItems.map(item => item.id === menuId ? { ...item, likes: (item.likes || 0) + 1 } : item);
    const newMyLikes = [...myLikes, menuId];
    setMyLikes(newMyLikes);
    localStorage.setItem(`likes_${appId}`, JSON.stringify(newMyLikes));
    const newSettings = { ...settings, menuItems: newItems };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const filteredMenu = activeCategory === "전체" ? settings.menuItems : settings.menuItems.filter(item => item.category === activeCategory);

  const scrollMenu = (direction) => {
    if (menuScrollRef.current) {
      const scrollAmount = window.innerWidth < 768 ? 300 : 400;
      const amount = direction === 'left' ? -scrollAmount : scrollAmount;
      menuScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const scrollToAdminSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#fcfaf8] gap-6">
      <Loader2 size={48} className="animate-spin text-orange-500" />
      <p className="text-gray-400 font-black tracking-widest uppercase">서버 연결 중</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfaf8] text-[#1a1a1a] flex flex-col items-center">
      
      {/* [메인 서비스 화면] */}
      <div className={`w-full flex flex-col items-center ${isAdminMode ? 'hidden' : 'block animate-in fade-in duration-1000'}`}>
        
        {/* 상단 배너 - 모바일 크기 최적화 */}
        <header className="relative h-[55vh] md:h-[65vh] w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src={settings.introImg} className="w-full h-full object-cover" alt="배경" />
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"></div>
          </div>
          <div className="relative z-10 text-center px-6 max-w-5xl flex flex-col items-center">
            {/* 상단 상호명 폰트 크기 반응형 조절 */}
            <h1 className="text-5xl sm:text-7xl md:text-[10rem] font-black text-white mb-6 md:mb-10 tracking-tighter drop-shadow-2xl italic leading-[1.1]">{settings.name}</h1>
            <div className="w-12 h-1.5 bg-orange-500 rounded-full mb-6 md:mb-10 shadow-lg"></div>
            <p className="text-base sm:text-xl md:text-3xl text-white font-bold max-w-3xl mx-auto leading-relaxed break-keep drop-shadow-md">
              {settings.introText}
            </p>
          </div>
        </header>

        <main className="w-full max-w-screen-xl mx-auto px-4 md:px-12 py-16 md:py-32 space-y-24 md:space-y-48 flex flex-col items-center">
          
          {/* 공지사항 - 너비 및 모바일 폰트 조절 */}
          {settings.notice && (
            <section className="w-full animate-in slide-in-from-bottom-8 duration-700">
              <div className="glass p-6 md:p-16 rounded-[2.5rem] md:rounded-[4rem] border-2 border-orange-100 flex flex-col md:flex-row items-center gap-6 md:gap-12 shadow-2xl shadow-orange-100/30">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-orange-600 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-white shadow-xl shrink-0">
                  <Bell size={32} className="animate-pulse md:hidden" />
                  <Bell size={48} className="animate-pulse hidden md:block" />
                </div>
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-lg md:text-2xl font-black mb-2 md:mb-4 text-orange-600 italic tracking-tighter">가게 소식 안내</h3>
                  <p className="text-lg md:text-3xl font-black leading-snug break-keep text-gray-900">
                    {settings.notice}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* 메뉴판 - 모바일 여백 조절 */}
          <section id="menu-list" className="w-full space-y-12 md:space-y-20 flex flex-col items-center">
            <div className="flex flex-col lg:flex-row justify-between items-center lg:items-end w-full gap-6 md:gap-10 text-center lg:text-left px-2">
              <div className="flex flex-col items-center lg:items-start">
                <h2 className="text-4xl md:text-8xl font-black mb-4 md:mb-6 tracking-tight italic text-gray-900 uppercase">대표 요리</h2>
                <div className="h-1.5 md:h-2 w-20 md:w-32 bg-orange-600 rounded-full mb-4 md:mb-6"></div>
                <p className="text-gray-400 text-sm md:text-xl font-black tracking-widest uppercase">Traditional Masterpiece</p>
              </div>
              <div className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar pb-2 max-w-full justify-start md:justify-center px-2">
                {settings.categories.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`px-6 md:px-12 py-3 md:py-5 rounded-full text-xs md:text-sm font-black transition-all border-2 whitespace-nowrap ${activeCategory === cat ? 'bg-black border-black text-white shadow-2xl scale-105' : 'bg-white border-gray-100 text-gray-400 hover:border-black'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 메뉴 슬라이드 영역 */}
            <div className="relative w-full group">
              <button 
                onClick={() => scrollMenu('left')} 
                className="absolute left-[-15px] md:left-[-30px] top-1/2 -translate-y-1/2 z-30 p-4 md:p-6 bg-white/90 backdrop-blur-sm rounded-full shadow-2xl hover:bg-black hover:text-white transition-all border border-gray-50 hidden lg:flex active:scale-75 items-center justify-center"
              >
                <ChevronLeft size={36} />
              </button>
              
              <div ref={menuScrollRef} className="flex overflow-x-auto gap-6 md:gap-12 pb-10 md:pb-20 px-4 -mx-4 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing">
                {filteredMenu.map(item => (
                  <div key={item.id} onDoubleClick={() => toggleLike(item.id)} className="flex-none w-[280px] md:w-[450px] snap-center group/card flex flex-col">
                    <div className="relative aspect-[4/5] rounded-[3rem] md:rounded-[5rem] overflow-hidden mb-8 md:mb-12 shadow-xl transition-all duration-1000 group-hover/card:translate-y-[-10px]">
                      <img src={item.img || "https://via.placeholder.com/800"} className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-110" alt={item.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                      <button onClick={() => toggleLike(item.id)} className={`absolute top-6 md:top-10 right-6 md:right-10 p-4 md:p-6 rounded-full glass transition-all ${myLikes.includes(item.id) ? 'text-red-500 scale-125' : 'text-gray-900 md:opacity-0 group-hover/card:opacity-100'}`}><Heart size={24} fill={myLikes.includes(item.id) ? "currentColor" : "none"}/></button>
                      <div className="absolute bottom-8 md:bottom-12 left-8 md:left-12 right-8 md:right-12 text-white">
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-orange-400 mb-3 md:mb-5 block underline underline-offset-8 decoration-2">Premium Dish</span>
                        <h3 className="text-2xl md:text-4xl font-black mb-3 md:mb-5 tracking-tight leading-tight uppercase">{item.name}</h3>
                        <p className="text-xs md:text-base font-bold leading-relaxed line-clamp-2 italic opacity-90">{item.desc}</p>
                      </div>
                    </div>
                    <div className="px-6 md:px-10 flex justify-between items-center">
                      <span className="text-3xl md:text-5xl font-black italic tracking-tightest text-gray-900"><span className="text-base md:text-xl not-italic mr-2 md:mr-3 text-gray-300 font-black">₩</span>{item.price}</span>
                      <div className="flex items-center gap-2 md:gap-3 bg-white border border-gray-100 px-4 md:px-6 py-1.5 md:py-2.5 rounded-full shadow-lg"><Heart size={16} className="text-red-400 md:w-5 md:h-5" fill="currentColor"/><span className="text-sm md:text-lg text-gray-400 font-black">{item.likes || 0}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => scrollMenu('right')} 
                className="absolute right-[-15px] md:right-[-30px] top-1/2 -translate-y-1/2 z-30 p-4 md:p-6 bg-white/90 backdrop-blur-sm rounded-full shadow-2xl hover:bg-black hover:text-white transition-all border border-gray-50 hidden lg:flex active:scale-75 items-center justify-center"
              >
                <ChevronRight size={36} />
              </button>
            </div>
          </section>

          {/* 리뷰 섹션 - 모바일 폰트 조절 */}
          <section className="w-full relative overflow-hidden py-16 md:py-24 flex flex-col items-center">
            <div className="text-center mb-16 md:mb-32 flex flex-col items-center gap-6 md:gap-10">
              <div className="flex flex-col items-center">
                <h2 className="text-4xl md:text-8xl font-black mb-4 md:mb-8 tracking-tighter italic text-gray-900 uppercase">손님들의 이야기</h2>
                <div className="h-1.5 md:h-2 w-24 md:w-32 bg-orange-600 rounded-full mb-4 md:mb-8"></div>
                <p className="text-gray-400 text-sm md:text-xl font-black tracking-widest uppercase">Honest Feedback</p>
              </div>
              
              {settings.naverReviewUrl && (
                <a href={settings.naverReviewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 md:gap-5 px-8 md:px-14 py-4 md:py-6 bg-[#2DB400] text-white rounded-full text-sm md:text-xl font-black shadow-2xl hover:brightness-110 active:scale-95 group"><MessageSquare size={20} className="md:w-7 md:h-7" /> 네이버 리뷰 전체보기 <ChevronRight size={18} className="md:w-6 md:h-6" /></a>
              )}
            </div>
            
            <div className="flex animate-marquee gap-8 md:gap-20">
              {[...settings.reviews, ...settings.reviews].map((rev, i) => (
                <div key={i} className="w-[300px] md:w-[600px] glass p-10 md:p-24 rounded-[3rem] md:rounded-[6rem] shadow-sm shrink-0 flex flex-col justify-between border-gray-100/50">
                  <div className="relative">
                    <Quote className="absolute -top-8 -right-8 md:-top-12 md:-right-12 text-orange-100 opacity-25 w-16 h-16 md:w-48 md:h-48" />
                    <div className="flex items-center gap-6 md:gap-10 mb-8 md:16 relative z-10">
                      <div className="w-14 h-14 md:w-24 md:h-24 bg-white rounded-[1.2rem] md:rounded-[2.5rem] flex items-center justify-center font-black text-orange-600 text-xl md:text-4xl border border-gray-50 shadow-inner uppercase shrink-0">{rev.author?.[0]}</div>
                      <div>
                        <div className="font-black text-lg md:text-3xl text-gray-900 mb-1 md:mb-3">{rev.author}</div>
                        <div className="flex text-orange-400 text-xs md:text-sm gap-1">
                           {[...Array(5)].map((_, s) => <Star key={s} size={14} className="md:w-6 md:h-6" fill={s < (rev.rating || 5) ? "currentColor" : "none"} />)}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-800 italic break-keep leading-relaxed text-lg md:text-3xl font-black">"{rev.text}"</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 오시는 길 */}
          <section id="map-area" className="w-full max-w-screen-xl space-y-16 md:space-y-20 flex flex-col items-center text-center">
            <div className="flex flex-col items-center gap-8 md:gap-12 w-full">
              <h2 className="text-4xl md:text-8xl font-black tracking-tighter italic text-gray-900 uppercase">오시는 길</h2>
              <div className="h-1.5 md:h-2 w-24 md:w-32 bg-orange-600 rounded-full"></div>
              
              <div className="space-y-8 md:space-y-10">
                <p className="text-gray-900 text-2xl md:text-6xl font-black underline decoration-orange-300 underline-offset-[10px] md:underline-offset-[15px] decoration-[5px] md:decoration-[10px] break-all tracking-tighter px-4">{settings.address}</p>
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 pt-8 md:pt-12">
                   <a href={`tel:${settings.phone}`} className="flex items-center gap-4 md:gap-5 px-10 md:px-12 py-4 md:py-6 bg-white border-2 border-gray-100 rounded-full text-lg md:text-2xl font-black hover:bg-gray-50 transition-all shadow-xl">
                        <PhoneCall size={24} className="text-orange-500 md:w-8 md:h-8" /> {settings.phone}
                   </a>
                   {settings.naverMapUrl && (
                     <a href={settings.naverMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 md:gap-5 px-10 md:px-16 py-5 md:py-7 bg-orange-600 text-white rounded-full text-lg md:text-2xl font-black hover:bg-black shadow-2xl transition-all active:scale-95 group shadow-orange-200">
                        <Navigation size={24} fill="currentColor" className="md:w-9 md:h-9" /> 네이버 지도로 길찾기
                     </a>
                   )}
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* 하단 링크 - 사장님이 설정한 데이터로 출력 */}
        <footer className="w-full bg-gray-950 py-32 md:py-48 text-center px-6 mt-32">
          <h2 className="text-4xl md:text-6xl font-black mb-8 md:mb-12 italic text-white tracking-tighter uppercase">{settings.name}</h2>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-white/30 font-black text-sm md:text-lg uppercase tracking-[0.4em] mb-16 px-4">
              {settings.externalLinks?.map((link) => (
                <a key={link.id} href={link.url || "#"} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 cursor-pointer transition-all hover:scale-110">
                  {link.name}
                </a>
              ))}
          </div>
          <div className="w-16 md:w-20 h-1 bg-orange-600 mx-auto mb-10 md:mb-12 rounded-full opacity-40"></div>
          <p className="text-white/20 text-[10px] md:text-xs font-black tracking-[0.8em] uppercase">Traditional Chinese Gourmet Excellence Since 1994</p>
        </footer>
      </div>

      {/* [관리자 페이지] */}
      {isAdminMode && (
        <div className="fixed inset-0 z-[200] bg-[#fcfaf8] overflow-y-auto animate-in slide-in-from-right duration-500">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-12">
            <header className="sticky top-0 z-50 glass p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-xl border border-white mb-12 md:mb-20 flex items-center justify-between">
              <div className="flex items-center gap-4 md:gap-6 text-gray-900">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-black rounded-2xl md:rounded-3xl flex items-center justify-center text-white shadow-2xl shrink-0"><Settings size={28} /></div>
                <div>
                    <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter italic">관리 센터</h2>
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">Dashboard</p>
                </div>
              </div>
              <button onClick={() => setIsAdminMode(false)} className="p-3 md:p-4 bg-gray-900 text-white rounded-full hover:bg-orange-600 transition-all shadow-lg active:scale-90"><X size={24}/></button>
            </header>

            <div className="space-y-20 md:space-y-32 pb-40 text-gray-900">
              {/* 퀵 내비게이션 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {['공지사항', '메뉴 관리', '후기 관리', '가게 정보'].map((menu, i) => (
                    <button key={menu} onClick={() => scrollToAdminSection([adminNoticeRef, adminMenuRef, adminReviewRef, adminBrandingRef][i])} className="p-5 md:p-8 bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-sm font-black text-gray-900 hover:bg-gray-50 transition-all text-[10px] md:text-xs tracking-widest">{menu}</button>
                ))}
              </div>

              {/* 공지사항 */}
              <section ref={adminNoticeRef} className="space-y-6 md:space-y-10 scroll-mt-32">
                <h3 className="text-xl md:text-3xl font-black border-l-4 md:border-l-8 border-orange-500 pl-4 md:pl-6 italic">공지사항 설정</h3>
                <textarea value={settings.notice} onChange={(e) => setSettings({...settings, notice: e.target.value})} className="w-full p-8 md:p-12 bg-white rounded-[2rem] md:rounded-[4rem] border-2 border-orange-100 outline-none font-black text-lg md:text-2xl min-h-[150px] md:min-h-[200px] shadow-sm focus:ring-[12px] ring-orange-50 transition-all" />
              </section>

              {/* 메뉴 관리 */}
              <section ref={adminMenuRef} className="space-y-8 md:space-y-12 scroll-mt-32">
                <h3 className="text-xl md:text-3xl font-black border-l-4 md:border-l-8 border-orange-500 pl-4 md:pl-6 italic">메뉴 리스트</h3>
                <div className="grid gap-8 md:gap-12">
                  {settings.menuItems.map((item, idx) => (
                    <div key={item.id} className="p-6 md:p-12 bg-white rounded-[2.5rem] md:rounded-[5rem] border border-gray-100 shadow-sm group">
                      <div className="flex justify-between items-center mb-8 md:mb-12"><span className="px-5 md:px-8 py-2 md:py-2.5 bg-gray-900 text-white rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest">메뉴 #{idx+1}</span><button onClick={() => { const ni = [...settings.menuItems]; ni.splice(idx, 1); setSettings({...settings, menuItems: ni}); }} className="text-red-200 hover:text-red-500 transition-all hover:scale-110"><Trash2 size={24} className="md:w-8 md:h-8" /></button></div>
                      <div className="grid md:grid-cols-2 gap-6 md:gap-12">
                        <div className="space-y-6 md:space-y-8">
                            <input value={item.name} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].name = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-6 md:p-8 bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] outline-none font-black text-xl md:text-3xl" placeholder="메뉴 이름" />
                            <input value={item.price} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].price = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-6 md:p-8 bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] outline-none font-black text-xl md:text-3xl" placeholder="판매 가격" />
                        </div>
                        <textarea value={item.desc} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].desc = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-6 md:p-8 bg-gray-50 rounded-[1.5rem] md:rounded-[2.5rem] outline-none font-bold text-base md:text-lg min-h-[150px] md:min-h-[220px]" placeholder="설명을 입력하세요." />
                      </div>
                      <div className="flex items-center gap-6 md:gap-8 mt-8 md:mt-10">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-[1.5rem] md:rounded-[2.5rem] bg-gray-100 overflow-hidden border-4 border-white shadow-xl shrink-0">{item.img ? <img src={item.img} className="w-full h-full object-cover" /> : <Upload size={32} className="m-auto text-gray-300 h-full"/>}</div>
                        <label className="px-6 md:px-10 py-4 md:py-5 bg-black text-white rounded-2xl text-xs font-black cursor-pointer hover:bg-orange-600 shadow-xl active:scale-95">사진 변경<input type="file" className="hidden" onChange={(e) => { const reader = new FileReader(); reader.onloadend = () => { const ni = [...settings.menuItems]; ni[idx].img = reader.result; setSettings({...settings, menuItems: ni}); }; reader.readAsDataURL(e.target.files[0]); }} /></label>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, menuItems: [...settings.menuItems, {id: Date.now(), name: "신메뉴", price: "0", desc: "", category: "전체", isRecommended: false, likes: 0}]})} className="w-full py-20 md:py-28 border-4 border-dashed border-gray-100 rounded-[3rem] md:rounded-[6rem] text-gray-300 hover:text-orange-500 hover:border-orange-100 font-black flex items-center justify-center gap-6 md:gap-8 text-xl md:text-3xl active:scale-[0.98]"><Plus size={48} className="md:w-16 md:h-16" /> 메뉴 추가</button>
                </div>
              </section>

              {/* 후기 관리 */}
              <section ref={adminReviewRef} className="space-y-10 md:space-y-12 scroll-mt-32">
                <h3 className="text-xl md:text-3xl font-black border-l-4 md:border-l-8 border-orange-500 pl-4 md:pl-6 italic text-gray-900">후기 리스트</h3>
                <div className="grid gap-8 md:gap-12">
                   {settings.reviews.map((rev, idx) => (
                    <div key={idx} className="p-8 md:p-12 bg-white rounded-[2.5rem] md:rounded-[5rem] border border-gray-100 shadow-sm space-y-8 md:space-y-10">
                      <div className="flex justify-between items-center"><span className="px-6 md:px-8 py-2 md:py-2.5 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">후기 #{idx+1}</span><button onClick={() => { const nr = [...settings.reviews]; nr.splice(idx, 1); setSettings({...settings, reviews: nr}); }} className="text-red-200 hover:text-red-500 transition-all hover:scale-110"><Trash2 size={28} className="md:w-8 md:h-8" /></button></div>
                      <div className="grid md:grid-cols-2 gap-8 md:gap-10">
                        <div className="space-y-4"><label className="text-[10px] font-black text-gray-300 uppercase ml-4 tracking-widest">작성자 성함</label><input value={rev.author} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].author = e.target.value; setSettings({...settings, reviews: nr}); }} className="w-full p-6 md:p-8 bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] outline-none font-black text-xl md:text-2xl" /></div>
                        <div className="space-y-4"><label className="text-[10px] font-black text-gray-300 uppercase ml-4 tracking-widest">별점</label><select value={rev.rating || 5} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].rating = parseInt(e.target.value); setSettings({...settings, reviews: nr}); }} className="w-full p-6 md:p-8 bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] outline-none font-black text-xl md:text-2xl text-orange-500"><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option><option value="2">⭐⭐</option><option value="1">⭐</option></select></div>
                      </div>
                      <textarea value={rev.text} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].text = e.target.value; setSettings({...settings, reviews: nr}); }} className="w-full p-6 md:p-8 bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] outline-none font-black text-lg md:text-xl min-h-[120px] md:min-h-[160px] leading-relaxed" />
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, reviews: [...settings.reviews, {author: "단골 손님", rating: 5, text: ""}]})} className="w-full py-16 md:py-20 border-4 border-dashed border-gray-100 rounded-[3rem] md:rounded-[5rem] text-gray-300 hover:text-orange-500 font-black flex items-center justify-center gap-4 md:gap-6 text-xl md:text-2xl active:scale-95"><Plus size={40} /> 후기 추가</button>
                </div>
              </section>

              {/* 가게 정보 설정 및 외부 링크 관리 */}
              <section ref={adminBrandingRef} className="space-y-10 md:space-y-12 scroll-mt-32">
                <h3 className="text-xl md:text-3xl font-black border-l-4 md:border-l-8 border-orange-500 pl-4 md:pl-6 italic text-gray-900">가게 정보 및 링크 관리</h3>
                <div className="p-8 md:p-12 bg-white rounded-[3rem] md:rounded-[6rem] border border-gray-100 shadow-sm space-y-16 md:space-y-20">
                  
                  {/* 외부 서비스 링크 수동 추가 관리 섹션 [사장님 요청] */}
                  <div className="space-y-8">
                    <label className="text-xs font-black text-gray-400 uppercase ml-6 tracking-[0.4em] block">하단 고정 외부 링크 설정 (인스타, 카카오 등)</label>
                    <div className="grid gap-6 px-2 md:px-4">
                      {settings.externalLinks?.map((link, idx) => (
                        <div key={link.id} className="flex flex-col md:flex-row gap-4 p-6 bg-gray-50 rounded-[2rem] border border-gray-100 relative group">
                          <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-gray-300 uppercase ml-2">서비스 이름 (예: 인스타그램)</label>
                            <input value={link.name} onChange={(e) => { const nl = [...settings.externalLinks]; nl[idx].name = e.target.value; setSettings({...settings, externalLinks: nl}); }} className="w-full p-4 bg-white rounded-xl outline-none font-black text-lg" />
                          </div>
                          <div className="flex-[2] space-y-2">
                            <label className="text-[10px] font-black text-gray-300 uppercase ml-2">연결 링크 주소 (URL)</label>
                            <input value={link.url} onChange={(e) => { const nl = [...settings.externalLinks]; nl[idx].url = e.target.value; setSettings({...settings, externalLinks: nl}); }} className="w-full p-4 bg-white rounded-xl outline-none font-black text-sm" placeholder="https://..." />
                          </div>
                          <button onClick={() => { const nl = [...settings.externalLinks]; nl.splice(idx, 1); setSettings({...settings, externalLinks: nl}); }} className="p-4 text-red-300 hover:text-red-500 self-center md:self-end mb-1"><Trash2 size={24}/></button>
                        </div>
                      ))}
                      <button onClick={() => setSettings({...settings, externalLinks: [...(settings.externalLinks || []), { id: Date.now(), name: "새 링크", url: "" }]})} className="w-full py-6 border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-300 hover:text-gray-500 font-black flex items-center justify-center gap-3"><Plus size={20} /> 새로운 외부 링크 추가</button>
                    </div>
                  </div>

                  {/* 배너 사진 수정 */}
                  <div className="space-y-6 pt-8 border-t border-gray-50">
                    <label className="text-xs font-black text-gray-400 uppercase ml-6 tracking-[0.4em] block">홈페이지 배너 사진</label>
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 bg-gray-50 p-8 md:p-10 rounded-[2.5rem] md:rounded-[4rem]">
                      <div className="w-full md:w-80 h-32 md:h-44 rounded-2xl md:rounded-3xl overflow-hidden border-4 border-white shadow-2xl shrink-0 bg-white">
                        <img src={settings.introImg} className="w-full h-full object-cover" alt="배너 미리보기" />
                      </div>
                      <label className="px-10 py-5 bg-black text-white rounded-full text-xs font-black cursor-pointer hover:bg-orange-600 shadow-xl w-full md:w-auto text-center">새 사진 업로드<input type="file" className="hidden" onChange={(e) => { const reader = new FileReader(); reader.onloadend = () => setSettings({...settings, introImg: reader.result}); reader.readAsDataURL(e.target.files[0]); }} /></label>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="grid md:grid-cols-2 gap-8 md:gap-10">
                        <div className="space-y-3"><label className="text-[10px] font-black text-gray-300 ml-4 uppercase">매장 전화번호</label><input value={settings.phone} onChange={(e) => setSettings({...settings, phone: e.target.value})} className="w-full p-6 md:p-8 bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] outline-none font-black text-xl md:text-2xl" /></div>
                        <div className="space-y-3"><label className="text-[10px] font-black text-gray-300 ml-4 uppercase">매장 주소</label><input value={settings.address} onChange={(e) => setSettings({...settings, address: e.target.value})} className="w-full p-6 md:p-8 bg-gray-50 rounded-[1.5rem] md:rounded-[2rem] outline-none font-black text-xl md:text-2xl" /></div>
                    </div>
                    <div className="space-y-6 pt-6 border-t border-gray-50">
                        <label className="text-[10px] font-black text-gray-300 ml-4 uppercase">네이버 지도 링크 (길찾기용)</label>
                        <input value={settings.naverMapUrl} onChange={(e) => setSettings({...settings, naverMapUrl: e.target.value})} className="w-full p-6 bg-gray-50 rounded-[2rem] outline-none font-black text-sm" placeholder="https://naver.me/..." />
                        <label className="text-[10px] font-black text-gray-300 ml-4 uppercase">네이버 리뷰 페이지 링크</label>
                        <input value={settings.naverReviewUrl} onChange={(e) => setSettings({...settings, naverReviewUrl: e.target.value})} className="w-full p-6 bg-gray-50 rounded-[2rem] outline-none font-black text-sm shadow-inner" />
                    </div>
                    <div className="space-y-3 pt-4"><label className="text-[10px] font-black text-gray-300 ml-4 uppercase">가게 상호명</label><input value={settings.name} onChange={(e) => setSettings({...settings, name: e.target.value})} className="w-full p-6 md:p-8 bg-gray-50 rounded-[2rem] md:rounded-[3rem] outline-none font-black text-3xl md:text-6xl text-orange-600 italic tracking-tighter" /></div>
                    <div className="space-y-3 pt-4"><label className="text-[10px] font-black text-gray-300 ml-4 uppercase">가게 핵심 소개글</label><textarea value={settings.introText} onChange={(e) => setSettings({...settings, introText: e.target.value})} className="w-full p-8 md:p-12 bg-gray-50 rounded-[2rem] md:rounded-[5rem] outline-none font-black text-xl md:text-3xl leading-relaxed tracking-tighter" /></div>
                  </div>
                </div>
              </section>

              <button onClick={() => { saveSettings(settings); setIsAdminMode(false); }} className="w-full bg-orange-600 text-white py-12 md:py-16 rounded-[6rem] md:rounded-[8rem] font-black text-3xl md:text-5xl hover:bg-black shadow-2xl transition-all active:scale-95 uppercase shadow-orange-100 flex items-center justify-center gap-6 md:gap-10">
                <Save size={48} className="md:w-16 md:h-16" /> 전체 저장 및 종료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [관리자 로그인 모달] */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white/10 w-full max-w-md rounded-[3rem] md:rounded-[5rem] p-12 md:p-20 text-center border border-white/10 shadow-2xl">
            <div className="w-20 h-20 md:w-28 md:h-28 bg-white text-black rounded-[2rem] md:rounded-[3.5rem] flex items-center justify-center mx-auto mb-12 md:mb-16 shadow-2xl"><Lock size={48} /></div>
            <h3 className="text-2xl md:text-3xl font-black text-white mb-16 md:mb-20 tracking-[0.4em] italic uppercase">관리자 인증</h3>
            <form onSubmit={handleVerifyPasscode} className="space-y-16 md:space-y-20">
              <input 
                type="password" 
                required 
                autoFocus 
                value={passcodeInput} 
                onChange={(e)=>setPasscodeInput(e.target.value)} 
                className="w-full bg-transparent border-b-4 border-white/20 p-6 md:p-8 text-center text-4xl md:text-6xl font-black text-white outline-none focus:border-orange-600 transition-all tracking-[0.5em]" 
                placeholder="••••••••" 
                maxLength={8}
              />
              <div className="space-y-6 md:space-y-8 font-black">
                <button type="submit" className="w-full bg-white text-black py-6 md:py-10 rounded-full font-black text-xl md:text-2xl hover:bg-orange-600 hover:text-white transition-all shadow-2xl active:scale-95 uppercase tracking-widest">인증 확인</button>
                <button type="button" onClick={()=>setIsAuthModalOpen(false)} className="w-full text-white/30 text-xs md:text-sm font-black hover:text-white uppercase tracking-[0.4em]">취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 관리자 진입 버튼 */}
      {!isAdminMode && (
        <button onClick={() => setIsAuthModalOpen(true)} className="fixed bottom-10 right-10 p-5 md:p-6 text-gray-300 hover:text-gray-900 transition-all z-[100] opacity-5 hover:opacity-100 bg-white/30 backdrop-blur rounded-full border border-white/30 shadow-2xl transition-all duration-700 hover:scale-110 active:rotate-90"><Settings size={32} /></button>
      )}
    </div>
  );
};

export default App;