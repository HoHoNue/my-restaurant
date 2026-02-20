import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken,
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

// --- Firebase 설정 (환경 변수 우선 사용) ---
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "본인의_API_KEY",
      authDomain: "본인의_PROJECT_ID.firebaseapp.com",
      projectId: "본인의_PROJECT_ID",
      storageBucket: "본인의_PROJECT_ID.appspot.com",
      messagingSenderId: "본인의_SENDER_ID",
      appId: "본인의_APP_ID"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Rule 1 준수를 위한 appId 설정
const appId = typeof __app_id !== 'undefined' ? __app_id : "my-restaurant-web-01";
const apiKey = ""; // Gemini API Key

const handleImageUpload = (e, callback) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
  }
};

const callGemini = async (prompt) => {
  if (!apiKey) return "API Key를 설정해 주세요.";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) {
    console.error(err);
    return "";
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
    name: "맛있는 가게",
    introImg: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200",
    introImgScale: 100,
    introText: "가게의 멋진 소개글을 입력해 보세요.",
    naverReviewUrl: "", 
    categories: ["전체", "대표메뉴"],
    openingHours: {
      sun: { open: "11:00", close: "21:00", active: true },
      mon: { open: "11:00", close: "21:00", active: true },
      tue: { open: "11:00", close: "21:00", active: true }, 
      wed: { open: "11:00", close: "21:00", active: true },
      thu: { open: "11:00", close: "21:00", active: true },
      fri: { open: "11:00", close: "21:00", active: true },
      sat: { open: "11:00", close: "21:00", active: true },
    },
    menuItems: [],
    reviews: []
  });

  const [myLikes, setMyLikes] = useState([]);

  // (1) Rule 3: 인증 초기화 및 상태 감시 (Auth FIRST)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Firebase 인증 오류:", err);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // (2) Rule 1 & Rule 3: 사용자 인증 후 데이터 가져오기
  useEffect(() => {
    if (!user) return;

    // Rule 1: 지정된 경로 구조 사용 (/artifacts/{appId}/public/data/{collectionName})
    const settingsDoc = doc(db, 'artifacts', appId, 'public', 'data', 'storeSettings', 'main');
    
    const unsubscribe = onSnapshot(settingsDoc, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(prev => ({ ...prev, ...snapshot.data() }));
      }
    }, (error) => {
      console.error("Firestore 수신 오류:", error);
    });

    const savedLikes = localStorage.getItem(`likes_${appId}`);
    if (savedLikes) setMyLikes(JSON.parse(savedLikes));

    return () => unsubscribe();
  }, [user]);

  const saveSettings = async (newData) => {
    if (!user) return;
    try {
      // Rule 1: 저장 시에도 동일한 경로 사용
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'storeSettings', 'main'), newData);
    } catch (err) {
      console.error("저장 오류:", err);
    }
  };

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

  const handleGenerateIntro = async () => {
    setIsAiLoading(true);
    const aiText = await callGemini(`'${settings.name}' 가게를 위한 친절한 소개글 2문장 써줘.`);
    if (aiText) setSettings({ ...settings, introText: aiText.trim() });
    setIsAiLoading(false);
  };

  const handleGenerateMenuDesc = async (index) => {
    const menuItem = settings.menuItems[index];
    if (!menuItem.name) return;
    setIsAiLoading(true);
    const aiText = await callGemini(`'${menuItem.name}' 메뉴에 대한 홍보 문구 한 줄 써줘.`);
    if (aiText) {
      const newItems = [...settings.menuItems];
      newItems[index].desc = aiText.trim();
      setSettings({ ...settings, menuItems: newItems });
    }
    setIsAiLoading(false);
  };

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

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-400 font-bold">서버 연결 중...</div>;

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 font-sans selection:bg-orange-100 scroll-smooth overflow-x-hidden">
      
      <style>{`
        @keyframes scrollMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { display: flex; width: max-content; animation: scrollMarquee 40s linear infinite; }
        .animate-marquee:hover { animation-play-state: paused; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* [서비스 화면] */}
      <div className={`${isAdminMode ? 'hidden' : 'block animate-in fade-in duration-1000'}`}>
        <header className="relative h-[80vh] md:h-[90vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0 bg-black">
            <img src={settings.introImg} alt="배경" className="w-full h-full object-cover opacity-60 transition-transform duration-1000" />
          </div>
          <div className="relative z-10 text-center px-4 max-w-4xl animate-in slide-in-from-top-12 duration-1000 text-white">
            <h1 className="text-6xl md:text-9xl font-black mb-8 drop-shadow-2xl tracking-tighter italic break-keep">{settings.name}</h1>
            <p className="text-lg md:text-2xl font-medium max-w-2xl mx-auto drop-shadow-lg leading-relaxed break-keep">{settings.introText}</p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 space-y-32">
          {/* 영업 안내 */}
          <section className="animate-in slide-in-from-bottom-12 duration-700">
            <div className="flex items-center gap-2 mb-8 justify-center sm:justify-start">
              <Clock className="text-orange-600" size={24} />
              <h2 className="text-2xl font-black tracking-tighter">영업 안내</h2>
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

          {/* 메뉴판 */}
          <section id="menu-list" className="scroll-mt-24">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
              <div className="text-center lg:text-left">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 break-keep">맛있는 메뉴판</h2>
                <p className="text-gray-400 font-medium break-keep text-sm">좌우로 밀어서 메뉴를 확인해 보세요.</p>
              </div>
              <div className="relative flex-1 max-w-md lg:max-w-none">
                <div className="flex items-center justify-center lg:justify-end gap-2 mb-2 overflow-x-auto no-scrollbar">
                  {settings.categories.map((cat) => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-8 py-3 rounded-full text-xs font-black whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-gray-900 border-gray-900 text-white shadow-xl scale-105' : 'bg-white border-gray-100 text-gray-400'}`}>{cat}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative group">
              <div ref={menuScrollRef} className="flex overflow-x-auto gap-4 md:gap-8 pb-12 px-4 -mx-4 snap-x snap-mandatory no-scrollbar">
                {filteredMenu.map((item) => (
                  <div key={item.id} onDoubleClick={() => toggleLike(item.id)} className={`flex-none w-[280px] sm:w-[320px] md:w-[340px] lg:w-[280px] snap-center relative flex flex-col p-6 rounded-[3rem] bg-white border border-gray-100 shadow-sm transition-all duration-500 select-none hover:shadow-2xl hover:-translate-y-2`}>
                    <div className="w-full aspect-square rounded-[2rem] overflow-hidden mb-6 relative shadow-md bg-gray-50 shrink-0">
                      <img src={item.img || "https://via.placeholder.com/400x400?text=이미지 없음"} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                      <div className="absolute top-4 right-4">
                        <button onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }} className={`p-3 rounded-full backdrop-blur-xl transition-all shadow-lg ${myLikes.includes(item.id) ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-400'}`}><Heart size={16} fill={myLikes.includes(item.id) ? "currentColor" : "none"} /></button>
                      </div>
                    </div>
                    <div className="flex flex-col flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight break-keep line-clamp-1">{item.name}</h3>
                      <div className="min-h-[3.5rem]"><p className="text-gray-400 text-xs line-clamp-2 leading-relaxed break-keep font-medium">{item.desc}</p></div>
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50"><span className="text-2xl font-black text-gray-900 tracking-tighter italic">{item.price}<span className="text-xs ml-1 font-bold not-italic text-gray-300">원</span></span><div className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full text-[10px] font-black text-gray-400"><Heart size={10} className={myLikes.includes(item.id) ? 'text-red-500' : ''} fill={myLikes.includes(item.id) ? "currentColor" : "none"} />{item.likes || 0}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 리뷰 슬라이드 */}
          <section className="relative overflow-hidden py-10">
            <div className="text-center mb-16 px-4"><h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 break-keep">고객 리뷰</h2></div>
            <div className="flex animate-marquee gap-8">
              {[...settings.reviews, ...settings.reviews].map((rev, i) => (
                <div key={i} className="w-[350px] sm:w-[450px] bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-sm shrink-0">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-300 text-xl border border-white shadow-inner uppercase shrink-0">{rev.author?.[0]}</div>
                    <div><div className="text-base font-black text-gray-900">{rev.author}</div><div className="flex text-orange-400 mt-0.5">{[...Array(5)].map((_, starI) => (<Star key={starI} size={12} fill={starI < (rev.rating || 5) ? "currentColor" : "none"} />))}</div></div>
                  </div>
                  <p className="text-lg text-gray-700 leading-relaxed font-medium italic break-keep line-clamp-3">"{rev.text}"</p>
                </div>
              ))}
            </div>
          </section>

          {/* 오시는 길 */}
          <section id="map-area" className="pb-32">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-6">
              <h2 className="text-4xl font-black tracking-tighter flex items-center gap-3"><MapPin className="text-orange-600" size={32} /> 오시는 길</h2>
              {settings.naverReviewUrl && <a href={settings.naverReviewUrl} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-[#2DB400] text-white rounded-full text-sm font-black shadow-2xl">네이버 리뷰 보기</a>}
            </div>
            <div className="aspect-video bg-gray-100 rounded-[4rem] border-[12px] border-white shadow-2xl flex items-center justify-center text-gray-200 font-black text-2xl relative"><MapPin size={64} className="text-orange-500 animate-bounce" /><span className="tracking-tighter uppercase italic ml-4">지도 연동 준비 중</span></div>
          </section>
        </div>
        
        <footer className="bg-gray-900 py-20 px-4 text-center">
            <h2 className="text-white text-3xl font-black tracking-tighter mb-4 italic opacity-80">{settings.name}</h2>
            <p className="text-gray-500 text-sm font-bold">© 2024 {settings.name}. All Rights Reserved.</p>
        </footer>
      </div>

      {/* [관리자 페이지] */}
      {isAdminMode && (
        <div className="fixed inset-0 z-[200] bg-[#f8f9ff] overflow-y-auto animate-in slide-in-from-right duration-500">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <header className="sticky top-0 z-50 flex flex-col bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 mb-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900">관리자 대시보드</h2>
                <button onClick={() => setIsAdminMode(false)} className="p-4 bg-gray-50 rounded-full hover:bg-gray-100"><X size={28}/></button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                <button onClick={() => scrollToAdminSection(adminCategoryRef)} className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-xs font-black whitespace-nowrap shadow-sm"><LayoutGrid size={14}/> 카테고리</button>
                <button onClick={() => scrollToAdminSection(adminMenuRef)} className="flex items-center gap-2 px-6 py-3 bg-orange-50 text-orange-600 rounded-2xl text-xs font-black whitespace-nowrap shadow-sm"><MenuIcon size={14}/> 메뉴판</button>
                <button onClick={() => scrollToAdminSection(adminReviewRef)} className="flex items-center gap-2 px-6 py-3 bg-green-50 text-green-600 rounded-2xl text-xs font-black whitespace-nowrap shadow-sm"><MessageSquare size={14}/> 리뷰</button>
                <button onClick={() => scrollToAdminSection(adminBrandingRef)} className="flex items-center gap-2 px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl text-xs font-black whitespace-nowrap shadow-sm"><Info size={14}/> 가게 정보</button>
              </div>
            </header>

            <div className="space-y-24 pb-40">
              <section ref={adminCategoryRef} className="space-y-8 scroll-mt-60">
                <div className="flex items-center gap-3"><div className="w-2 h-8 bg-indigo-500 rounded-full shadow-lg"></div><h3 className="text-xl font-black tracking-tighter">카테고리 구성</h3></div>
                <div className="p-10 bg-white rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                  <div className="flex gap-3"><input type="text" id="cat-in-v8" placeholder="카테고리명" className="flex-1 p-5 rounded-2xl bg-gray-50 outline-none font-bold shadow-inner" /><button onClick={() => { const input = document.getElementById('cat-in-v8'); if(input.value) { setSettings({...settings, categories: [...settings.categories, input.value]}); input.value = ""; } }} className="px-8 bg-indigo-600 text-white rounded-2xl font-black">추가</button></div>
                  <div className="flex flex-wrap gap-3">{settings.categories.map((cat, i) => (<div key={i} className="px-5 py-3 bg-indigo-50 text-indigo-700 rounded-2xl text-sm font-black flex items-center gap-3 border border-indigo-100/50">{cat}{cat !== "전체" && <button onClick={() => setSettings({...settings, categories: settings.categories.filter(c => c !== cat)})} className="hover:text-red-500"><X size={16}/></button>}</div>))}</div>
                </div>
              </section>

              <section ref={adminMenuRef} className="space-y-8 scroll-mt-60">
                <div className="flex items-center gap-3"><div className="w-2 h-8 bg-orange-500 rounded-full"></div><h3 className="text-xl font-black tracking-tighter">메뉴 관리</h3></div>
                <div className="space-y-6">
                  {settings.menuItems.map((item, idx) => (
                    <div key={item.id} className="p-8 bg-white rounded-[3rem] border-2 border-gray-50">
                      <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-4"><span className="px-3 py-1 bg-gray-900 text-white rounded-lg text-[10px] font-black">ITEM #{idx+1}</span><label className="flex items-center gap-2 cursor-pointer font-bold text-sm"><input type="checkbox" checked={item.isRecommended} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].isRecommended = e.target.checked; setSettings({...settings, menuItems: ni}); }} className="w-4 h-4" /> 추천 메뉴</label></div><button onClick={() => { const ni = [...settings.menuItems]; ni.splice(idx, 1); setSettings({...settings, menuItems: ni}); }} className="p-2 text-red-300"><Trash2 size={24} /></button></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4"><input value={item.name} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].name = e.target.value; setSettings({...settings, menuItems: ni}); }} placeholder="메뉴명" className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold" /><input value={item.price} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].price = e.target.value; setSettings({...settings, menuItems: ni}); }} placeholder="가격" className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold" /><select value={item.category} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].category = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold shadow-inner">{settings.categories.filter(c => c !== "전체").map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                      <div className="flex gap-2 mb-6"><textarea value={item.desc} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].desc = e.target.value; setSettings({...settings, menuItems: ni}); }} placeholder="설명" className="flex-1 p-4 rounded-2xl bg-gray-50 outline-none text-sm min-h-[80px]" /><button onClick={() => handleGenerateMenuDesc(idx)} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl self-end"><Sparkles size={20} /></button></div>
                      <div className="flex items-center gap-6"><div className="w-20 h-20 rounded-3xl bg-gray-100 overflow-hidden border-2 border-white shadow-xl shrink-0">{item.img ? <img src={item.img} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-[10px]">NO IMG</div>}</div><label className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black cursor-pointer shadow-lg">사진 업로드 <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, (url) => { const ni = [...settings.menuItems]; ni[idx].img = url; setSettings({...settings, menuItems: ni}); })} /></label></div>
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, menuItems: [...settings.menuItems, {id: Date.now(), name: "새 메뉴", price: "0", desc: "", category: settings.categories[1] || "대표메뉴", isRecommended: false, likes: 0}]})} className="w-full py-14 border-4 border-dashed border-gray-100 rounded-[4rem] text-gray-300 hover:border-indigo-100 font-black flex items-center justify-center gap-3 text-xl"><Plus size={40} /> 메뉴 추가하기</button>
                </div>
              </section>

              <div className="pt-20 flex flex-col sm:flex-row gap-4">
                <button onClick={() => { saveSettings(settings); setIsAdminMode(false); }} className="flex-1 bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-2xl hover:bg-indigo-700 shadow-2xl transition-all active:scale-95 uppercase"><Save size={28} /> 설정 저장 및 종료</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* [인증 모달] */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[300] bg-gray-900/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[4rem] p-12 shadow-2xl text-center">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10"><Lock size={40} /></div>
            <h3 className="text-3xl font-black mb-4 tracking-tighter text-gray-900">사장님 접속</h3>
            <form onSubmit={handleVerifyPasscode} className="space-y-6"><input type="password" placeholder="••••" required autoFocus value={passcodeInput} onChange={(e) => setPasscodeInput(e.target.value)} className="w-full p-6 bg-gray-100 rounded-3xl text-center text-4xl font-black tracking-[0.5em] outline-none shadow-inner" /><button type="submit" className="w-full bg-gray-900 text-white py-6 rounded-3xl font-black text-xl active:scale-95 transition-all shadow-2xl uppercase tracking-widest">Verify</button><button type="button" onClick={() => setIsAuthModalOpen(false)} className="w-full text-gray-300 text-xs font-black py-2 uppercase">Cancel</button></form>
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