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
  LayoutGrid, Menu as MenuIcon, Info, Bell, Navigation, PhoneCall
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
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'storeSettings', 'main'), newData);
  };

  const handleVerifyPasscode = (e) => {
    e.preventDefault();
    if (passcodeInput === ADMIN_PASSCODE) {
      setIsAdminMode(true); setIsAuthModalOpen(false); setPasscodeInput("");
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
      const scrollAmount = direction === 'left' ? -400 : 400;
      menuScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
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
        
        {/* 상단 배너 - 영어 문구 완벽 제거 및 수직 비율 최적화 */}
        <header className="relative h-[65vh] w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src={settings.introImg} className="w-full h-full object-cover" alt="배경" />
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"></div>
          </div>
          <div className="relative z-10 text-center px-6 max-w-5xl flex flex-col items-center">
            <h1 className="text-7xl md:text-[10rem] font-black text-white mb-10 tracking-tighter drop-shadow-2xl italic leading-[1]">{settings.name}</h1>
            <div className="w-16 h-1.5 bg-orange-500 rounded-full mb-10 shadow-lg"></div>
            <p className="text-xl md:text-3xl text-white font-bold max-w-3xl mx-auto leading-relaxed break-keep drop-shadow-md">
              {settings.introText}
            </p>
          </div>
        </header>

        <main className="w-full max-w-screen-xl mx-auto px-6 md:px-12 py-32 space-y-48 flex flex-col items-center">
          
          {/* 공지사항 - 너비 정렬 수정 (w-full 적용하여 컨테이너 너비와 일치) */}
          {settings.notice && (
            <section className="w-full animate-in slide-in-from-bottom-8 duration-700">
              <div className="glass p-10 md:p-16 rounded-[4rem] border-2 border-orange-100 flex flex-col md:flex-row items-center gap-12 shadow-2xl shadow-orange-100/30">
                <div className="w-24 h-24 bg-orange-600 rounded-[2rem] flex items-center justify-center text-white shadow-xl shrink-0">
                  <Bell size={48} className="animate-pulse" />
                </div>
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-2xl font-black mb-4 text-orange-600 italic tracking-tighter">가게 소식 안내</h3>
                  <p className="text-2xl md:text-3xl font-black leading-snug break-keep text-gray-900">
                    {settings.notice}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* 메뉴판 */}
          <section id="menu-list" className="w-full space-y-20 flex flex-col items-center">
            <div className="flex flex-col lg:flex-row justify-between items-center lg:items-end w-full gap-10 text-center lg:text-left">
              <div className="flex flex-col items-center lg:items-start">
                <h2 className="text-6xl md:text-8xl font-black mb-6 tracking-tight italic text-gray-900 uppercase">대표 요리</h2>
                <div className="h-2 w-32 bg-orange-600 rounded-full mb-6"></div>
                <p className="text-gray-400 text-xl font-black tracking-widest">장인의 고집과 정성이 담긴 청궁의 맛</p>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 max-w-full justify-center">
                {settings.categories.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`px-12 py-5 rounded-full text-sm font-black transition-all border-2 ${activeCategory === cat ? 'bg-black border-black text-white shadow-2xl scale-110' : 'bg-white border-gray-100 text-gray-400 hover:border-black hover:text-black'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 메뉴 넘기기 화살표 UI 개선 */}
            <div className="relative w-full group">
              <button 
                onClick={() => scrollMenu('left')} 
                className="absolute left-[-30px] top-1/2 -translate-y-1/2 z-30 p-6 bg-white/90 backdrop-blur-sm rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)] hover:bg-black hover:text-white transition-all border border-gray-50 hidden lg:flex active:scale-75 items-center justify-center group/btn"
              >
                <ChevronLeft size={36} className="group-hover/btn:-translate-x-1 transition-transform" />
              </button>
              
              <div ref={menuScrollRef} className="flex overflow-x-auto gap-12 pb-20 px-4 -mx-4 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing">
                {filteredMenu.map(item => (
                  <div key={item.id} onDoubleClick={() => toggleLike(item.id)} className="flex-none w-[320px] md:w-[450px] snap-center group/card flex flex-col">
                    <div className="relative aspect-[4/5] rounded-[5rem] overflow-hidden mb-12 shadow-[0_20px_60px_rgba(0,0,0,0.1)] transition-all duration-1000 group-hover/card:shadow-orange-200 group-hover/card:translate-y-[-10px]">
                      <img src={item.img || "https://via.placeholder.com/800"} className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-110" alt={item.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                      <button onClick={() => toggleLike(item.id)} className={`absolute top-10 right-10 p-6 rounded-full glass transition-all ${myLikes.includes(item.id) ? 'text-red-500 scale-125' : 'text-gray-900 opacity-0 group-hover/card:opacity-100'}`}><Heart size={28} fill={myLikes.includes(item.id) ? "currentColor" : "none"}/></button>
                      <div className="absolute bottom-12 left-12 right-12 text-white">
                        <span className="text-xs font-black uppercase tracking-[0.4em] text-orange-400 mb-5 block underline underline-offset-8 decoration-2">Premium Dish</span>
                        <h3 className="text-4xl font-black mb-5 tracking-tight leading-tight uppercase">{item.name}</h3>
                        <p className="text-base font-bold leading-relaxed line-clamp-2 italic opacity-90">{item.desc || "명장의 비법으로 조리한 깊은 풍미의 메뉴입니다."}</p>
                      </div>
                    </div>
                    <div className="px-10 flex justify-between items-center">
                      <span className="text-5xl font-black italic tracking-tightest text-gray-900"><span className="text-xl not-italic mr-3 text-gray-300 font-black">₩</span>{item.price}</span>
                      <div className="flex items-center gap-3 bg-white border border-gray-100 px-6 py-2.5 rounded-full shadow-lg"><Heart size={20} className="text-red-400" fill="currentColor"/><span className="text-lg text-gray-400 font-black">{item.likes || 0}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => scrollMenu('right')} 
                className="absolute right-[-30px] top-1/2 -translate-y-1/2 z-30 p-6 bg-white/90 backdrop-blur-sm rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.1)] hover:bg-black hover:text-white transition-all border border-gray-50 hidden lg:flex active:scale-75 items-center justify-center group/btn"
              >
                <ChevronRight size={36} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>

          {/* 리뷰 섹션 */}
          <section className="w-full relative overflow-hidden py-24 flex flex-col items-center">
            <div className="text-center mb-32 flex flex-col items-center gap-10">
              <div className="flex flex-col items-center">
                <h2 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter italic text-gray-900">손님들의 이야기</h2>
                <div className="h-2 w-32 bg-orange-600 rounded-full mb-8"></div>
                <p className="text-gray-400 text-xl font-black tracking-widest">청궁을 다녀가신 소중한 분들의 실제 후기</p>
              </div>
              
              {settings.naverReviewUrl && (
                <a 
                  href={settings.naverReviewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-5 px-14 py-6 bg-[#2DB400] text-white rounded-full text-xl font-black shadow-2xl hover:brightness-110 transition-all active:scale-95 group shadow-green-200"
                >
                  <MessageSquare size={28} className="group-hover:rotate-12 transition-transform" /> 
                  네이버 리뷰 전체보기 
                  <ChevronRight size={24} />
                </a>
              )}
            </div>
            
            <div className="flex animate-marquee gap-12 md:gap-20">
              {[...settings.reviews, ...settings.reviews].map((rev, i) => (
                <div key={i} className="w-[400px] md:w-[600px] glass p-16 md:p-24 rounded-[6rem] shadow-sm shrink-0 flex flex-col justify-between border-gray-100/50">
                  <div className="relative">
                    <Quote className="absolute -top-12 -right-12 text-orange-100 opacity-25" size={200} />
                    <div className="flex items-center gap-10 mb-16 relative z-10">
                      <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center font-black text-orange-600 text-4xl border border-gray-50 shadow-inner uppercase shrink-0">
                        {rev.author?.[0]}
                      </div>
                      <div>
                        <div className="font-black text-3xl text-gray-900 mb-3">{rev.author}</div>
                        <div className="flex text-orange-400 text-sm gap-1.5">
                           {[...Array(5)].map((_, s) => <Star key={s} size={24} fill={s < (rev.rating || 5) ? "currentColor" : "none"} />)}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-800 italic break-keep leading-relaxed text-3xl font-black">"{rev.text}"</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 오시는 길 */}
          <section id="map-area" className="w-full max-w-screen-xl space-y-20 flex flex-col items-center text-center">
            <div className="flex flex-col items-center gap-12 w-full">
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter italic text-gray-900">오시는 길</h2>
              <div className="h-2 w-32 bg-orange-600 rounded-full"></div>
              
              <div className="space-y-10">
                <p className="text-gray-900 text-4xl md:text-6xl font-black underline decoration-orange-300 underline-offset-[15px] decoration-[10px] break-all tracking-tighter px-4">{settings.address}</p>
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 pt-12">
                   <a href={`tel:${settings.phone}`} className="flex items-center gap-5 px-12 py-6 bg-white border-2 border-gray-100 rounded-full text-2xl font-black hover:bg-gray-50 transition-all shadow-xl">
                        <PhoneCall size={32} className="text-orange-500" /> {settings.phone}
                   </a>
                   {settings.naverMapUrl && (
                     <a href={settings.naverMapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-5 px-16 py-7 bg-orange-600 text-white rounded-full text-2xl font-black hover:bg-black shadow-2xl transition-all active:scale-95 group shadow-orange-200">
                        <Navigation size={36} fill="currentColor" className="group-hover:rotate-12 transition-transform" />
                        네이버 지도로 길찾기
                     </a>
                   )}
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="w-full bg-gray-950 py-48 text-center px-6 mt-32">
          <h2 className="text-6xl font-black mb-12 italic text-white tracking-tighter uppercase">{settings.name}</h2>
          <div className="flex justify-center gap-16 text-white/30 font-black text-lg uppercase tracking-[0.4em] mb-20">
              <span className="hover:text-orange-500 cursor-pointer transition-all hover:scale-110">인스타그램</span>
              <span className="hover:text-orange-500 cursor-pointer transition-all hover:scale-110">네이버</span>
              <span className="hover:text-orange-500 cursor-pointer transition-all hover:scale-110">카카오톡</span>
          </div>
          <div className="w-20 h-1 bg-orange-600 mx-auto mb-12 rounded-full opacity-40"></div>
          <p className="text-white/20 text-xs font-black tracking-[0.8em] uppercase">Traditional Chinese Gourmet Excellence Since 1994</p>
        </footer>
      </div>

      {/* [관리자 페이지] */}
      {isAdminMode && (
        <div className="fixed inset-0 z-[200] bg-[#fcfaf8] overflow-y-auto animate-in slide-in-from-right duration-500">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <header className="sticky top-0 z-50 glass p-10 rounded-[3.5rem] shadow-xl border border-white mb-20 flex items-center justify-between">
              <div className="flex items-center gap-6 text-gray-900">
                <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center text-white shadow-2xl">
                    <Settings size={32} />
                </div>
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic text-gray-900">관리자 센터</h2>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">Main Dashboard</p>
                </div>
              </div>
              <button onClick={() => setIsAdminMode(false)} className="p-4 bg-gray-900 text-white rounded-full hover:bg-orange-600 transition-all shadow-lg active:scale-90"><X size={28}/></button>
            </header>

            <div className="space-y-32 pb-40 text-gray-900">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {['공지사항', '메뉴 관리', '후기 관리', '가게 정보'].map((menu, i) => (
                    <button key={menu} onClick={() => scrollToAdminSection([adminNoticeRef, adminMenuRef, adminReviewRef, adminBrandingRef][i])} className="p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm font-black text-gray-900 hover:bg-gray-50 transition-all text-xs tracking-widest">{menu}</button>
                ))}
              </div>

              {/* 공지사항 설정 */}
              <section ref={adminNoticeRef} className="space-y-10 scroll-mt-32">
                <h3 className="text-3xl font-black border-l-8 border-orange-500 pl-6 italic">공지사항 설정</h3>
                <textarea value={settings.notice} onChange={(e) => setSettings({...settings, notice: e.target.value})} className="w-full p-12 bg-white rounded-[4rem] border-2 border-orange-100 outline-none font-black text-2xl min-h-[200px] shadow-sm focus:ring-[16px] ring-orange-50 transition-all" />
              </section>

              {/* 메뉴 관리 */}
              <section ref={adminMenuRef} className="space-y-12 scroll-mt-32">
                <h3 className="text-3xl font-black border-l-8 border-orange-500 pl-6 italic">메뉴 리스트</h3>
                <div className="grid gap-12">
                  {settings.menuItems.map((item, idx) => (
                    <div key={item.id} className="p-12 bg-white rounded-[5rem] border border-gray-100 shadow-sm group">
                      <div className="flex justify-between items-center mb-12"><span className="px-8 py-2.5 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase">메뉴 #{idx+1}</span><button onClick={() => { const ni = [...settings.menuItems]; ni.splice(idx, 1); setSettings({...settings, menuItems: ni}); }} className="text-red-200 hover:text-red-500 transition-all hover:scale-110"><Trash2 size={32} /></button></div>
                      <div className="grid md:grid-cols-2 gap-12">
                        <div className="space-y-8">
                            <input value={item.name} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].name = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-8 bg-gray-50 rounded-[2rem] outline-none font-black text-3xl" placeholder="메뉴 이름" />
                            <input value={item.price} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].price = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-8 bg-gray-50 rounded-[2rem] outline-none font-black text-3xl" placeholder="판매 가격" />
                        </div>
                        <textarea value={item.desc} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].desc = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-8 bg-gray-50 rounded-[2.5rem] outline-none font-bold text-lg min-h-[220px]" placeholder="설명을 입력하세요." />
                      </div>
                      <div className="flex items-center gap-8 mt-10">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-gray-100 overflow-hidden border-4 border-white shadow-xl shrink-0">{item.img ? <img src={item.img} className="w-full h-full object-cover" /> : <Upload size={32} className="m-auto text-gray-300 h-full"/>}</div>
                        <label className="px-10 py-5 bg-black text-white rounded-2xl text-xs font-black cursor-pointer hover:bg-orange-600 shadow-xl active:scale-95">사진 업데이트<input type="file" className="hidden" onChange={(e) => { const reader = new FileReader(); reader.onloadend = () => { const ni = [...settings.menuItems]; ni[idx].img = reader.result; setSettings({...settings, menuItems: ni}); }; reader.readAsDataURL(e.target.files[0]); }} /></label>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, menuItems: [...settings.menuItems, {id: Date.now(), name: "신메뉴", price: "0", desc: "", category: "전체", isRecommended: false, likes: 0}]})} className="w-full py-28 border-4 border-dashed border-gray-100 rounded-[6rem] text-gray-300 hover:text-orange-500 font-black flex items-center justify-center gap-8 text-3xl uppercase tracking-widest active:scale-[0.98]"><Plus size={72} /> 메뉴 추가</button>
                </div>
              </section>

              {/* 후기 관리 */}
              <section ref={adminReviewRef} className="space-y-12 scroll-mt-32">
                <h3 className="text-3xl font-black border-l-8 border-orange-500 pl-6 italic">후기 리스트</h3>
                <div className="grid gap-12">
                   {settings.reviews.map((rev, idx) => (
                    <div key={idx} className="p-12 bg-white rounded-[5rem] border border-gray-100 shadow-sm space-y-10">
                      <div className="flex justify-between items-center"><span className="px-8 py-2.5 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest font-black">후기 #{idx+1}</span><button onClick={() => { const nr = [...settings.reviews]; nr.splice(idx, 1); setSettings({...settings, reviews: nr}); }} className="text-red-200 hover:text-red-500 transition-all hover:scale-110"><Trash2 size={32}/></button></div>
                      <div className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-4"><label className="text-[10px] font-black text-gray-300 uppercase ml-4 tracking-widest">작성자 성함</label><input value={rev.author} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].author = e.target.value; setSettings({...settings, reviews: nr}); }} placeholder="작성자 이름" className="w-full p-8 bg-gray-50 rounded-[2rem] outline-none font-black text-2xl" /></div>
                        <div className="space-y-4"><label className="text-[10px] font-black text-gray-300 uppercase ml-4 tracking-widest">별점 설정</label><select value={rev.rating || 5} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].rating = parseInt(e.target.value); setSettings({...settings, reviews: nr}); }} className="w-full p-8 bg-gray-50 rounded-[2rem] outline-none font-black text-2xl appearance-none font-black text-orange-500"><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option><option value="2">★★</option><option value="1">★</option></select></div>
                      </div>
                      <div className="space-y-4"><label className="text-[10px] font-black text-gray-300 uppercase ml-4 tracking-widest font-black">후기 본문 내용</label><textarea value={rev.text} onChange={(e) => { const nr = [...settings.reviews]; nr[idx].text = e.target.value; setSettings({...settings, reviews: nr}); }} className="w-full p-8 bg-gray-50 rounded-[2rem] outline-none font-black text-xl min-h-[160px] leading-relaxed" placeholder="리뷰 본문을 입력하세요." /></div>
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, reviews: [...settings.reviews, {author: "단골 손님", rating: 5, text: ""}]})} className="w-full py-20 border-4 border-dashed border-gray-100 rounded-[5rem] text-gray-300 hover:text-orange-500 font-black flex items-center justify-center gap-6 text-2xl active:scale-95 transition-all"><Plus size={40} /> 후기 수동 추가</button>
                </div>
              </section>

              {/* 가게 정보 설정 */}
              <section ref={adminBrandingRef} className="space-y-12 scroll-mt-32">
                <h3 className="text-3xl font-black border-l-8 border-orange-500 pl-6 italic text-gray-900">가게 정보 설정</h3>
                <div className="p-12 bg-white rounded-[6rem] border border-gray-100 shadow-sm space-y-20">
                  
                  {/* 배너 사진 수정 */}
                  <div className="space-y-8 text-center md:text-left">
                    <label className="text-xs font-black text-gray-400 uppercase ml-6 tracking-[0.4em] block font-black">홈페이지 메인 배너 사진</label>
                    <div className="flex flex-col md:flex-row items-center gap-12 bg-gray-50 p-10 rounded-[4rem]">
                      <div className="w-full md:w-80 h-44 rounded-3xl overflow-hidden border-4 border-white shadow-2xl shrink-0 bg-white">
                        <img src={settings.introImg} className="w-full h-full object-cover" alt="배너 미리보기" />
                      </div>
                      <div className="flex flex-col gap-6 w-full">
                        <p className="text-sm font-black text-gray-400 font-black">가게의 이미지를 결정하는 가장 중요한 사진입니다.</p>
                        <label className="px-10 py-6 bg-black text-white rounded-full text-xs font-black cursor-pointer hover:bg-orange-600 transition-all shadow-2xl text-center active:scale-95 uppercase tracking-widest font-black">새 사진 업로드하기
                          <input type="file" className="hidden" onChange={(e) => { 
                            const reader = new FileReader(); 
                            reader.onloadend = () => setSettings({...settings, introImg: reader.result}); 
                            reader.readAsDataURL(e.target.files[0]); 
                          }} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div className="grid md:grid-cols-2 gap-10 font-black">
                        <div className="space-y-3"><label className="text-[10px] font-black text-gray-300 ml-4 uppercase">매장 전화번호</label><input value={settings.phone} onChange={(e) => setSettings({...settings, phone: e.target.value})} className="w-full p-8 bg-gray-50 rounded-[2rem] outline-none font-black text-2xl" /></div>
                        <div className="space-y-3"><label className="text-[10px] font-black text-gray-300 ml-4 uppercase tracking-widest">매장 위치 주소</label><input value={settings.address} onChange={(e) => setSettings({...settings, address: e.target.value})} className="w-full p-8 bg-gray-50 rounded-[2rem] outline-none font-black text-2xl tracking-tighter" /></div>
                    </div>
                    <div className="space-y-8 pt-8 border-t border-gray-50 font-black">
                        <label className="text-[10px] font-black text-gray-300 ml-4 uppercase font-black tracking-widest">네이버 지도 공유 링크 (길찾기 버튼용)</label>
                        <input value={settings.naverMapUrl} onChange={(e) => setSettings({...settings, naverMapUrl: e.target.value})} className="w-full p-8 bg-gray-50 rounded-[2.5rem] outline-none font-black text-sm" placeholder="네이버 지도 공유 URL(https://naver.me/...)을 복사해 넣으세요." />
                        <label className="text-[10px] font-black text-gray-300 ml-4 uppercase font-black tracking-widest">네이버 리뷰 페이지 링크 (리뷰 보기용)</label>
                        <input value={settings.naverReviewUrl} onChange={(e) => setSettings({...settings, naverReviewUrl: e.target.value})} className="w-full p-8 bg-gray-50 rounded-[2.5rem] outline-none font-black text-sm shadow-inner" placeholder="스마트플레이스 리뷰 탭 링크를 넣으세요." />
                    </div>
                    <div className="space-y-3 pt-8 font-black"><label className="text-[10px] font-black text-gray-300 ml-4 uppercase font-black tracking-widest">가게 상호명</label><input value={settings.name} onChange={(e) => setSettings({...settings, name: e.target.value})} className="w-full p-8 bg-gray-50 rounded-[3rem] outline-none font-black text-6xl text-orange-600 italic tracking-tighter" /></div>
                    <div className="space-y-3 pt-8 font-black"><label className="text-[10px] font-black text-gray-300 ml-4 uppercase font-black tracking-widest tracking-widest">매장 핵심 소개글</label><textarea value={settings.introText} onChange={(e) => setSettings({...settings, introText: e.target.value})} className="w-full p-12 bg-gray-50 rounded-[5rem] outline-none font-black text-3xl leading-relaxed tracking-tighter" /></div>
                  </div>
                </div>
              </section>

              <button onClick={() => { saveSettings(settings); setIsAdminMode(false); }} className="w-full bg-orange-600 text-white py-16 rounded-[8rem] font-black text-5xl hover:bg-black shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-10 uppercase tracking-[0.2em] shadow-orange-100">
                <Save size={64}/> 전체 저장 및 종료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [관리자 로그인 모달] */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white/10 w-full max-w-sm rounded-[5rem] p-20 text-center border border-white/10 shadow-2xl">
            <div className="w-28 h-28 bg-white text-black rounded-[3.5rem] flex items-center justify-center mx-auto mb-16 shadow-2xl">
                <Lock size={56} />
            </div>
            <h3 className="text-3xl font-black text-white mb-20 tracking-[0.4em] italic font-black">관리자 인증</h3>
            <form onSubmit={handleVerifyPasscode} className="space-y-20 font-black">
              <input 
                type="password" 
                required 
                autoFocus 
                value={passcodeInput} 
                onChange={(e)=>setPasscodeInput(e.target.value)} 
                className="w-full bg-transparent border-b-4 border-white/20 p-8 text-center text-6xl font-black text-white outline-none focus:border-orange-600 transition-all tracking-[0.5em] focus:tracking-[0.8em]" 
                placeholder="••••••••" 
                maxLength={8}
              />
              <div className="space-y-8 font-black">
                <button type="submit" className="w-full bg-white text-black py-10 rounded-full font-black text-2xl hover:bg-orange-600 hover:text-white transition-all shadow-2xl active:scale-95 font-black uppercase">인증 확인</button>
                <button type="button" onClick={()=>setIsAuthModalOpen(false)} className="w-full text-white/30 text-sm font-black hover:text-white uppercase tracking-[0.4em] font-black">인증 취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 관리자 진입 버튼 */}
      {!isAdminMode && (
        <button onClick={() => setIsAuthModalOpen(true)} className="fixed bottom-10 right-10 p-6 text-gray-300 hover:text-gray-900 transition-all z-[100] opacity-5 hover:opacity-100 bg-white/30 backdrop-blur rounded-full border border-white/30 shadow-2xl transition-all duration-700 hover:scale-110 active:rotate-90"><Settings size={32} /></button>
      )}
    </div>
  );
};

export default App;