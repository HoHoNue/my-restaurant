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
const apiKey = ""; // Gemini API 키 (있을 경우 입력)

// --- Firebase 설정 (사장님의 실제 설정값으로 바꾸세요) ---
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
const appId = "my-store-final-v1"; 

const callGemini = async (prompt) => {
  if (!apiKey) return "API 키 설정이 필요합니다.";
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
    const init = async () => {
      onAuthStateChanged(auth, async (u) => {
        if (!u) { try { await signInAnonymously(auth); } catch(e){} }
        setUser(u);
        setLoading(false);
      });
    };
    init();
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
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'storeSettings', 'main'), newData);
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

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-400 font-bold bg-white">서버 연결 중...</div>;

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 overflow-x-hidden">
      
      {/* 서비스 화면 */}
      <div className={`${isAdminMode ? 'hidden' : 'block animate-in fade-in duration-700'}`}>
        <header className="relative h-[80vh] md:h-[90vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0 bg-black">
            <img src={settings.introImg} alt="배경" className="w-full h-full object-cover opacity-60" />
          </div>
          <div className="relative z-10 text-center px-4 text-white">
            <div className="inline-block px-4 py-1 bg-white/10 backdrop-blur rounded-full text-[10px] font-bold uppercase mb-6">Authentic Choice</div>
            <h1 className="text-6xl md:text-9xl font-black mb-8 drop-shadow-2xl italic break-keep tracking-tighter">{settings.name}</h1>
            <p className="text-lg md:text-2xl font-medium max-w-2xl mx-auto drop-shadow-lg break-keep">{settings.introText}</p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 space-y-32">
          {/* 영업시간 */}
          <section>
            <h2 className="text-2xl font-black mb-8 flex items-center gap-2"><Clock className="text-orange-600"/> 영업 정보</h2>
            <div className="bg-white rounded-[2.5rem] p-4 shadow-xl border border-gray-100 overflow-x-auto no-scrollbar">
              <div className="flex divide-x min-w-max md:min-w-0 md:w-full">
                {daysOrder.map((day) => {
                  const info = settings.openingHours[day];
                  const isToday = daysOrder[new Date().getDay()] === day;
                  return (
                    <div key={day} className={`flex-1 min-w-[110px] p-6 text-center transition-all ${isToday ? 'bg-orange-500 rounded-3xl text-white shadow-lg' : ''}`}>
                      <div className={`text-[10px] font-black uppercase mb-4 ${isToday ? 'text-white/80' : 'text-gray-300'}`}>{day}</div>
                      <div className="font-bold">{info.active ? <div>{info.open}<br/>{info.close}</div> : "휴무"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 메뉴판 */}
          <section id="menu-list">
            <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8">
              <div><h2 className="text-5xl font-black mb-2 tracking-tighter">맛있는 메뉴판</h2><p className="text-gray-400 text-sm">메뉴를 좌우로 밀어서 확인해 보세요.</p></div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-2">
                {settings.categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-2 rounded-full text-xs font-bold border transition-all ${activeCategory === cat ? 'bg-black border-black text-white' : 'bg-white text-gray-400'}`}>{cat}</button>
                ))}
              </div>
            </div>

            <div className="relative group">
              <div ref={menuScrollRef} className="flex overflow-x-auto gap-6 pb-12 no-scrollbar snap-x snap-mandatory">
                {filteredMenu.map(item => (
                  <div key={item.id} onDoubleClick={() => toggleLike(item.id)} className="flex-none w-[280px] sm:w-[320px] snap-center bg-white p-5 rounded-[3rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all">
                    <div className="relative aspect-square rounded-[2rem] overflow-hidden mb-6 shadow-md bg-gray-50">
                      <img src={item.img || "https://via.placeholder.com/400"} className="w-full h-full object-cover" />
                      <button onClick={() => toggleLike(item.id)} className={`absolute top-4 right-4 p-3 rounded-full ${myLikes.includes(item.id) ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-400'}`}><Heart size={16} fill={myLikes.includes(item.id) ? "white" : "none"}/></button>
                    </div>
                    <h3 className="text-2xl font-black mb-2 line-clamp-1">{item.name}</h3>
                    <p className="text-gray-400 text-xs line-clamp-2 min-h-[3rem] break-keep">{item.desc}</p>
                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <span className="text-2xl font-black italic">{item.price}원</span>
                      <span className="text-[10px] text-gray-300 font-bold flex items-center gap-1"><Heart size={10} fill="#ddd"/> {item.likes || 0}</span>
                    </div>
                  </div>
                ))}
                {filteredMenu.length === 0 && <div className="w-full py-40 text-center text-gray-300 font-bold">메뉴를 등록해 주세요.</div>}
              </div>
              {filteredMenu.length > 3 && (
                <>
                  <button onClick={() => scrollMenu('left')} className="absolute top-[40%] -left-6 p-4 bg-white rounded-full shadow-xl text-gray-400 hover:text-black hidden lg:block border"><ChevronLeft size={24}/></button>
                  <button onClick={() => scrollMenu('right')} className="absolute top-[40%] -right-6 p-4 bg-white rounded-full shadow-xl text-gray-400 hover:text-black hidden lg:block border"><ChevronRight size={24}/></button>
                </>
              )}
            </div>
          </section>

          {/* 리뷰 슬라이드 */}
          <section className="relative overflow-hidden py-20">
            <h2 className="text-center text-5xl font-black mb-16 tracking-tighter uppercase">Guest Review</h2>
            <div className="flex animate-marquee gap-8">
              {[...settings.reviews, ...settings.reviews].map((rev, i) => (
                <div key={i} className="w-[350px] bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm shrink-0">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center font-black text-orange-500 text-xl">{rev.author?.[0]}</div>
                    <div>
                      <div className="font-black text-lg">{rev.author}</div>
                      <div className="flex text-orange-400 text-sm">{"⭐".repeat(rev.rating || 5)}</div>
                    </div>
                  </div>
                  <p className="text-gray-600 italic break-keep leading-relaxed">"{rev.text}"</p>
                </div>
              ))}
            </div>
          </section>

          {/* 오시는 길 */}
          <section id="map-area" className="pb-32">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-6">
              <h2 className="text-4xl font-black tracking-tighter flex items-center gap-3"><MapPin className="text-orange-600" size={32} /> 오시는 길</h2>
              {settings.naverReviewUrl && <a href={settings.naverReviewUrl} target="_blank" rel="noopener noreferrer" className="px-10 py-4 bg-[#2DB400] text-white rounded-full text-sm font-black shadow-2xl hover:scale-105 transition-all">네이버 리뷰 바로가기</a>}
            </div>
            <div className="aspect-video bg-gray-100 rounded-[4rem] border-[12px] border-white shadow-2xl flex items-center justify-center text-gray-200 font-black text-2xl relative">
              <MapPin size={64} className="text-orange-500 animate-bounce" />
              <span className="tracking-tighter uppercase italic ml-4">지도 연동 준비 중</span>
            </div>
          </section>
        </div>

        <footer className="bg-gray-900 text-white py-24 text-center">
          <h2 className="text-3xl font-black mb-4 italic opacity-80">{settings.name}</h2>
          <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">© 2024 {settings.name}. All Rights Reserved.</p>
        </footer>
      </div>

      {/* 관리자 페이지 */}
      {isAdminMode && (
        <div className="fixed inset-0 z-[200] bg-[#f8f9ff] overflow-y-auto animate-in slide-in-from-right duration-500">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <header className="sticky top-0 z-50 flex flex-col bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 mb-12">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4"><div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl"><Settings size={28} /></div><div><h2 className="text-2xl font-black text-gray-900">관리자 대시보드</h2></div></div>
                <button onClick={() => setIsAdminMode(false)} className="p-4 bg-gray-50 rounded-full hover:bg-gray-100"><X size={28}/></button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                <button onClick={() => scrollToAdminSection(adminCategoryRef)} className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-xs font-black whitespace-nowrap shadow-sm"><LayoutGrid size={14} className="inline mr-1"/> 카테고리 설정</button>
                <button onClick={() => scrollToAdminSection(adminMenuRef)} className="px-6 py-3 bg-orange-50 text-orange-600 rounded-2xl text-xs font-black whitespace-nowrap shadow-sm"><MenuIcon size={14} className="inline mr-1"/> 메뉴 관리</button>
                <button onClick={() => scrollToAdminSection(adminReviewRef)} className="px-6 py-3 bg-green-50 text-green-600 rounded-2xl text-xs font-black whitespace-nowrap shadow-sm"><MessageSquare size={14} className="inline mr-1"/> 리뷰 관리</button>
                <button onClick={() => scrollToAdminSection(adminBrandingRef)} className="px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl text-xs font-black whitespace-nowrap shadow-sm"><Info size={14} className="inline mr-1"/> 가게 정보</button>
              </div>
            </header>

            <div className="space-y-24 pb-40">
              <section ref={adminCategoryRef} className="space-y-8 scroll-mt-60">
                <h3 className="text-xl font-black border-l-4 border-indigo-500 pl-4">카테고리 구성</h3>
                <div className="p-10 bg-white rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                  <div className="flex gap-3"><input type="text" id="cat-in-final" placeholder="새 카테고리 이름" className="flex-1 p-5 rounded-2xl bg-gray-50 outline-none font-bold shadow-inner" /><button onClick={() => { const input = document.getElementById('cat-in-final'); if(input.value) { setSettings({...settings, categories: [...settings.categories, input.value]}); input.value = ""; } }} className="px-8 bg-indigo-600 text-white rounded-2xl font-black">추가</button></div>
                  <div className="flex flex-wrap gap-3">{settings.categories.map((cat, i) => (<div key={i} className="px-5 py-3 bg-indigo-50 text-indigo-700 rounded-2xl text-sm font-black flex items-center gap-3 border border-indigo-100/50">{cat}{cat !== "전체" && <button onClick={() => setSettings({...settings, categories: settings.categories.filter(c => c !== cat)})} className="hover:text-red-500"><X size={16}/></button>}</div>))}</div>
                </div>
              </section>

              <section ref={adminMenuRef} className="space-y-8 scroll-mt-60">
                <h3 className="text-xl font-black border-l-4 border-orange-500 pl-4">메뉴판 관리</h3>
                <div className="space-y-6">
                  {settings.menuItems.map((item, idx) => (
                    <div key={item.id} className={`p-8 bg-white rounded-[3rem] border-2 transition-all ${item.isRecommended ? 'border-orange-500/30 ring-8 ring-orange-50' : 'border-gray-50'}`}>
                      <div className="flex justify-between items-center mb-6"><div className="flex items-center gap-4"><span className="px-3 py-1 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase">ITEM #{idx+1}</span><label className="flex items-center gap-2 cursor-pointer font-bold text-sm"><input type="checkbox" checked={item.isRecommended} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].isRecommended = e.target.checked; setSettings({...settings, menuItems: ni}); }} className="w-4 h-4" /> 추천 메뉴</label></div><button onClick={() => { const ni = [...settings.menuItems]; ni.splice(idx, 1); setSettings({...settings, menuItems: ni}); }} className="p-2 text-red-300"><Trash2 size={24} /></button></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4"><input value={item.name} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].name = e.target.value; setSettings({...settings, menuItems: ni}); }} placeholder="메뉴명" className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold" /><input value={item.price} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].price = e.target.value; setSettings({...settings, menuItems: ni}); }} placeholder="가격" className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold" /><select value={item.category} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].category = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-4 rounded-2xl bg-gray-50 outline-none font-bold shadow-inner">{settings.categories.filter(c => c !== "전체").map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                      <div className="flex gap-2 mb-6"><textarea value={item.desc} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].desc = e.target.value; setSettings({...settings, menuItems: ni}); }} placeholder="설명" className="flex-1 p-4 rounded-2xl bg-gray-50 outline-none text-sm min-h-[80px] shadow-inner" /></div>
                      <div className="flex items-center gap-6"><div className="w-20 h-20 rounded-3xl bg-gray-100 overflow-hidden border shadow-inner shrink-0">{item.img ? <img src={item.img} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-black text-[10px]">사진 없음</div>}</div><label className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black cursor-pointer shadow-lg hover:scale-105 transition-all">사진 업로드 <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, (url) => { const ni = [...settings.menuItems]; ni[idx].img = url; setSettings({...settings, menuItems: ni}); })} /></label></div>
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, menuItems: [...settings.menuItems, {id: Date.now(), name: "새 메뉴", price: "0", desc: "", category: settings.categories[1] || "면류", isRecommended: false, likes: 0}]})} className="w-full py-14 border-4 border-dashed border-gray-100 rounded-[4rem] text-gray-300 hover:border-orange-200 transition-all font-black flex items-center justify-center gap-3 text-xl"><Plus size={40} /> 메뉴 추가하기</button>
                </div>
              </section>

              <section ref={adminReviewRef} className="space-y-8 scroll-mt-60">
                <h3 className="text-xl font-black border-l-4 border-green-500 pl-4">베스트 리뷰 관리</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {settings.reviews && settings.reviews.map((rev, idx) => (
                    <div key={idx} className="p-8 bg-white rounded-[3rem] shadow-sm border border-gray-100 space-y-6">
                      <div className="flex justify-between items-center"><span className="text-xs font-black text-green-600">작성자 #{idx+1}</span><button onClick={() => { const nr = [...settings.reviews]; nr.splice(idx, 1); setSettings({...settings, reviews: nr}); }} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={20}/></button></div>
                      <div className="grid grid-cols-2 gap-4"><input value={rev.author} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].author = e.target.value; setSettings({...settings, reviews: nr}); }} placeholder="손님 이름" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm shadow-inner" /><select value={rev.rating || 5} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].rating = parseInt(e.target.value); setSettings({...settings, reviews: nr}); }} className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm shadow-inner"><option value="5">⭐⭐⭐⭐⭐</option><option value="4">⭐⭐⭐⭐</option><option value="3">⭐⭐⭐</option><option value="2">⭐⭐</option><option value="1">⭐</option></select></div>
                      <div className="flex gap-2"><textarea value={rev.text} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].text = e.target.value; setSettings({...settings, reviews: nr}); }} placeholder="내용" className="flex-1 p-4 bg-gray-50 rounded-2xl border-none text-sm min-h-[80px] shadow-inner" /><button onClick={() => { const review = settings.reviews[idx]; if (!review.text) return; setIsAiLoading(true); callGemini(`다음 리뷰를 멋지게 다듬어줘: "${review.text}"`).then(txt => { const nr = [...settings.reviews]; nr[idx].text = txt.trim(); setSettings({...settings, reviews: nr}); }).finally(() => setIsAiLoading(false)); }} className="p-4 bg-white border border-indigo-100 rounded-2xl text-indigo-600 shadow-sm self-end"><Sparkles size={20}/></button></div>
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, reviews: [...(settings.reviews || []), {author: "새 손님", rating: 5, text: "", img: ""}]})} className="min-h-[200px] border-4 border-dashed border-gray-100 rounded-[3rem] text-gray-200 hover:text-green-500 transition-all flex items-center justify-center font-black text-lg"><Plus size={48} /></button>
                </div>
              </section>

              <section ref={adminBrandingRef} className="space-y-8 scroll-mt-60">
                <h3 className="text-xl font-black border-l-4 border-gray-900 pl-4">가게 정보 설정</h3>
                <div className="p-10 bg-white rounded-[4rem] shadow-sm border border-gray-100 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-2"><label className="text-xs font-black text-gray-400 ml-1">가게 이름</label><input value={settings.name} onChange={(e) => setSettings({...settings, name: e.target.value})} className="w-full p-5 bg-gray-50 border-none rounded-2xl font-black text-2xl outline-none shadow-inner focus:ring-4 ring-indigo-500/10" /></div><div className="space-y-2"><label className="text-xs font-black text-gray-400 ml-1">리뷰 주소</label><input value={settings.naverReviewUrl} onChange={(e) => setSettings({...settings, naverReviewUrl: e.target.value})} placeholder="네이버 플레이스 URL" className="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold shadow-inner focus:ring-4 ring-green-500/10" /></div></div>
                  <div className="space-y-2"><label className="text-xs font-black text-gray-400 ml-1">소개 문구</label><textarea value={settings.introText} onChange={(e) => setSettings({...settings, introText: e.target.value})} className="w-full p-6 bg-gray-50 border-none rounded-[2rem] text-base font-medium min-h-[120px] shadow-inner focus:ring-4 ring-indigo-500/10" /></div>
                </div>
              </section>

              <div className="pt-20 flex flex-col sm:flex-row gap-4">
                <button onClick={() => { saveSettings(settings); setIsAdminMode(false); }} className="flex-1 bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-2xl hover:bg-indigo-700 shadow-2xl transition-all active:scale-95 uppercase"><Save size={28} className="inline mr-2"/> 설정 저장 및 대시보드 종료</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 인증 모달 */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[4rem] p-12 shadow-2xl text-center">
            <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-inner"><Lock size={40} /></div>
            <h3 className="text-3xl font-black mb-4 tracking-tighter text-gray-900 uppercase">사장님 전용</h3>
            <p className="text-sm text-gray-400 mb-10 font-bold uppercase tracking-widest">비밀 코드를 입력하세요</p>
            <form onSubmit={handleVerifyPasscode} className="space-y-6"><input type="password" placeholder="••••" required autoFocus value={passcodeInput} onChange={(e) => setPasscodeInput(e.target.value)} className="w-full p-6 bg-gray-100 rounded-3xl text-center text-4xl font-black tracking-[0.5em] outline-none shadow-inner focus:ring-4 ring-indigo-500/10 transition-all" /><button type="submit" className="w-full bg-gray-900 text-white py-6 rounded-3xl font-black text-xl active:scale-95 transition-all shadow-2xl">확인</button><button type="button" onClick={() => setIsAuthModalOpen(false)} className="w-full text-gray-400 text-xs font-black py-2 hover:text-gray-600">취소</button></form>
          </div>
        </div>
      )}

      {/* 관리자 버튼 */}
      {!isAdminMode && (
        <button onClick={() => setIsAuthModalOpen(true)} className="fixed bottom-6 right-6 p-3 text-gray-200 hover:text-gray-900 transition-all z-[100] opacity-5 hover:opacity-100 bg-white/50 backdrop-blur rounded-full shadow-sm"><Settings size={14} /></button>
      )}
    </div>
  );
};

export default App;