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
  ChevronLeft, Star, Heart, ExternalLink, MessageSquare, Quote, 
  LayoutGrid, Menu as MenuIcon, Info, Bell
} from 'lucide-react';

// --- [사장님 설정] 관리자 접속 비밀 코드 ---
const ADMIN_PASSCODE = "1234"; 

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
    notice: "봄맞이 신메뉴 '전복 유산슬' 출시! 평일 런치 타임 방문 시 군만두를 서비스로 드립니다.",
    introImg: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=1200",
    introText: "30년 세월, 변함없는 손맛으로 빚어낸 정통 중화요리의 정수. 귀한 분을 모시는 마음으로 정성을 다하겠습니다.",
    naverReviewUrl: "https://m.place.naver.com", 
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
    menuItems: [
      { id: 1, name: "명품 수타 짜장면", price: "8,000", desc: "매일 아침 직접 치댄 쫄깃한 수타면과 깊은 풍미의 특제 춘장 소스", category: "면류", isRecommended: true, likes: 124, img: "https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?auto=format&fit=crop&q=80&w=400" },
      { id: 2, name: "삼선 해물 짬뽕", price: "10,000", desc: "신선한 전복과 해산물이 듬뿍 들어간 시원하고 얼큰한 국물", category: "면류", isRecommended: true, likes: 98, img: "https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&q=80&w=400" },
      { id: 3, name: "찹쌀 꿔바로우", price: "24,000", desc: "겉은 바삭하고 속은 쫄깃한 최상급 국내산 돼지고기 탕수육", category: "요리류", isRecommended: true, likes: 256, img: "https://images.unsplash.com/photo-1623341214825-9f4f963727da?auto=format&fit=crop&q=80&w=400" },
      { id: 4, name: "전복 유산슬", price: "45,000", desc: "여덟 가지 진귀한 해산물을 부드러운 소스와 함께 볶아낸 최고급 요리", category: "요리류", isRecommended: false, likes: 45, img: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&q=80&w=400" },
      { id: 5, name: "패밀리 코스 A", price: "85,000", desc: "유산슬 + 탕수육 + 식사(짜장/짬뽕) 구성의 알찬 가족 세트", category: "세트메뉴", isRecommended: false, likes: 82, img: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&q=80&w=400" }
    ],
    reviews: [
      { author: "이현주 님", rating: 5, text: "아이들과 주말마다 오는데 짜장면 면발이 정말 달라요. 꿔바로우는 식어도 바삭하고 맛있습니다." },
      { author: "김민석 님", rating: 5, text: "중요한 비즈니스 미팅이 있어서 방문했는데 분위기가 너무 고급스럽고 음식 플레이팅도 예술이었습니다." },
      { author: "박지은 님", rating: 5, text: "짬뽕 국물이 정말 진해요! 해산물도 너무 싱싱해서 돈이 아깝지 않은 맛입니다. 단골 예약이에요." },
      { author: "최유정 님", rating: 4, text: "직원분들도 너무 친절하시고 가게가 정말 깔끔합니다. 예약하고 가니까 조용한 룸에서 식사할 수 있어서 좋았어요." }
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
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'storeSettings', 'main'), newData);
  };

  const handleVerifyPasscode = (e) => {
    e.preventDefault();
    if (passcodeInput === ADMIN_PASSCODE) {
      setIsAdminMode(true); setIsAuthModalOpen(false); setPasscodeInput("");
    } else { alert("비밀 코드가 일치하지 않습니다."); }
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
  const daysKor = { sun: '일', mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토' };

  const scrollMenu = (direction) => {
    if (menuScrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      menuScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollToAdminSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-400 font-black bg-[#fcfaf8]">서버 연결 중...</div>;

  return (
    <div className="min-h-screen bg-[#fcfaf8] text-[#1a1a1a] flex flex-col items-center">
      
      {/* [메인 서비스 화면] */}
      <div className={`w-full ${isAdminMode ? 'hidden' : 'block animate-in fade-in duration-1000'}`}>
        
        {/* 상단 배너 - 고급스러운 수직 정렬 */}
        <header className="relative h-[60vh] w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src={settings.introImg} className="w-full h-full object-cover" alt="가게 메인 배경" />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
          </div>
          <div className="relative z-10 text-center px-6 max-w-4xl">
            <span className="inline-block text-orange-400 text-lg md:text-xl mb-6 tracking-widest font-bold">정성으로 빚어낸 전통의 맛</span>
            <h1 className="text-6xl md:text-9xl font-black text-white mb-8 tracking-tighter drop-shadow-2xl italic">{settings.name}</h1>
            <p className="text-lg md:text-2xl text-white/90 font-bold max-w-2xl mx-auto leading-relaxed break-keep">
              {settings.introText}
            </p>
          </div>
        </header>

        <main className="max-w-screen-xl mx-auto px-6 md:px-12 py-32 space-y-48 flex flex-col items-center">
          
          {/* 공지사항 */}
          {settings.notice && (
            <section className="w-full max-w-4xl animate-in slide-in-from-bottom-8">
              <div className="glass p-10 md:p-14 rounded-[4rem] border-2 border-orange-100 flex flex-col md:flex-row items-center gap-10 shadow-2xl shadow-orange-50">
                <div className="w-20 h-20 bg-orange-600 rounded-3xl flex items-center justify-center text-white shadow-lg shrink-0">
                  <Bell size={40} className="animate-pulse" />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-black mb-3 text-orange-600">가게 공지사항</h3>
                  <p className="text-xl md:text-2xl font-bold leading-relaxed break-keep text-gray-800">
                    {settings.notice}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* 메뉴판 */}
          <section id="menu-list" className="w-full space-y-16">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-10 text-center md:text-left">
              <div className="flex flex-col items-center md:items-start">
                <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tight italic text-gray-900">대표 요리</h2>
                <p className="text-gray-400 text-lg font-bold">청궁이 자랑하는 최고의 메뉴들을 만나보세요.</p>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 max-w-full justify-center">
                {settings.categories.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`px-10 py-4 rounded-full text-sm font-black transition-all border ${activeCategory === cat ? 'bg-black border-black text-white shadow-2xl scale-105' : 'bg-white border-gray-100 text-gray-400 hover:text-black'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group w-full">
              <div ref={menuScrollRef} className="flex overflow-x-auto gap-10 pb-16 px-4 -mx-4 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing">
                {filteredMenu.map(item => (
                  <div key={item.id} onDoubleClick={() => toggleLike(item.id)} className="flex-none w-[300px] md:w-[400px] snap-center group/card">
                    <div className="relative aspect-[4/5] rounded-[4rem] overflow-hidden mb-8 shadow-xl transition-all duration-700 group-hover/card:shadow-orange-100/50">
                      <img src={item.img || "https://via.placeholder.com/800"} className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-110" alt={item.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover/card:opacity-90 transition-opacity"></div>
                      <button onClick={() => toggleLike(item.id)} className={`absolute top-8 right-8 p-5 rounded-full glass transition-all ${myLikes.includes(item.id) ? 'text-red-500 scale-110' : 'text-gray-900 opacity-0 group-hover/card:opacity-100'}`}><Heart size={24} fill={myLikes.includes(item.id) ? "currentColor" : "none"}/></button>
                      <div className="absolute bottom-10 left-10 right-10 text-white">
                        <span className="text-xs font-black uppercase tracking-widest text-orange-400 mb-3 block">{item.category}</span>
                        <h3 className="text-3xl font-black mb-4 tracking-tight leading-tight">{item.name}</h3>
                        <p className="text-sm font-bold leading-relaxed line-clamp-2 italic opacity-0 group-hover/card:opacity-100 transition-all translate-y-2 group-hover/card:translate-y-0">{item.desc || "정성을 다해 준비한 일품 요리입니다."}</p>
                      </div>
                    </div>
                    <div className="px-6 flex justify-between items-center">
                      <span className="text-3xl font-black italic tracking-tighter text-gray-900"><span className="text-base not-italic mr-1 text-gray-300">₩</span>{item.price}</span>
                      <div className="flex items-center gap-2 bg-white border border-gray-100 px-4 py-1.5 rounded-full shadow-sm">
                        <Heart size={14} className="text-red-400" fill="currentColor"/>
                        <span className="text-sm text-gray-400 font-black">{item.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {filteredMenu.length > 2 && (
                <div className="hidden lg:flex gap-4 absolute -top-24 right-0">
                  <button onClick={() => scrollMenu('left')} className="p-4 rounded-full border border-gray-200 hover:bg-black hover:text-white transition-all"><ChevronLeft size={20}/></button>
                  <button onClick={() => scrollMenu('right')} className="p-4 rounded-full border border-gray-200 hover:bg-black hover:text-white transition-all"><ChevronRight size={20}/></button>
                </div>
              )}
            </div>
          </section>

          {/* 리뷰 섹션 */}
          <section className="w-full relative overflow-hidden py-20">
            <div className="text-center mb-24 flex flex-col items-center gap-6">
              <div className="flex flex-col items-center">
                <h2 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter italic text-gray-900">방문 후기</h2>
                <p className="text-gray-400 text-lg font-bold tracking-widest">실제 방문 고객님들의 생생한 이야기</p>
              </div>
              
              {settings.naverReviewUrl && (
                <a 
                  href={settings.naverReviewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-8 py-4 bg-[#2DB400] text-white rounded-full text-base font-black shadow-xl hover:brightness-110 transition-all active:scale-95 group"
                >
                  <MessageSquare size={20} className="group-hover:rotate-12 transition-transform" /> 
                  네이버 리뷰 전체보기 
                  <ChevronRight size={18} />
                </a>
              )}
            </div>
            
            <div className="flex animate-marquee gap-10 md:gap-16">
              {[...settings.reviews, ...settings.reviews].map((rev, i) => (
                <div key={i} className="w-[350px] md:w-[550px] glass p-12 md:p-16 rounded-[5rem] shadow-sm shrink-0">
                  <div className="relative">
                    <Quote className="absolute -top-8 -right-8 text-orange-100 opacity-30" size={120} />
                    <div className="flex items-center gap-6 mb-12 relative z-10">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center font-black text-orange-600 text-2xl border border-gray-50 shadow-inner">{rev.author?.[0]}</div>
                      <div><div className="font-black text-2xl">{rev.author}</div><div className="flex text-orange-400 text-sm mt-1">{"★".repeat(rev.rating || 5)}</div></div>
                    </div>
                    <p className="text-gray-700 italic break-keep leading-relaxed text-xl md:text-2xl font-bold">"{rev.text}"</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 오시는 길 */}
          <section id="map-area" className="w-full max-w-5xl space-y-16 text-center">
            <div className="flex flex-col items-center gap-10 border-b border-gray-100 pb-16">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter italic text-gray-900">오시는 길</h2>
              <p className="text-gray-400 text-xl font-bold">서울특별시 강남구 맛집로 88길 1층 청궁</p>
              {settings.naverReviewUrl && (
                <a href={settings.naverReviewUrl} target="_blank" rel="noopener noreferrer" className="px-14 py-6 bg-black text-white rounded-full text-lg font-black hover:bg-orange-600 transition-all shadow-2xl flex items-center gap-3">
                  지도에서 위치 확인 <ExternalLink size={20}/>
                </a>
              )}
            </div>
            <div className="aspect-[21/9] bg-white rounded-[5rem] border border-gray-100 shadow-2xl flex flex-col items-center justify-center text-gray-200 relative overflow-hidden group">
              <MapPin size={100} className="text-orange-500 animate-bounce z-10" />
              <div className="absolute inset-0 opacity-10 grayscale group-hover:grayscale-0 transition-all duration-1000">
                <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover" />
              </div>
            </div>
          </section>
        </main>

        <footer className="w-full bg-white border-t border-gray-50 py-40 text-center px-6">
          <h2 className="text-5xl font-black mb-8 italic opacity-80 tracking-tighter text-gray-900">{settings.name}</h2>
          <p className="text-gray-300 text-xs font-black tracking-[0.4em] uppercase">1994년부터 이어온 전통의 맛</p>
        </footer>
      </div>

      {/* [관리자 페이지] */}
      {isAdminMode && (
        <div className="fixed inset-0 z-[200] bg-[#fcfaf8] overflow-y-auto animate-in slide-in-from-right duration-500">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <header className="sticky top-0 z-50 glass p-8 rounded-[3rem] shadow-xl border border-white mb-16 flex items-center justify-between">
              <div className="flex items-center gap-4 text-gray-900"><Settings size={28} /><h2 className="text-2xl font-black">관리 센터</h2></div>
              <button onClick={() => setIsAdminMode(false)} className="p-3 bg-gray-900 text-white rounded-full hover:bg-orange-600 transition-all"><X size={24}/></button>
            </header>

            <div className="space-y-32 pb-40">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-900">
                <button onClick={() => scrollToAdminSection(adminNoticeRef)} className="p-6 bg-white rounded-3xl border border-orange-100 shadow-sm font-black text-orange-600">공지사항</button>
                <button onClick={() => scrollToAdminSection(adminMenuRef)} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm font-black">메뉴 관리</button>
                <button onClick={() => scrollToAdminSection(adminReviewRef)} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm font-black">후기 관리</button>
                <button onClick={() => scrollToAdminSection(adminBrandingRef)} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm font-black">가게 정보</button>
              </div>

              <section ref={adminNoticeRef} className="space-y-8 scroll-mt-32">
                <h3 className="text-2xl font-black flex items-center gap-3"><Bell className="text-orange-600" /> 공지사항 설정</h3>
                <textarea value={settings.notice} onChange={(e) => setSettings({...settings, notice: e.target.value})} className="w-full p-8 bg-white rounded-[3rem] border-2 border-orange-100 outline-none font-bold text-xl min-h-[150px]" placeholder="메인 공지 문구를 입력하세요." />
              </section>

              <section ref={adminMenuRef} className="space-y-8 scroll-mt-32">
                <h3 className="text-2xl font-black flex items-center gap-3"><Utensils /> 메뉴판 관리</h3>
                <div className="grid gap-8">
                  {settings.menuItems.map((item, idx) => (
                    <div key={item.id} className="p-10 bg-white rounded-[4rem] border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center mb-8"><span className="px-5 py-2 bg-gray-900 text-white rounded-full text-xs font-black">메뉴 #{idx+1}</span><button onClick={() => { const ni = [...settings.menuItems]; ni.splice(idx, 1); setSettings({...settings, menuItems: ni}); }} className="text-red-300 hover:text-red-500"><Trash2 size={24} /></button></div>
                      <div className="grid md:grid-cols-2 gap-8">
                        <input value={item.name} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].name = e.target.value; setSettings({...settings, menuItems: ni}); }} className="p-5 bg-gray-50 rounded-2xl outline-none font-black text-xl" placeholder="메뉴 이름" />
                        <input value={item.price} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].price = e.target.value; setSettings({...settings, menuItems: ni}); }} className="p-5 bg-gray-50 rounded-2xl outline-none font-black text-xl" placeholder="판매 가격" />
                      </div>
                      <textarea value={item.desc} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].desc = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-sm mt-4 min-h-[100px]" placeholder="메뉴에 대한 설명을 적어주세요." />
                      <div className="flex items-center gap-6 mt-8">
                        <div className="w-24 h-24 rounded-3xl bg-gray-100 overflow-hidden border shadow-inner shrink-0">{item.img ? <img src={item.img} className="w-full h-full object-cover" /> : <Upload size={32} className="m-auto text-gray-300 h-full"/>}</div>
                        <label className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-xs font-black cursor-pointer hover:bg-orange-600 transition-all shadow-lg">사진 등록/변경<input type="file" className="hidden" onChange={(e) => { const reader = new FileReader(); reader.onloadend = () => { const ni = [...settings.menuItems]; ni[idx].img = reader.result; setSettings({...settings, menuItems: ni}); }; reader.readAsDataURL(e.target.files[0]); }} /></label>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, menuItems: [...settings.menuItems, {id: Date.now(), name: "신메뉴", price: "0", desc: "", category: "전체", isRecommended: false, likes: 0}]})} className="w-full py-20 border-2 border-dashed border-gray-100 rounded-[4rem] text-gray-300 hover:text-orange-500 font-black flex items-center justify-center gap-4 text-2xl"><Plus size={40} /> 메뉴 항목 추가</button>
                </div>
              </section>

              <section ref={adminReviewRef} className="space-y-8 scroll-mt-32">
                <h3 className="text-2xl font-black flex items-center gap-3"><MessageSquare className="text-green-600" /> 손님 후기 관리</h3>
                <div className="grid gap-6">
                  {settings.reviews.map((rev, idx) => (
                    <div key={idx} className="p-10 bg-white rounded-[4rem] border border-gray-100 shadow-sm space-y-6">
                      <div className="flex justify-between items-center"><span className="text-xs font-black text-green-600 uppercase">후기 #{idx+1}</span><button onClick={() => { const nr = [...settings.reviews]; nr.splice(idx, 1); setSettings({...settings, reviews: nr}); }} className="text-red-300 hover:text-red-500"><Trash2 size={24}/></button></div>
                      <div className="grid grid-cols-2 gap-4">
                        <input value={rev.author} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].author = e.target.value; setSettings({...settings, reviews: nr}); }} placeholder="손님 이름" className="p-5 bg-gray-50 rounded-2xl outline-none font-bold" />
                        <select value={rev.rating || 5} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].rating = parseInt(e.target.value); setSettings({...settings, reviews: nr}); }} className="p-5 bg-gray-50 rounded-2xl outline-none font-bold">
                          <option value="5">⭐⭐⭐⭐⭐ (5점)</option>
                          <option value="4">⭐⭐⭐⭐ (4점)</option>
                          <option value="3">⭐⭐⭐ (3점)</option>
                          <option value="2">⭐⭐ (2점)</option>
                          <option value="1">⭐ (1점)</option>
                        </select>
                      </div>
                      <textarea value={rev.text} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].text = e.target.value; setSettings({...settings, reviews: nr}); }} className="w-full p-6 bg-gray-50 rounded-2xl outline-none font-medium min-h-[120px]" placeholder="후기 본문을 입력하세요." />
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, reviews: [...settings.reviews, {author: "단골 손님", rating: 5, text: ""}]})} className="w-full py-16 border-2 border-dashed border-gray-100 rounded-[4rem] text-gray-300 hover:text-green-500 font-black flex items-center justify-center gap-4 text-xl"><Plus size={32} /> 후기 수동 추가</button>
                </div>
              </section>

              <section ref={adminBrandingRef} className="space-y-8 scroll-mt-32">
                <h3 className="text-2xl font-black flex items-center gap-3"><Info className="text-blue-600" /> 가게 정보 및 네이버 링크</h3>
                <div className="p-10 bg-white rounded-[4rem] border border-gray-100 shadow-sm space-y-10 text-gray-900">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-gray-300 uppercase ml-2 tracking-widest">네이버 플레이스 주소</label>
                    <input value={settings.naverReviewUrl} onChange={(e) => setSettings({...settings, naverReviewUrl: e.target.value})} className="w-full p-6 bg-gray-50 rounded-[2.5rem] outline-none font-bold text-lg shadow-inner" placeholder="https://m.place.naver.com/restaurant/..." />
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black text-gray-300 uppercase ml-2 tracking-widest">가게 상호명</label>
                    <input value={settings.name} onChange={(e) => setSettings({...settings, name: e.target.value})} className="w-full p-6 bg-gray-50 rounded-[2.5rem] outline-none font-black text-3xl shadow-inner" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black text-gray-300 uppercase ml-2 tracking-widest">메인 소개글</label>
                    <textarea value={settings.introText} onChange={(e) => setSettings({...settings, introText: e.target.value})} className="w-full p-8 bg-gray-50 rounded-[3rem] outline-none font-bold text-lg min-h-[150px] shadow-inner" />
                  </div>
                </div>
              </section>

              <button onClick={() => { saveSettings(settings); setIsAdminMode(false); }} className="w-full bg-orange-600 text-white py-10 rounded-[4rem] font-black text-3xl hover:bg-black shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-5 uppercase">
                <Save size={40}/> 전체 설정 저장 후 홈페이지 반영
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [관리자 로그인 모달] */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6">
          <div className="bg-white/10 w-full max-w-sm rounded-[4rem] p-16 text-center border border-white/10 shadow-2xl">
            <h3 className="text-3xl font-black text-white mb-12 tracking-widest uppercase">관리자 접속</h3>
            <form onSubmit={handleVerifyPasscode} className="space-y-12">
              <input type="password" required autoFocus value={passcodeInput} onChange={(e)=>setPasscodeInput(e.target.value)} className="w-full bg-transparent border-b-2 border-white/20 p-4 text-center text-6xl font-black text-white outline-none focus:border-orange-600 transition-all tracking-[0.5em]" placeholder="••••" />
              <div className="space-y-4">
                <button type="submit" className="w-full bg-white text-black py-6 rounded-full font-black text-xl hover:bg-orange-600 hover:text-white transition-all shadow-xl uppercase">입장하기</button>
                <button type="button" onClick={()=>setIsAuthModalOpen(false)} className="w-full text-white/30 text-xs font-bold hover:text-white uppercase tracking-widest">취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 관리자 진입 버튼 */}
      {!isAdminMode && (
        <button onClick={() => setIsAuthModalOpen(true)} className="fixed bottom-10 right-10 p-5 text-gray-300 hover:text-gray-900 transition-all z-[100] opacity-5 hover:opacity-100 bg-white/30 backdrop-blur rounded-full border border-white/30 shadow-2xl"><Settings size={20} /></button>
      )}
    </div>
  );
};

export default App;