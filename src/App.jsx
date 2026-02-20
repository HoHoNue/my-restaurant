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

// --- [필독] 사장님 설정 영역 ---
const ADMIN_PASSCODE = "1234"; // 관리자 비밀번호
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
const appId = "my-store-final-01"; // 사장님 가게 고유 ID

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

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-400 font-bold">서버 연결 중...</div>;

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 overflow-x-hidden">
      
      {/* 서비스 화면 */}
      <div className={`${isAdminMode ? 'hidden' : 'block animate-in fade-in duration-700'}`}>
        
        {/* 히어로 */}
        <header className="relative h-[80vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0 bg-black">
            <img src={settings.introImg} alt="배경" className="w-full h-full object-cover opacity-60" />
          </div>
          <div className="relative z-10 text-center px-4 text-white">
            <h1 className="text-6xl md:text-8xl font-black mb-6 drop-shadow-2xl italic break-keep">{settings.name}</h1>
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
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
              <div><h2 className="text-4xl font-black mb-2">맛있는 메뉴판</h2><p className="text-gray-400 text-sm">메뉴를 찜하고 확인해 보세요.</p></div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {settings.categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-2 rounded-full text-xs font-bold border transition-all ${activeCategory === cat ? 'bg-black border-black text-white' : 'bg-white text-gray-400'}`}>{cat}</button>
                ))}
              </div>
            </div>

            <div className="flex overflow-x-auto gap-6 pb-12 no-scrollbar snap-x snap-mandatory">
              {filteredMenu.map(item => (
                <div key={item.id} onDoubleClick={() => toggleLike(item.id)} className="flex-none w-[280px] snap-center bg-white p-5 rounded-[3rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all">
                  <div className="relative aspect-square rounded-[2rem] overflow-hidden mb-6 shadow-inner bg-gray-50">
                    <img src={item.img || "https://via.placeholder.com/300"} className="w-full h-full object-cover" />
                    <button onClick={() => toggleLike(item.id)} className={`absolute top-4 right-4 p-3 rounded-full ${myLikes.includes(item.id) ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-400'}`}><Heart size={16} fill={myLikes.includes(item.id) ? "white" : "none"}/></button>
                  </div>
                  <h3 className="text-xl font-black mb-2 line-clamp-1">{item.name}</h3>
                  <p className="text-gray-400 text-xs line-clamp-2 min-h-[3rem] break-keep">{item.desc}</p>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-2xl font-black italic">{item.price}원</span>
                    <span className="text-[10px] text-gray-300 font-bold flex items-center gap-1"><Heart size={10} fill="#ddd"/> {item.likes || 0}</span>
                  </div>
                </div>
              ))}
              {filteredMenu.length === 0 && <div className="w-full py-40 text-center text-gray-300 font-bold">메뉴를 등록해 주세요.</div>}
            </div>
          </section>

          {/* 리뷰 슬라이드 */}
          <section className="relative overflow-hidden py-10">
            <h2 className="text-center text-4xl font-black mb-12">손님들의 이야기</h2>
            <div className="flex animate-marquee gap-8">
              {[...settings.reviews, ...settings.reviews].map((rev, i) => (
                <div key={i} className="w-[350px] bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm shrink-0">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center font-black text-orange-500 text-xl">{rev.author?.[0]}</div>
                    <div><div className="font-black">{rev.author}</div><div className="flex text-orange-400 text-xs">{"⭐".repeat(rev.rating || 5)}</div></div>
                  </div>
                  <p className="text-gray-600 italic break-keep">"{rev.text}"</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="bg-gray-900 text-white py-20 text-center">
          <h2 className="text-2xl font-black mb-2">{settings.name}</h2>
          <p className="text-gray-500 text-xs">© 2024 {settings.name}. All Rights Reserved.</p>
        </footer>
      </div>

      {/* 관리자 진입 */}
      {!isAdminMode && (
        <button onClick={() => setIsAuthModalOpen(true)} className="fixed bottom-6 right-6 p-4 text-gray-200 hover:text-gray-800 transition-all opacity-10 hover:opacity-100"><Settings size={16}/></button>
      )}

      {/* 인증 모달 */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-12 text-center shadow-2xl">
            <h3 className="text-2xl font-black mb-8">사장님 인증</h3>
            <form onSubmit={handleVerifyPasscode} className="space-y-6">
              <input type="password" required autoFocus value={passcodeInput} onChange={(e)=>setPasscodeInput(e.target.value)} className="w-full p-5 bg-gray-100 rounded-3xl text-center text-3xl font-black outline-none focus:ring-4 ring-orange-500/20" placeholder="••••" />
              <button type="submit" className="w-full bg-black text-white py-5 rounded-3xl font-black">입장하기</button>
              <button type="button" onClick={()=>setIsAuthModalOpen(false)} className="text-gray-400 text-xs font-bold">취소</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;