import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
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
  Settings, 
  MapPin, 
  Utensils, 
  Clock, 
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
const apiKey = ""; // Gemini AI API 키 (필요 시 입력)

// --- 사장님이 주신 Firebase 설정값 적용 완료 ---
const firebaseConfig = {
  apiKey: "AIzaSyAMOfzHa8q_rrJnOTEUlXvDtmSSOG3rbwk",
  authDomain: "storename-fd521.firebaseapp.com",
  projectId: "storename-fd521",
  storageBucket: "storename-fd521.firebasestorage.app",
  messagingSenderId: "84170436191",
  appId: "1:84170436191:web:5ef6bb52029e816a6675ea",
  measurementId: "G-KDEB5Y2Q7Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "cheonggung-web-01"; // 고유 식별자

const callGemini = async (prompt) => {
  if (!apiKey) return "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) { return ""; }
};

const handleImageUpload = (e, callback) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
  }
};

const App = () => {
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

  const [settings, setSettings] = useState({
    name: "청궁 (靑宮)",
    introImg: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=1200",
    introImgScale: 100,
    introText: "30년 전통의 중식 명가. 정성을 다한 한 끼를 대접합니다.",
    naverReviewUrl: "", 
    categories: ["전체", "면류", "요리류", "세트"],
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

  useEffect(() => {
    onAuthStateChanged(auth, async (u) => {
      if (!u) { 
        try { await signInAnonymously(auth); } catch(e){ console.error("인증 실패", e); } 
      }
      setUser(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'storeSettings', 'main');
    const unsubscribe = onSnapshot(settingsDoc, (snapshot) => {
      if (snapshot.exists()) setSettings(prev => ({ ...prev, ...snapshot.data() }));
    }, (error) => console.error("데이터 로드 실패", error));
    const savedLikes = localStorage.getItem(`likes_${appId}`);
    if (savedLikes) setMyLikes(JSON.parse(savedLikes));
    return () => unsubscribe();
  }, [user]);

  const saveSettings = async (newData) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'storeSettings', 'main'), newData);
    } catch (err) { console.error("저장 실패", err); }
  };

  const handleVerifyPasscode = (e) => {
    e.preventDefault();
    if (passcodeInput === ADMIN_PASSCODE) {
      setIsAdminMode(true); setIsAuthModalOpen(false); setPasscodeInput("");
    } else { alert("비밀 코드가 틀렸습니다."); }
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

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-orange-500" size={48} />
        <p className="text-gray-400 font-bold tracking-widest uppercase">서버 연결 중...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 overflow-x-hidden">
      
      {/* [서비스 화면] */}
      <div className={`${isAdminMode ? 'hidden' : 'block animate-in fade-in duration-700'}`}>
        
        {/* 히어로 섹션 - 텍스트 크기 및 이미지 배치 교정 */}
        <header className="relative h-[80vh] md:h-[90vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0 bg-black">
            <img 
              src={settings.introImg} 
              alt="배경" 
              className="w-full h-full object-cover opacity-60 transition-transform duration-1000"
            />
          </div>
          <div className="relative z-10 text-center px-4 text-white max-w-5xl">
            <div className="inline-block px-4 py-1 bg-white/10 backdrop-blur rounded-full text-[10px] md:text-xs font-bold uppercase mb-6 tracking-widest border border-white/20">Authentic Choice</div>
            <h1 className="text-5xl md:text-8xl lg:text-9xl font-black mb-8 drop-shadow-2xl italic break-keep tracking-tighter leading-[1.1]">
              {settings.name}
            </h1>
            <p className="text-base md:text-2xl font-medium max-w-2xl mx-auto drop-shadow-lg break-keep opacity-90 leading-relaxed px-4">
              {settings.introText}
            </p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 space-y-32">
          
          {/* 영업 정보 */}
          <section className="animate-in slide-in-from-bottom-8">
            <h2 className="text-xl md:text-2xl font-black mb-10 flex items-center gap-3 uppercase tracking-tight px-2">
              <div className="w-1.5 h-6 bg-orange-600 rounded-full"></div> 영업 정보
            </h2>
            <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-4 shadow-2xl border border-gray-100 overflow-x-auto no-scrollbar">
              <div className="flex divide-x divide-gray-50 min-w-max md:min-w-0 md:w-full">
                {daysOrder.map((day) => {
                  const info = settings.openingHours[day];
                  const isToday = daysOrder[new Date().getDay()] === day;
                  return (
                    <div key={day} className={`flex-1 min-w-[110px] p-8 text-center transition-all ${isToday ? 'bg-orange-500 rounded-3xl text-white shadow-xl shadow-orange-200 z-10' : ''}`}>
                      <div className={`text-[10px] font-black uppercase mb-4 ${isToday ? 'text-white/80' : 'text-gray-300'}`}>{day}</div>
                      <div className="text-sm md:text-base font-bold">
                        {info.active ? <div className="leading-snug">{info.open}<br/><span className="text-[10px] opacity-30 font-normal py-1 block">~</span>{info.close}</div> : <span className="text-red-400">휴무</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 메뉴판 섹션 - 카드 크기 일관성 보정 */}
          <section id="menu-list" className="scroll-mt-24">
            <div className="flex flex-col lg:flex-row justify-between items-end mb-16 gap-8 px-4">
              <div className="w-full lg:w-auto text-center lg:text-left">
                <h2 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter break-keep">맛있는 메뉴판</h2>
                <p className="text-gray-400 text-sm md:text-base break-keep">사장님이 직접 엄선한 메뉴들을 만나보세요.</p>
              </div>
              <div className="w-full lg:w-auto overflow-x-auto no-scrollbar py-2">
                <div className="flex gap-2 justify-center lg:justify-end">
                  {settings.categories.map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => setActiveCategory(cat)} 
                      className={`px-8 py-3 rounded-full text-xs md:text-sm font-bold border transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-black border-black text-white shadow-xl scale-105' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative group px-2">
              <div 
                ref={menuScrollRef} 
                className="flex overflow-x-auto gap-6 md:gap-10 pb-16 px-2 -mx-2 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing"
              >
                {filteredMenu.map(item => (
                  <div 
                    key={item.id} 
                    onDoubleClick={() => toggleLike(item.id)} 
                    className={`flex-none w-[280px] sm:w-[320px] snap-center bg-white p-6 rounded-[3rem] shadow-sm border border-gray-50 hover:shadow-2xl transition-all duration-500 flex flex-col ${item.isRecommended ? 'ring-2 ring-orange-200 border-orange-200' : ''}`}
                    style={{ height: '520px' }} // 모든 카드 높이 고정
                  >
                    <div className="relative aspect-square rounded-[2.5rem] overflow-hidden mb-8 shadow-md bg-gray-50 shrink-0">
                      <img src={item.img || "https://via.placeholder.com/400"} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                      <button onClick={() => toggleLike(item.id)} className={`absolute top-5 right-5 p-3 rounded-full backdrop-blur-md shadow-lg transition-all ${myLikes.includes(item.id) ? 'bg-red-500 text-white scale-110' : 'bg-white/80 text-gray-400 hover:text-red-500'}`}>
                        <Heart size={20} fill={myLikes.includes(item.id) ? "white" : "none"}/>
                      </button>
                      {item.isRecommended && (
                        <div className="absolute top-5 left-5 bg-orange-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg border border-orange-500">BEST</div>
                      )}
                    </div>
                    
                    <div className="flex flex-col flex-1 px-1 overflow-hidden">
                      <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-2">{item.category}</span>
                      <h3 className="text-2xl font-black text-gray-900 mb-3 line-clamp-1 break-keep">{item.name}</h3>
                      <div className="flex-1">
                        <p className="text-gray-400 text-sm line-clamp-3 break-keep font-medium leading-relaxed">{item.desc || "메뉴에 대한 정성스러운 설명이 곧 추가됩니다."}</p>
                      </div>
                      <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center shrink-0">
                        <span className="text-2xl font-black italic tracking-tighter text-gray-900">{item.price}<span className="text-xs ml-1 font-bold not-italic text-gray-300 uppercase">KRW</span></span>
                        <div className="flex items-center gap-1.5 bg-gray-50 px-4 py-1.5 rounded-full">
                          <Heart size={12} className="text-red-400" fill="currentColor"/>
                          <span className="text-[11px] text-gray-400 font-black">{item.likes || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredMenu.length > 3 && (
                <>
                  <button onClick={() => scrollMenu('left')} className="absolute top-[40%] -left-6 p-5 bg-white rounded-full shadow-2xl text-gray-400 hover:text-black hidden lg:block border border-gray-100 transition-all hover:scale-110 z-30">
                    <ChevronLeft size={32} strokeWidth={2.5}/>
                  </button>
                  <button onClick={() => scrollMenu('right')} className="absolute top-[40%] -right-6 p-5 bg-white rounded-full shadow-2xl text-gray-400 hover:text-black hidden lg:block border border-gray-100 transition-all hover:scale-110 z-30">
                    <ChevronRight size={32} strokeWidth={2.5}/>
                  </button>
                </>
              )}
            </div>
          </section>

          {/* 리뷰 슬라이드 */}
          <section className="relative overflow-hidden py-10 bg-white rounded-[4rem] md:rounded-[6rem] shadow-sm border border-gray-50">
            <div className="text-center mb-20 px-4">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 uppercase">Customer Feedback</h2>
              <p className="text-gray-400 font-medium italic break-keep">손님들이 들려주시는 소중한 한마디</p>
            </div>
            <div className="flex animate-marquee gap-8 md:gap-12">
              {(settings.reviews.length > 0 ? [...settings.reviews, ...settings.reviews] : []).map((rev, i) => (
                <div key={i} className="w-[320px] md:w-[480px] bg-[#fafafa] p-10 md:p-14 rounded-[4rem] md:rounded-[5rem] border border-gray-100 shadow-inner shrink-0 flex flex-col justify-between">
                  <div className="relative">
                    <Quote className="absolute -top-6 -right-6 text-gray-200 opacity-30" size={100} />
                    <div className="flex items-center gap-5 mb-10 relative z-10">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center font-black text-orange-600 text-2xl border border-gray-100 shadow-sm uppercase shrink-0">
                        {rev.author?.[0]}
                      </div>
                      <div>
                        <div className="font-black text-xl text-gray-900">{rev.author}</div>
                        <div className="flex text-orange-400 text-sm mt-1.5">
                          {[...Array(5)].map((_, s) => <Star key={s} size={16} fill={s < (rev.rating || 5) ? "currentColor" : "none"} />)}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 italic break-keep leading-relaxed text-lg md:text-xl font-medium">"{rev.text}"</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 오시는 길 */}
          <section id="map-area" className="pb-32 px-2">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-8 text-center sm:text-left">
              <div>
                <h2 className="text-4xl font-black tracking-tighter flex items-center gap-4 justify-center sm:justify-start">
                  <MapPin className="text-orange-600" size={36} /> 오시는 길
                </h2>
                <p className="text-gray-400 mt-3 font-medium text-lg">서울특별시 강남구 맛집로 88길 1층 청궁</p>
              </div>
              {settings.naverReviewUrl && (
                <a href={settings.naverReviewUrl} target="_blank" rel="noopener noreferrer" className="px-12 py-5 bg-[#2DB400] text-white rounded-full text-base font-black shadow-2xl hover:scale-105 transition-all flex items-center gap-3">
                  <MessageSquare size={20}/> 네이버 리뷰 보기
                </a>
              )}
            </div>
            <div className="aspect-video bg-gray-100 rounded-[3.5rem] md:rounded-[5rem] border-[16px] border-white shadow-2xl flex flex-col items-center justify-center text-gray-200 font-black text-2xl relative overflow-hidden">
              <MapPin size={80} className="text-orange-500 animate-bounce mb-6" />
              <span className="tracking-widest uppercase italic opacity-40">Map API Integration Ready</span>
            </div>
          </section>
        </div>

        <footer className="bg-gray-900 text-white py-24 text-center px-4">
          <h2 className="text-4xl font-black mb-6 italic opacity-80 tracking-tighter">{settings.name}</h2>
          <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-10 opacity-40">© 2024 {settings.name}. All Rights Reserved.</p>
          <div className="w-16 h-1 bg-orange-600 mx-auto rounded-full"></div>
        </footer>
      </div>

      {/* [관리자 페이지] */}
      {isAdminMode && (
        <div className="fixed inset-0 z-[200] bg-[#f8f9ff] overflow-y-auto animate-in slide-in-from-right duration-500">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <header className="sticky top-0 z-50 flex flex-col bg-white/90 backdrop-blur p-8 rounded-[3rem] shadow-xl border border-gray-100 mb-16">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl"><Settings size={28} /></div>
                  <h2 className="text-2xl font-black text-gray-900">가게 관리 센터</h2>
                </div>
                <button onClick={() => setIsAdminMode(false)} className="p-4 bg-gray-50 rounded-full hover:bg-gray-100 transition-all"><X size={28}/></button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <button onClick={() => scrollToAdminSection(adminCategoryRef)} className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-xs font-black whitespace-nowrap shadow-sm hover:bg-indigo-600 hover:text-white transition-all"><LayoutGrid size={14}/> 카테고리</button>
                <button onClick={() => scrollToAdminSection(adminMenuRef)} className="flex items-center gap-2 px-6 py-3 bg-orange-50 text-orange-600 rounded-2xl text-xs font-black whitespace-nowrap shadow-sm hover:bg-orange-600 hover:text-white transition-all"><MenuIcon size={14}/> 메뉴 관리</button>
                <button onClick={() => scrollToAdminSection(adminReviewRef)} className="flex items-center gap-2 px-6 py-3 bg-green-50 text-green-600 rounded-2xl text-xs font-black whitespace-nowrap shadow-sm hover:bg-green-600 hover:text-white transition-all"><MessageSquare size={14}/> 리뷰 관리</button>
                <button onClick={() => scrollToAdminSection(adminBrandingRef)} className="flex items-center gap-2 px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl text-xs font-black whitespace-nowrap shadow-sm hover:bg-gray-900 hover:text-white transition-all"><Info size={14}/> 정보 설정</button>
              </div>
            </header>

            <div className="space-y-24 pb-40">
              <section ref={adminCategoryRef} className="space-y-8 scroll-mt-60">
                <h3 className="text-xl font-black border-l-4 border-indigo-500 pl-4 tracking-tighter px-2">카테고리 구성</h3>
                <div className="p-10 bg-white rounded-[3.5rem] shadow-sm border border-gray-100 space-y-8">
                  <div className="flex gap-4"><input type="text" id="cat-final" placeholder="새 카테고리 이름" className="flex-1 p-5 rounded-2xl bg-gray-50 border-none outline-none font-bold shadow-inner focus:ring-4 ring-indigo-50" /><button onClick={() => { const input = document.getElementById('cat-final'); if(input.value) { setSettings({...settings, categories: [...settings.categories, input.value]}); input.value = ""; } }} className="px-10 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100">추가</button></div>
                  <div className="flex flex-wrap gap-3">{settings.categories.map((cat, i) => (<div key={i} className="px-6 py-3.5 bg-indigo-50 text-indigo-700 rounded-2xl text-sm font-black flex items-center gap-3 border border-indigo-100/50 shadow-sm">{cat}{cat !== "전체" && <button onClick={() => setSettings({...settings, categories: settings.categories.filter(c => c !== cat)})} className="hover:text-red-500 transition-colors"><X size={16}/></button>}</div>))}</div>
                </div>
              </section>

              <section ref={adminMenuRef} className="space-y-10 scroll-mt-60">
                <h3 className="text-xl font-black border-l-4 border-orange-500 pl-4 tracking-tighter px-2">전체 메뉴 관리</h3>
                <div className="space-y-8">
                  {settings.menuItems.map((item, idx) => (
                    <div key={item.id} className={`p-10 bg-white rounded-[4rem] border-2 transition-all ${item.isRecommended ? 'border-orange-500/30 ring-8 ring-orange-50' : 'border-gray-50 shadow-sm'}`}>
                      <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-4"><span className="px-4 py-1.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase">ITEM #{idx+1}</span><label className="flex items-center gap-2 cursor-pointer font-black text-orange-600 text-sm"><input type="checkbox" checked={item.isRecommended} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].isRecommended = e.target.checked; setSettings({...settings, menuItems: ni}); }} className="w-5 h-5 rounded-lg text-orange-500" /> 추천 메뉴</label></div><button onClick={() => { const ni = [...settings.menuItems]; ni.splice(idx, 1); setSettings({...settings, menuItems: ni}); }} className="p-3 text-red-300 hover:scale-110 transition-transform"><Trash2 size={28} /></button></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6"><div className="space-y-2"><label className="text-xs font-bold text-gray-400 ml-1">메뉴명</label><input value={item.name} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].name = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-5 bg-gray-50 border-none rounded-2xl font-bold shadow-inner" /></div><div className="space-y-2"><label className="text-xs font-bold text-gray-400 ml-1">가격</label><input value={item.price} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].price = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-5 bg-gray-50 border-none rounded-2xl font-bold shadow-inner" /></div><div className="space-y-2"><label className="text-xs font-bold text-gray-400 ml-1">카테고리</label><select value={item.category} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].category = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-5 bg-gray-50 border-none rounded-2xl font-bold shadow-inner appearance-none">{settings.categories.filter(c => c !== "전체").map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
                      <div className="space-y-2 mb-8"><label className="text-xs font-bold text-gray-400 ml-1">상세 설명</label><textarea value={item.desc} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].desc = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-6 bg-gray-50 border-none rounded-[2rem] text-sm font-medium min-h-[120px] shadow-inner leading-relaxed" /></div>
                      <div className="flex items-center gap-8"><div className="w-28 h-28 rounded-[2.5rem] bg-gray-100 overflow-hidden border-4 border-white shadow-xl shrink-0">{item.img ? <img src={item.img} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-xs uppercase">No Image</div>}</div><label className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-xs font-black cursor-pointer shadow-xl hover:scale-105 transition-all">메뉴 이미지 업로드 <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, (url) => { const ni = [...settings.menuItems]; ni[idx].img = url; setSettings({...settings, menuItems: ni}); })} /></label></div>
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, menuItems: [...settings.menuItems, {id: Date.now(), name: "새 메뉴", price: "0", desc: "", category: settings.categories[1] || "면류", isRecommended: false, likes: 0}]})} className="w-full py-20 border-4 border-dashed border-gray-100 rounded-[4rem] text-gray-300 hover:border-orange-200 transition-all font-black flex items-center justify-center gap-4 text-2xl hover:text-orange-500"><Plus size={48} /> 새로운 메뉴 추가하기</button>
                </div>
              </section>

              <div className="pt-20">
                <button onClick={() => { saveSettings(settings); setIsAdminMode(false); }} className="w-full bg-brand text-white py-10 rounded-[3.5rem] font-black text-3xl hover:brightness-110 shadow-2xl transition-all active:scale-95 uppercase flex items-center justify-center gap-5 shadow-orange-100">
                  <Save size={36}/> 설정 저장 및 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 인증 모달 */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-md rounded-[4rem] p-16 shadow-2xl text-center border border-white/20">
            <div className="w-28 h-28 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner"><Lock size={48} /></div>
            <h3 className="text-4xl font-black mb-6 tracking-tighter text-gray-900 italic">Master Gate</h3>
            <p className="text-gray-400 mb-12 font-bold uppercase tracking-widest text-sm">비밀 코드를 입력하세요</p>
            <form onSubmit={handleVerifyPasscode} className="space-y-8">
              <input type="password" placeholder="••••" required autoFocus value={passcodeInput} onChange={(e) => setPasscodeInput(e.target.value)} className="w-full p-8 bg-gray-50 rounded-[2rem] text-center text-5xl font-black tracking-[0.8em] outline-none shadow-inner focus:ring-4 ring-indigo-500/10 transition-all" />
              <button type="submit" className="w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black text-xl active:scale-95 transition-all shadow-2xl shadow-gray-200">인증 확인</button>
              <button type="button" onClick={() => setIsAuthModalOpen(false)} className="w-full text-gray-400 text-xs font-black py-2 hover:text-gray-600 uppercase tracking-widest">취소</button>
            </form>
          </div>
        </div>
      )}

      {/* 관리자 진입 */}
      {!isAdminMode && (
        <button onClick={() => setIsAuthModalOpen(true)} className="fixed bottom-10 right-10 p-5 text-gray-200 hover:text-gray-900 transition-all z-[100] opacity-5 hover:opacity-100 bg-white/50 backdrop-blur rounded-full shadow-2xl border border-white/50"><Settings size={20} /></button>
      )}
    </div>
  );
};

export default App;