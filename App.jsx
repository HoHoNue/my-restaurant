import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Store, 
  Settings, 
  MapPin, 
  Utensils, 
  Clock, 
  Calendar, 
  LogOut, 
  Plus, 
  Trash2, 
  Save, 
  Upload,
  X,
  Lock,
  Sparkles,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Star,
  Heart,
  ExternalLink,
  MessageSquare,
  Quote,
  LayoutGrid,
  Menu as MenuIcon,
  Info
} from 'lucide-react';

// --- [사장님 설정] 관리자 접속 비밀 코드 ---
const ADMIN_PASSCODE = "1234"; 

// --- [필수] Firebase 설정 ---
// GitHub에 올리기 전, 본인의 Firebase 콘솔 > 프로젝트 설정 > 내 앱에서 복사한 정보를 여기에 붙여넣으세요.
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "여기에_API_KEY를_넣으세요",
      authDomain: "여기에_AUTH_DOMAIN을_넣으세요",
      projectId: "여기에_PROJECT_ID를_넣으세요",
      storageBucket: "여기에_STORAGE_BUCKET을_넣으세요",
      messagingSenderId: "여기에_SENDER_ID를_넣으세요",
      appId: "여기에_APP_ID를_넣으세요"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Rule 1 준수를 위한 appId 및 경로 설정
const appId = typeof __app_id !== 'undefined' ? __app_id : "store-production-01";
const apiKey = ""; // Gemini API Key (AI 기능을 위해 입력 필요)

/**
 * 이미지 업로드 헬퍼
 */
const handleImageUpload = (e, callback) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
  }
};

/**
 * Gemini AI 호출 함수 (Exponential Backoff 적용)
 */
const callGemini = async (prompt) => {
  if (!apiKey) return "API 키가 설정되지 않았습니다.";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };

  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("API 호출 실패");
      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
      if (i === 4) return "AI 호출 중 오류가 발생했습니다.";
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
};

const App = () => {
  // --- 상태 관리 ---
  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("전체");
  
  const menuScrollRef = useRef(null);
  const adminCategoryRef = useRef(null);
  const adminMenuRef = useRef(null);
  const adminReviewRef = useRef(null);
  const adminBrandingRef = useRef(null);

  // 초기 데이터 (샘플)
  const [settings, setSettings] = useState({
    name: "청궁 (靑宮)",
    introImg: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=1200",
    introImgScale: 100,
    introText: "30년 전통의 수타면 전문점. 정통 중화요리의 깊은 맛을 느껴보세요.",
    naverReviewUrl: "", 
    categories: ["전체", "면류", "요리류", "세트메뉴"],
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

  // (1) Rule 3: 인증 처리 (Auth FIRST)
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

  // (2) Rule 1 & Rule 3: 데이터 수신
  useEffect(() => {
    if (!user) return;

    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'storeSettings', 'main');
    const unsubscribe = onSnapshot(settingsDoc, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(prev => ({ ...prev, ...snapshot.data() }));
      }
    }, (err) => console.error("Firestore 수신 에러:", err));

    const savedLikes = localStorage.getItem(`likes_${appId}`);
    if (savedLikes) setMyLikes(JSON.parse(savedLikes));

    return () => unsubscribe();
  }, [user]);

  /**
   * 설정 저장 함수
   */
  const saveSettings = async (newData) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'storeSettings', 'main'), newData);
    } catch (err) {
      console.error("저장 에러:", err);
    }
  };

  /**
   * 관리자 코드 확인
   */
  const handleVerifyPasscode = (e) => {
    e.preventDefault();
    if (passcodeInput === ADMIN_PASSCODE) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasscodeInput("");
    } else {
      alert("비밀 코드가 일치하지 않습니다.");
    }
  };

  /**
   * AI 기능 핸들러
   */
  const handleGenerateIntro = async () => {
    setIsAiLoading(true);
    const aiText = await callGemini(`'${settings.name}' 식당을 위한 따뜻하고 매력적인 소개글 2문장을 써줘.`);
    if (aiText) setSettings({ ...settings, introText: aiText.trim() });
    setIsAiLoading(false);
  };

  const handleGenerateMenuDesc = async (index) => {
    const menuItem = settings.menuItems[index];
    if (!menuItem.name) return;
    setIsAiLoading(true);
    const aiText = await callGemini(`'${menuItem.name}' 메뉴에 대한 입맛 돋우는 한 줄 문구를 써줘.`);
    if (aiText) {
      const newItems = [...settings.menuItems];
      newItems[index].desc = aiText.trim();
      setSettings({ ...settings, menuItems: newItems });
    }
    setIsAiLoading(false);
  };

  /**
   * 찜하기 기능
   */
  const toggleLike = async (menuId) => {
    if (myLikes.includes(menuId)) return;
    const newMenuItems = settings.menuItems.map(item => {
      if (item.id === menuId) return { ...item, likes: (item.likes || 0) + 1 };
      return item;
    });
    const newMyLikes = [...myLikes, menuId];
    setMyLikes(newMyLikes);
    localStorage.setItem(`likes_${appId}`, JSON.stringify(newMyLikes));
    const newSettings = { ...settings, menuItems: newMenuItems };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // 필터링된 메뉴
  const filteredMenu = activeCategory === "전체" 
    ? settings.menuItems 
    : settings.menuItems.filter(item => item.category === activeCategory);

  const daysOrder = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  const scrollToAdminSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollMenu = (direction) => {
    if (menuScrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      menuScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-400 font-bold tracking-widest">CONNECTING...</div>;

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 font-sans selection:bg-orange-100 scroll-smooth overflow-x-hidden">
      
      {/* 애니메이션 스타일 */}
      <style>{`
        @keyframes scrollMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { display: flex; width: max-content; animation: scrollMarquee 40s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* [서비스 화면] */}
      <div className={`${isAdminMode ? 'hidden' : 'block animate-in fade-in duration-1000'}`}>
        
        {/* 메인 히어로 섹션 */}
        <header className="relative h-[80vh] md:h-[90vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0 bg-black">
            <img src={settings.introImg} alt="배경" className="w-full h-full object-cover opacity-60 transition-transform duration-1000" />
          </div>
          <div className="relative z-10 text-center px-4 max-w-4xl animate-in slide-in-from-top-12 duration-1000 text-white">
            <div className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-[10px] font-black tracking-widest uppercase mb-6">Authentic Taste</div>
            <h1 className="text-6xl md:text-9xl font-black mb-8 drop-shadow-2xl tracking-tighter italic break-keep">{settings.name}</h1>
            <p className="text-lg md:text-2xl font-medium max-w-2xl mx-auto drop-shadow-lg leading-relaxed px-4 break-keep">{settings.introText}</p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 space-y-32">
          {/* 영업 안내 섹션 */}
          <section className="animate-in slide-in-from-bottom-12 duration-700">
            <div className="flex items-center gap-2 mb-8 justify-center sm:justify-start">
              <Clock className="text-orange-600" size={24} />
              <h2 className="text-2xl font-black tracking-tighter uppercase">영업 정보</h2>
            </div>
            <div className="bg-white rounded-[2.5rem] p-3 shadow-2xl border border-gray-100 overflow-x-auto no-scrollbar">
              <div className="flex divide-x divide-gray-50 min-w-max sm:min-w-0 sm:w-full">
                {daysOrder.map((day) => {
                  const info = settings.openingHours[day];
                  const isToday = daysOrder[new Date().getDay()] === day;
                  return (
                    <div key={day} className={`flex-1 min-w-[110px] p-6 text-center transition-all ${isToday ? 'bg-orange-500 rounded-3xl text-white shadow-xl shadow-orange-100 z-10' : ''}`}>
                      <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isToday ? 'text-white/80' : 'text-gray-300'}`}>{day}</div>
                      <div className={`text-base font-black ${info.active ? (isToday ? 'text-white' : 'text-gray-900') : 'text-red-400 opacity-60'}`}>
                        {info.active ? <div className="flex flex-col gap-1"><span>{info.open}</span><div className={`w-3 h-[1px] mx-auto ${isToday ? 'bg-white/30' : 'bg-gray-100'}`}></div><span>{info.close}</span></div> : "휴무"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 메뉴판 섹션 */}
          <section id="menu-list" className="scroll-mt-24">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
              <div className="text-center lg:text-left">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 break-keep">맛있는 메뉴판</h2>
                <p className="text-gray-400 font-medium break-keep text-sm">더블 클릭으로 메뉴를 찜하고 좌우로 밀어서 모든 메뉴를 확인하세요.</p>
              </div>
              <div className="relative flex-1 max-w-md lg:max-w-none">
                <div className="flex items-center justify-center lg:justify-end gap-2 mb-2 overflow-x-auto no-scrollbar px-2">
                  {settings.categories.map((cat) => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-8 py-3 rounded-full text-xs font-black whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-gray-900 border-gray-900 text-white shadow-xl scale-105' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}>{cat}</button>
                  ))}
                </div>
                <div className="h-1 bg-gray-100 rounded-full mx-auto lg:ml-auto lg:mr-0 w-48 relative overflow-hidden">
                  <div className="absolute h-full bg-gray-900 rounded-full transition-all duration-500" style={{ width: `${100 / settings.categories.length}%`, left: `${(settings.categories.indexOf(activeCategory) / settings.categories.length) * 100}%` }}></div>
                </div>
              </div>
            </div>

            {/* 가로 스크롤 메뉴 리스트 */}
            <div className="relative group">
              <div ref={menuScrollRef} className="flex overflow-x-auto gap-4 md:gap-8 pb-12 px-4 -mx-4 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing">
                {filteredMenu.map((item) => (
                  <div key={item.id} onDoubleClick={() => toggleLike(item.id)} className={`flex-none w-[280px] sm:w-[320px] md:w-[340px] lg:w-[280px] snap-center relative flex flex-col p-6 rounded-[3rem] bg-white border border-gray-100 shadow-sm transition-all duration-500 select-none hover:shadow-2xl hover:-translate-y-2 ${item.isRecommended ? 'ring-2 ring-orange-200 border-orange-200' : ''}`}>
                    {item.isRecommended && <div className="absolute top-6 left-10 bg-orange-600 text-white px-3 py-1 rounded-full text-[9px] font-black tracking-widest flex items-center gap-1 shadow-lg z-20"><Star size={10} fill="white" /> BEST</div>}
                    <div className="w-full aspect-square rounded-[2rem] overflow-hidden mb-6 relative shadow-md bg-gray-50 shrink-0">
                      <img src={item.img || "https://via.placeholder.com/400x400?text=사진 없음"} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                      <div className="absolute top-4 right-4">
                        <button onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }} className={`p-3 rounded-full backdrop-blur-xl transition-all shadow-lg ${myLikes.includes(item.id) ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-400 hover:text-red-500'}`}><Heart size={16} fill={myLikes.includes(item.id) ? "currentColor" : "none"} /></button>
                      </div>
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">{item.category}</span>
                      <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight break-keep line-clamp-1">{item.name}</h3>
                      <div className="min-h-[3.5rem]"><p className="text-gray-400 text-xs line-clamp-2 leading-relaxed break-keep font-medium">{item.desc || "메뉴 설명이 곧 추가될 예정입니다."}</p></div>
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50"><span className="text-2xl font-black text-gray-900 tracking-tighter italic">{item.price}<span className="text-xs ml-1 font-bold not-italic text-gray-300">원</span></span><div className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full text-[10px] font-black text-gray-400"><Heart size={10} className={myLikes.includes(item.id) ? 'text-red-500' : ''} fill={myLikes.includes(item.id) ? "currentColor" : "none"} />{item.likes || 0}</div></div>
                    </div>
                  </div>
                ))}
                {filteredMenu.length === 0 && <div className="w-full py-40 flex flex-col items-center justify-center text-gray-300"><Utensils size={48} className="mb-4 opacity-20" /><p className="font-black text-lg">준비된 메뉴가 없습니다.</p></div>}
              </div>
              {filteredMenu.length > 3 && <><button onClick={() => scrollMenu('left')} className="absolute top-[40%] -left-6 p-5 bg-white rounded-full shadow-2xl text-gray-400 hover:text-gray-900 z-30 transition-all hidden lg:block border border-gray-100"><ChevronLeft size={32} strokeWidth={1.5} /></button><button onClick={() => scrollMenu('right')} className="absolute top-[40%] -right-6 p-5 bg-white rounded-full shadow-2xl text-gray-400 hover:text-gray-900 z-30 transition-all hidden lg:block border border-gray-100"><ChevronRight size={32} strokeWidth={1.5} /></button></>}
            </div>
          </section>

          {/* 리뷰 무한 슬라이드 */}
          <section className="relative overflow-hidden py-10">
            <div className="text-center mb-16 px-4"><h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 break-keep uppercase">손님들의 이야기</h2></div>
            <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-[#fafafa] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-[#fafafa] to-transparent z-10 pointer-events-none"></div>
            <div className="flex animate-marquee gap-8">
              {[...settings.reviews, ...settings.reviews].map((rev, i) => (
                <div key={i} className="w-[350px] sm:w-[450px] bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-sm relative shrink-0">
                  <Quote className="absolute -top-4 -right-4 text-gray-50" size={120} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-5 mb-6">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-300 text-xl border border-white shadow-inner uppercase shrink-0">{rev.author?.[0]}</div>
                      <div><div className="text-base font-black text-gray-900">{rev.author}</div><div className="flex text-orange-400 mt-0.5">{[...Array(5)].map((_, starI) => (<Star key={starI} size={12} fill={starI < (rev.rating || 5) ? "currentColor" : "none"} />))}</div></div>
                    </div>
                    <p className="text-lg text-gray-700 leading-relaxed font-medium italic break-keep line-clamp-3">"{rev.text}"</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 오시는 길 섹션 */}
          <section id="map-area" className="pb-32">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-6">
              <h2 className="text-4xl font-black tracking-tighter flex items-center gap-3"><MapPin className="text-orange-600" size={32} /> 오시는 길</h2>
              {settings.naverReviewUrl && <a href={settings.naverReviewUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-[#2DB400] text-white rounded-full text-sm font-black shadow-2xl hover:scale-105 transition-transform">네이버 리뷰 보기</a>}
            </div>
            <div className="aspect-video bg-gray-100 rounded-[4rem] border-[12px] border-white shadow-2xl flex items-center justify-center text-gray-200 font-black text-2xl relative"><MapPin size={64} className="text-orange-500 animate-bounce" /><span className="tracking-tighter uppercase italic ml-4">지도 데이터 연결 중</span></div>
          </section>
        </div>
        
        <footer className="bg-gray-900 py-20 px-4 text-center">
            <h2 className="text-white text-3xl font-black tracking-tighter mb-4 italic opacity-80">{settings.name}</h2>
            <p className="text-gray-500 text-sm font-bold">© 2024 {settings.name}. All Rights Reserved.</p>
        </footer>
      </div>

      {/* [관리자 페이지] - 전면 한글화 및 별점 선택 */}
      {isAdminMode && (
        <div className="fixed inset-0 z-[200] bg-[#f8f9ff] overflow-y-auto animate-in slide-in-from-right duration-500">
          <div className="max-w-4xl mx-auto px-6 py-12">
            
            <header className="sticky top-0 z-50 flex flex-col bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 mb-12">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4"><div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl"><Settings size={28} /></div><div><h2 className="text-2xl font-black text-gray-900">가게 관리 대시보드</h2><p className="text-[10px] text-gray-400 font-black uppercase">Store Manager Panel</p></div></div>
                <button onClick={() => setIsAdminMode(false)} className="p-4 bg-gray-50 rounded-full hover:bg-gray-100 transition-all"><X size={28}/></button>
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
                <button onClick={() => scrollToAdminSection(adminCategoryRef)} className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-xs font-black hover:bg-indigo-600 hover:text-white transition-all whitespace-nowrap shadow-sm"><LayoutGrid size={14}/> 카테고리</button>
                <button onClick={() => scrollToAdminSection(adminMenuRef)} className="flex items-center gap-2 px-6 py-3 bg-orange-50 text-orange-600 rounded-2xl text-xs font-black hover:bg-orange-600 hover:text-white transition-all whitespace-nowrap shadow-sm"><MenuIcon size={14}/> 메뉴 관리</button>
                <button onClick={() => scrollToAdminSection(adminReviewRef)} className="flex items-center gap-2 px-6 py-3 bg-green-50 text-green-600 rounded-2xl text-xs font-black hover:bg-green-600 hover:text-white transition-all whitespace-nowrap shadow-sm"><MessageSquare size={14}/> 리뷰 관리</button>
                <button onClick={() => scrollToAdminSection(adminBrandingRef)} className="flex items-center gap-2 px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl text-xs font-black hover:bg-gray-900 hover:text-white transition-all whitespace-nowrap shadow-sm"><Info size={14}/> 가게 정보</button>
              </div>
            </header>

            <div className="space-y-24 pb-40">
              {/* 1. 카테고리 관리 */}
              <section ref={adminCategoryRef} className="space-y-8 scroll-mt-60">
                <div className="flex items-center gap-3"><div className="w-2 h-8 bg-indigo-500 rounded-full"></div><h3 className="text-xl font-black tracking-tighter">메뉴 카테고리 구성</h3></div>
                <div className="p-10 bg-white rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                  <div className="flex gap-3"><input type="text" id="cat-in-final" placeholder="카테고리명 입력" className="flex-1 p-5 rounded-2xl bg-gray-50 outline-none font-bold" /><button onClick={() => { const input = document.getElementById('cat-in-final'); if(input.value) { setSettings({...settings, categories: [...settings.categories, input.value]}); input.value = ""; } }} className="px-8 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">추가</button></div>
                  <div className="flex flex-wrap gap-3">{settings.categories.map((cat, i) => (<div key={i} className="px-5 py-3 bg-indigo-50 text-indigo-700 rounded-2xl text-sm font-black flex items-center gap-3 border border-indigo-100/50">{cat}{cat !== "전체" && <button onClick={() => setSettings({...settings, categories: settings.categories.filter(c => c !== cat)})} className="hover:text-red-500 transition-colors"><X size={16}/></button>}</div>))}</div>
                </div>
              </section>

              {/* 2. 메뉴 관리 */}
              <section ref={adminMenuRef} className="space-y-8 scroll-mt-60">
                <div className="flex items-center gap-3"><div className="w-2 h-8 bg-orange-500 rounded-full"></div><h3 className="text-xl font-black tracking-tighter">전체 메뉴 리스트 관리</h3></div>
                <div className="space-y-6">
                  {settings.menuItems.map((item, idx) => (
                    <div key={item.id} className={`p-8 bg-white rounded-[3rem] border-2 transition-all ${item.isRecommended ? 'border-orange-500/30 ring-8 ring-orange-50' : 'border-gray-50'}`}>
                      <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-4"><span className="px-3 py-1 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase">ITEM #{idx+1}</span><label className="flex items-center gap-2 cursor-pointer font-bold text-sm"><input type="checkbox" checked={item.isRecommended} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].isRecommended = e.target.checked; setSettings({...settings, menuItems: ni}); }} className="w-4 h-4" /> 추천 메뉴 지정</label></div><button onClick={() => { const ni = [...settings.menuItems]; ni.splice(idx, 1); setSettings({...settings, menuItems: ni}); }} className="p-2 text-red-300 hover:scale-110 transition-transform"><Trash2 size={24} /></button></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4"><input value={item.name} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].name = e.target.value; setSettings({...settings, menuItems: ni}); }} placeholder="메뉴명" className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold" /><input value={item.price} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].price = e.target.value; setSettings({...settings, menuItems: ni}); }} placeholder="가격" className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold" /><select value={item.category} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].category = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold shadow-inner">{settings.categories.filter(c => c !== "전체").map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                      <div className="flex gap-2 mb-6"><textarea value={item.desc} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].desc = e.target.value; setSettings({...settings, menuItems: ni}); }} placeholder="메뉴 설명" className="flex-1 p-4 rounded-2xl bg-gray-50 outline-none text-sm min-h-[80px]" /><button onClick={() => handleGenerateMenuDesc(idx)} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl self-end shadow-sm hover:bg-indigo-600 hover:text-white transition-all"><Sparkles size={20} /></button></div>
                      <div className="flex items-center gap-6"><div className="w-20 h-20 rounded-3xl bg-gray-100 overflow-hidden border-2 border-white shadow-xl shrink-0">{item.img ? <img src={item.img} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-[10px]">사진 없음</div>}</div><label className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black cursor-pointer shadow-lg hover:scale-105 transition-all">사진 업로드 <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, (url) => { const ni = [...settings.menuItems]; ni[idx].img = url; setSettings({...settings, menuItems: ni}); })} /></label></div>
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, menuItems: [...settings.menuItems, {id: Date.now(), name: "새 메뉴", price: "0", desc: "", category: settings.categories[1] || "추천메뉴", isRecommended: false, likes: 0}]})} className="w-full py-14 border-4 border-dashed border-gray-100 rounded-[4rem] text-gray-300 hover:border-orange-200 transition-all font-black flex items-center justify-center gap-3 text-xl"><Plus size={40} /> 메뉴 추가하기</button>
                </div>
              </section>

              {/* 3. 리뷰 관리 (별점 선택 기능 포함) */}
              <section ref={adminReviewRef} className="space-y-8 scroll-mt-60">
                <div className="flex items-center gap-3"><div className="w-2 h-8 bg-green-500 rounded-full shadow-lg"></div><h3 className="text-xl font-black tracking-tighter">리뷰 섹션 관리</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {settings.reviews && settings.reviews.map((rev, idx) => (
                    <div key={idx} className="p-8 bg-white rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                      <div className="flex justify-between items-center"><span className="text-xs font-black text-green-600">Reviewer #{idx+1}</span><button onClick={() => { const nr = [...settings.reviews]; nr.splice(idx, 1); setSettings({...settings, reviews: nr}); }} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button></div>
                      <div className="grid grid-cols-2 gap-4"><input value={rev.author} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].author = e.target.value; setSettings({...settings, reviews: nr}); }} placeholder="작성자 이름" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm shadow-inner" /><select value={rev.rating || 5} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].rating = parseInt(e.target.value); setSettings({...settings, reviews: nr}); }} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm shadow-inner"><option value="5">⭐⭐⭐⭐⭐ (5점)</option><option value="4">⭐⭐⭐⭐ (4점)</option><option value="3">⭐⭐⭐ (3점)</option><option value="2">⭐⭐ (2점)</option><option value="1">⭐ (1점)</option></select></div>
                      <div className="flex gap-2"><textarea value={rev.text} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].text = e.target.value; setSettings({...settings, reviews: nr}); }} placeholder="리뷰 본문" className="flex-1 p-4 bg-gray-50 rounded-2xl border-none text-sm min-h-[80px] shadow-inner" /><button onClick={() => { const review = settings.reviews[idx]; if (!review.text) return; setIsAiLoading(true); callGemini(`다음 리뷰를 멋지게 다듬어줘: "${review.text}"`).then(txt => { const nr = [...settings.reviews]; nr[idx].text = txt.trim(); setSettings({...settings, reviews: nr}); }).finally(() => setIsAiLoading(false)); }} className="p-4 bg-white border border-indigo-100 rounded-2xl text-indigo-600 self-end transition-all hover:bg-indigo-600 hover:text-white shadow-sm"><Sparkles size={20}/></button></div>
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, reviews: [...(settings.reviews || []), {author: "단골 손님", rating: 5, text: "", img: ""}]})} className="min-h-[200px] border-4 border-dashed border-gray-100 rounded-[3rem] text-gray-200 hover:text-green-500 transition-all flex items-center justify-center font-black text-lg"><Plus size={48} /> 리뷰 추가</button>
                </div>
              </section>

              {/* 4. 브랜딩 설정 */}
              <section ref={adminBrandingRef} className="space-y-8 scroll-mt-60">
                <div className="flex items-center gap-3"><div className="w-2 h-8 bg-gray-900 rounded-full"></div><h3 className="text-xl font-black tracking-tighter">가게 정보 및 브랜딩</h3></div>
                <div className="p-10 bg-white rounded-[4rem] shadow-sm border border-gray-100 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-2"><label className="text-xs font-black text-gray-400 ml-1">상호명 (가게 이름)</label><input value={settings.name} onChange={(e) => setSettings({...settings, name: e.target.value})} className="w-full p-5 bg-gray-50 border-none rounded-2xl font-black text-2xl outline-none shadow-inner" /></div><div className="space-y-2"><label className="text-xs font-black text-gray-400 ml-1">네이버 리뷰 주소</label><input value={settings.naverReviewUrl} onChange={(e) => setSettings({...settings, naverReviewUrl: e.target.value})} placeholder="네이버 스마트플레이스 URL" className="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold shadow-inner" /></div></div>
                  <div className="space-y-4"><div className="flex justify-between items-center"><label className="text-xs font-black text-gray-400 px-1">메인 배너 사진</label><button onClick={handleGenerateIntro} className="text-indigo-600 flex items-center gap-2 font-black text-xs hover:underline"><Sparkles size={14}/> AI로 소개문구 자동 생성</button></div><div className="flex flex-col sm:flex-row gap-8 items-center"><div className="w-full sm:w-64 aspect-video rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl shrink-0"><img src={settings.introImg} className="w-full h-full object-cover" /></div><label className="w-full h-32 flex flex-col items-center justify-center border-4 border-dashed border-gray-50 rounded-[2rem] cursor-pointer hover:bg-gray-50 transition-all text-gray-300"><Upload size={32} /><span className="text-[10px] mt-2 font-black uppercase">배너 사진 업로드</span><input type="file" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setSettings({...settings, introImg: url}))} /></label></div></div>
                  <div className="space-y-2"><label className="text-xs font-black text-gray-400 ml-1">메인 홍보 문구</label><textarea value={settings.introText} onChange={(e) => setSettings({...settings, introText: e.target.value})} className="w-full p-6 bg-gray-50 border-none rounded-[2rem] text-base font-medium min-h-[120px] shadow-inner" /></div>
                </div>
              </section>

              <div className="pt-20 flex flex-col sm:flex-row gap-4"><button onClick={() => { saveSettings(settings); setIsAdminMode(false); }} className="flex-1 bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-2xl hover:bg-indigo-700 shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-95 uppercase shadow-indigo-100"><Save size={28} /> 모든 설정 저장 후 대시보드 종료</button></div>
            </div>
          </div>
        </div>
      )}

      {/* [인증 모달] */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[300] bg-gray-900/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[4rem] p-12 shadow-2xl text-center">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10"><Lock size={40} /></div>
            <h3 className="text-3xl font-black mb-4 tracking-tighter text-gray-900">사장님 전용 접속</h3>
            <p className="text-sm text-gray-400 mb-10 font-bold uppercase tracking-widest">비밀 코드를 입력해 주세요</p>
            <form onSubmit={handleVerifyPasscode} className="space-y-6"><input type="password" placeholder="••••" required autoFocus value={passcodeInput} onChange={(e) => setPasscodeInput(e.target.value)} className="w-full p-6 bg-gray-100 rounded-3xl text-center text-4xl font-black tracking-[0.5em] outline-none shadow-inner focus:ring-4 ring-indigo-500/10 transition-all" /><button type="submit" className="w-full bg-gray-900 text-white py-6 rounded-3xl font-black text-xl active:scale-95 transition-all shadow-2xl">확인</button><button type="button" onClick={() => setIsAuthModalOpen(false)} className="w-full text-gray-300 text-xs font-black py-2 hover:text-gray-500">취소</button></form>
          </div>
        </div>
      )}

      {/* [관리자 진입 버튼] */}
      {!isAdminMode && (
        <button onClick={() => setIsAuthModalOpen(true)} className="fixed bottom-6 right-6 p-3 text-gray-200 hover:text-gray-900 transition-all z-[100] opacity-5 hover:opacity-100 bg-white/50 backdrop-blur rounded-full shadow-sm"><Settings size={14} /></button>
      )}
    </div>
  );
};

export default App;