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

// --- [필독] 사장님 설정 ---
const ADMIN_PASSCODE = "1234"; 
const apiKey = ""; // Gemini API Key (AI 기능 사용 시 입력)

// 사장님 Firebase 설정
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
const appId = "premium-store-final-v2"; 

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
    notice: "저희 청궁을 찾아주셔서 감사합니다. 제철 재료로 정성을 다해 모시겠습니다. 현재 매 주 화요일은 정기 휴무입니다.",
    introImg: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=1200",
    introText: "30년 전통의 깊은 맛, 명장의 손길로 빚어낸 정통 중화요리의 정수를 선보입니다.",
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
    <div className="min-h-screen bg-[#fcfaf8] text-[#1a1a1a] selection:bg-orange-100">
      
      {/* [메인 서비스 화면] */}
      <div className={`${isAdminMode ? 'hidden' : 'block animate-in fade-in duration-1000'}`}>
        
        {/* 상단 배너 - 크기 축소 (50vh) 및 가독성 강화 */}
        <header className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src={settings.introImg} className="w-full h-full object-cover" alt="가게 배경" />
            <div className="absolute inset-0 bg-black/50"></div>
          </div>
          <div className="relative z-10 text-center px-6 max-w-4xl">
            <span className="inline-block font-serif italic text-orange-400 text-base md:text-lg mb-4 tracking-widest uppercase">Traditional Gourmet</span>
            <h1 className="text-5xl md:text-8xl font-black text-white mb-6 tracking-tighter leading-none break-keep drop-shadow-2xl">
              {settings.name}
            </h1>
            <p className="text-base md:text-xl text-white/90 font-medium max-w-xl mx-auto leading-relaxed break-keep">
              {settings.introText}
            </p>
          </div>
        </header>

        {/* 메인 컨텐츠 영역 */}
        <main className="max-w-screen-xl mx-auto px-6 md:px-12 py-20 space-y-32">
          
          {/* 공지사항 섹션 - 전문가 스타일 */}
          {settings.notice && (
            <section className="animate-in slide-in-from-bottom-4 duration-700">
              <div className="glass p-8 md:p-12 rounded-[3rem] flex flex-col md:flex-row items-center gap-8 border-orange-100 border-2">
                <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                  <Bell size={32} className="animate-bounce" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-black mb-2 text-orange-600">가게 소식</h3>
                  <p className="text-lg md:text-xl font-bold leading-relaxed break-keep text-gray-800">
                    {settings.notice}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* 영업 시간 - 요일별 한국어 표기 */}
          <section className="space-y-12">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">영업 시간</h2>
              <div className="w-10 h-1 bg-orange-600 mx-auto rounded-full"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
              {daysOrder.map((day) => {
                const info = settings.openingHours[day];
                const isToday = daysOrder[new Date().getDay()] === day;
                return (
                  <div key={day} className={`p-6 rounded-[2rem] text-center transition-all duration-500 border ${isToday ? 'bg-gray-900 text-white shadow-2xl scale-105 border-gray-900' : 'bg-white border-gray-100'}`}>
                    <div className={`text-xs font-black mb-4 ${isToday ? 'text-orange-500' : 'text-gray-300'}`}>{daysKor[day]}요일</div>
                    <div className="text-sm font-black leading-snug">
                      {info.active ? <>{info.open}<br/><span className="text-[10px] opacity-30 font-normal">~</span><br/>{info.close}</> : <span className="text-red-400 italic">정기휴무</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 메뉴판 섹션 - 명확한 한글 타이틀 */}
          <section id="menu-list" className="space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-end gap-8">
              <div className="text-left">
                <h2 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter">추천 메뉴</h2>
                <p className="text-gray-400 text-base font-bold tracking-tight">청궁이 제안하는 최상의 미식 경험입니다.</p>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
                {settings.categories.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`px-8 py-3 rounded-full text-sm font-black transition-all border ${activeCategory === cat ? 'bg-black border-black text-white shadow-xl' : 'bg-white border-gray-100 text-gray-400 hover:text-black'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group">
              <div 
                ref={menuScrollRef} 
                className="flex overflow-x-auto gap-8 pb-10 px-2 -mx-2 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing"
              >
                {filteredMenu.map(item => (
                  <div 
                    key={item.id} 
                    onDoubleClick={() => toggleLike(item.id)}
                    className="flex-none w-[280px] md:w-[350px] snap-center group"
                  >
                    <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden mb-6 shadow-md transition-all duration-700 hover:shadow-2xl">
                      <img src={item.img || "https://via.placeholder.com/600"} className="w-full h-full object-cover img-hover-zoom" alt={item.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-40 group-hover:opacity-80 transition-opacity"></div>
                      <button 
                        onClick={() => toggleLike(item.id)} 
                        className={`absolute top-6 right-6 p-4 rounded-full glass transition-all ${myLikes.includes(item.id) ? 'text-red-500 scale-110' : 'text-gray-900 opacity-0 group-hover:opacity-100'}`}
                      >
                        <Heart size={20} fill={myLikes.includes(item.id) ? "currentColor" : "none"}/>
                      </button>
                      <div className="absolute bottom-8 left-8 right-8 text-white">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2 block">{item.category}</span>
                        <h3 className="text-2xl font-black mb-2 tracking-tight">{item.name}</h3>
                        <p className="text-xs font-medium leading-relaxed line-clamp-2 italic opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                          {item.desc || "명장의 비법으로 탄생한 깊은 풍미를 느껴보세요."}
                        </p>
                      </div>
                    </div>
                    <div className="px-4 flex justify-between items-center">
                      <span className="text-2xl font-black italic text-gray-900 tracking-tighter">
                        <span className="text-sm not-italic mr-1 text-gray-400 font-bold">₩</span>
                        {item.price}
                      </span>
                      <div className="flex items-center gap-1.5 bg-white border border-gray-100 px-3 py-1 rounded-full shadow-sm">
                        <Heart size={12} className="text-red-400" fill="currentColor"/>
                        <span className="text-xs text-gray-400 font-black">{item.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredMenu.length > 3 && (
                <div className="hidden lg:flex gap-4 absolute -top-20 right-0">
                  <button onClick={() => scrollMenu('left')} className="p-4 rounded-full border border-gray-200 hover:bg-black hover:text-white transition-all shadow-sm"><ChevronLeft size={20}/></button>
                  <button onClick={() => scrollMenu('right')} className="p-4 rounded-full border border-gray-200 hover:bg-black hover:text-white transition-all shadow-sm"><ChevronRight size={20}/></button>
                </div>
              )}
            </div>
          </section>

          {/* 손님들의 이야기 - 무한 롤링 */}
          <section className="relative overflow-hidden py-10">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">손님들의 이야기</h2>
              <p className="text-gray-400 text-sm font-bold tracking-widest uppercase">Customer Feedbacks</p>
            </div>
            <div className="flex animate-marquee gap-8 md:gap-12">
              {[...settings.reviews, ...settings.reviews].map((rev, i) => (
                <div key={i} className="w-[300px] md:w-[450px] glass p-10 rounded-[4rem] shadow-sm shrink-0">
                  <div className="relative">
                    <Quote className="absolute -top-6 -right-6 text-orange-100 opacity-30" size={80} />
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-orange-600 text-xl border border-gray-100 shadow-inner">{rev.author?.[0]}</div>
                      <div>
                        <div className="font-black text-lg">{rev.author}</div>
                        <div className="flex text-orange-400 text-xs mt-1">{"★".repeat(rev.rating || 5)}</div>
                      </div>
                    </div>
                    <p className="text-gray-700 italic break-keep leading-relaxed text-lg font-bold">"{rev.text}"</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 오시는 길 */}
          <section id="map-area" className="space-y-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-gray-100 pb-10">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter">찾아오시는 길</h2>
              {settings.naverReviewUrl && (
                <a href={settings.naverReviewUrl} target="_blank" rel="noopener noreferrer" className="px-10 py-4 bg-black text-white rounded-full text-sm font-bold hover:bg-orange-600 transition-all flex items-center gap-2">
                  지도에서 위치 확인 <ExternalLink size={14}/>
                </a>
              )}
            </div>
            <div className="aspect-[21/9] bg-white rounded-[4rem] border border-gray-100 shadow-2xl flex flex-col items-center justify-center text-gray-200 relative overflow-hidden group">
              <MapPin size={80} className="text-orange-500 animate-pulse relative z-10" />
              <span className="tracking-[0.5em] uppercase italic mt-6 relative z-10 text-[10px] text-gray-400 font-black">지도 연동 준비 중</span>
              <div className="absolute inset-0 opacity-5 grayscale group-hover:grayscale-0 transition-all duration-1000">
                <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover" />
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-white border-t border-gray-50 py-32 text-center px-6">
          <h2 className="text-4xl font-black mb-6 tracking-tighter italic">{settings.name}</h2>
          <p className="text-gray-400 text-[10px] font-black tracking-[0.3em] uppercase mb-12">Traditional Taste Since 1994</p>
        </footer>
      </div>

      {/* [관리자 페이지] */}
      {isAdminMode && (
        <div className="fixed inset-0 z-[200] bg-[#fcfaf8] overflow-y-auto animate-in slide-in-from-right duration-500 font-sans">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <header className="sticky top-0 z-50 glass p-8 rounded-[3rem] shadow-xl border border-white mb-16 flex items-center justify-between">
              <div className="flex items-center gap-4 text-gray-900">
                <Settings size={28} />
                <h2 className="text-2xl font-black">가게 통합 관리</h2>
              </div>
              <button onClick={() => setIsAdminMode(false)} className="p-3 bg-gray-900 text-white rounded-full hover:bg-orange-600 transition-all"><X size={24}/></button>
            </header>

            <div className="space-y-32 pb-40">
              {/* 퀵 메뉴 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => scrollToAdminSection(adminNoticeRef)} className="p-6 bg-white rounded-3xl border border-orange-100 shadow-sm font-black text-orange-600 hover:bg-orange-50 transition-all">공지사항 관리</button>
                <button onClick={() => scrollToAdminSection(adminMenuRef)} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm font-black text-gray-900 hover:bg-gray-50 transition-all">메뉴 리스트</button>
                <button onClick={() => scrollToAdminSection(adminReviewRef)} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm font-black text-gray-900 hover:bg-gray-50 transition-all">리뷰 쇼케이스</button>
                <button onClick={() => scrollToAdminSection(adminBrandingRef)} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm font-black text-gray-900 hover:bg-gray-50 transition-all">브랜딩 설정</button>
              </div>

              {/* 공지사항 관리 섹션 */}
              <section ref={adminNoticeRef} className="space-y-8 scroll-mt-32">
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <Bell className="text-orange-600" /> 가게 공지사항 설정
                </h3>
                <div className="p-10 bg-white rounded-[3rem] border-2 border-orange-100 shadow-sm space-y-6">
                  <p className="text-sm text-gray-400 font-bold">홈페이지 최상단 공지 섹션에 노출되는 문구입니다.</p>
                  <textarea 
                    value={settings.notice} 
                    onChange={(e) => setSettings({...settings, notice: e.target.value})} 
                    className="w-full p-6 bg-gray-50 rounded-[2rem] border-none outline-none font-bold text-lg min-h-[150px] shadow-inner"
                    placeholder="소중한 손님들께 전할 소식을 입력하세요."
                  />
                </div>
              </section>

              {/* 메뉴 관리 */}
              <section ref={adminMenuRef} className="space-y-8 scroll-mt-32">
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <Utensils className="text-gray-900" /> 메뉴판 리스트 관리
                </h3>
                <div className="grid gap-8">
                  {settings.menuItems.map((item, idx) => (
                    <div key={item.id} className="p-8 bg-white rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                      <div className="flex justify-between items-center mb-8 relative z-10">
                        <span className="px-4 py-1.5 bg-gray-900 text-white rounded-full text-[10px] font-black uppercase">Menu #{idx+1}</span>
                        <button onClick={() => { const ni = [...settings.menuItems]; ni.splice(idx, 1); setSettings({...settings, menuItems: ni}); }} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={24} /></button>
                      </div>
                      <div className="grid md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-300 ml-1 uppercase">Name</label>
                            <input value={item.name} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].name = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-5 bg-gray-50 rounded-2xl border-none outline-none font-black text-xl" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-300 ml-1 uppercase">Price</label>
                            <input value={item.price} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].price = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-5 bg-gray-50 rounded-2xl border-none outline-none font-black text-xl" />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-300 ml-1 uppercase">Description</label>
                            <textarea value={item.desc} onChange={(e) => { const ni = [...settings.menuItems]; ni[idx].desc = e.target.value; setSettings({...settings, menuItems: ni}); }} className="w-full p-5 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm min-h-[140px]" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-[2rem] bg-gray-100 overflow-hidden border-2 border-white shadow-lg shrink-0">
                          {item.img ? <img src={item.img} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Upload size={24}/></div>}
                        </div>
                        <label className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-xs font-black cursor-pointer hover:bg-orange-600 transition-all shadow-lg">메뉴 사진 변경
                          <input type="file" className="hidden" onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => { const ni = [...settings.menuItems]; ni[idx].img = reader.result; setSettings({...settings, menuItems: ni}); };
                              reader.readAsDataURL(file);
                            }
                          }} />
                        </label>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setSettings({...settings, menuItems: [...settings.menuItems, {id: Date.now(), name: "새로운 메뉴", price: "0", desc: "", category: "면류", isRecommended: false, likes: 0}]})} className="w-full py-20 border-2 border-dashed border-gray-200 rounded-[4rem] text-gray-300 hover:text-orange-500 hover:border-orange-200 transition-all font-black flex items-center justify-center gap-4 text-2xl"><Plus size={40} /> 메뉴 추가</button>
                </div>
              </section>

              <button onClick={() => { saveSettings(settings); setIsAdminMode(false); }} className="w-full bg-orange-600 text-white py-10 rounded-[3rem] font-black text-2xl hover:bg-black shadow-2xl transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-4">
                <Save size={32}/> 설정 저장 및 사이트 반영
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [인증 모달] */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white/10 w-full max-w-sm rounded-[4rem] p-16 text-center border border-white/10 shadow-2xl">
            <h3 className="text-3xl font-black text-white mb-12 tracking-widest uppercase italic">Administrator</h3>
            <form onSubmit={handleVerifyPasscode} className="space-y-12">
              <input type="password" required autoFocus value={passcodeInput} onChange={(e)=>setPasscodeInput(e.target.value)} className="w-full bg-transparent border-b-2 border-white/20 p-4 text-center text-6xl font-black text-white outline-none focus:border-orange-600 transition-all tracking-[0.5em]" placeholder="••••" />
              <div className="space-y-4">
                <button type="submit" className="w-full bg-white text-black py-6 rounded-full font-black text-xl hover:bg-orange-600 hover:text-white transition-all shadow-xl uppercase">입장하기</button>
                <button type="button" onClick={()=>setIsAuthModalOpen(false)} className="w-full text-white/30 text-xs font-bold hover:text-white transition-all uppercase tracking-widest">취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 우측 하단 관리자 진입 버튼 */}
      {!isAdminMode && (
        <button onClick={() => setIsAuthModalOpen(true)} className="fixed bottom-10 right-10 p-5 text-gray-300 hover:text-gray-900 transition-all z-[100] opacity-5 hover:opacity-100 bg-white/30 backdrop-blur rounded-full shadow-2xl border border-white/30"><Settings size={20} /></button>
      )}
    </div>
  );
};

export default App;