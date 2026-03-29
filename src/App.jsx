import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import './App.css'
import { auth, googleProvider } from './firebase'
import { 
  ArrowRight, ArrowLeft, Check, Play, Globe, Menu, Wallet, Bell, MessageCircle, ChevronsRight, XCircle, CheckCircle,
  Home, List, Users, BookOpen, ClipboardList, ClipboardCheck, CheckCircle2, Youtube, Building2, Briefcase, Landmark, Lightbulb, ListChecks, Tag, Newspaper, History, User, PhoneCall, LogOut, CircleDollarSign,
  Instagram, Facebook, Smartphone
} from 'lucide-react'

// Illustrations
import welcomeImg from './assets/welcome_onboarding.png'
import docsImg from './assets/documents_onboarding.png'
import workImg from './assets/work_onboarding.png'
import paymentImg from './assets/payment_onboarding.png'
import loginImg from './assets/login_illustration.png'
import activatedImg from './assets/activated_illustration.png'
import captchaImg from './assets/captcha.png'
import centralLogo from './assets/logo.svg'
import walletIllustration from './assets/wallet_illustration.png'
import referralWalletIllustration from './assets/referral_wallet_illustration.png'

const slides = [
  {
    id: 1,
    title: <h1 className="welcome-text">Welcome to <br /><span className="highlight">Premium 24</span></h1>,
    subtitle: "Access App anytime, anywhere on mobile or computer & learn and earn unlimited daily",
    illustration: welcomeImg,
    type: 'welcome'
  },
  {
    id: 2,
    title: <h1 className="welcome-text"><span className="highlight">In This Application</span></h1>,
    items: [
      "Courses Learning",
      "Edu - Exam Portal Access",
      "Captcha Learning",
      "Govt. Job Information",
      "Jobs Information",
      "Govt. Exam Information",
      "English Speaking",
      "General Knowledge Questions",
      "Surveys",
      "Discounts",
      "Referral",
      "Priority support and ticket feature"
    ],
    type: 'list'
  },
  {
    id: 3,
    title: <h1 className="welcome-text">We have <br /><span className="highlight">Government-Issued</span> <br />Documents</h1>,
    subtitle: "We have all these documents like MCA, ISO, GST, PAN, TAN, Udyam, Udyog Aadhar. If you want more details about documents please email us at",
    email: "help@techaircraft.com",
    illustration: docsImg,
    type: 'documents'
  },
  {
    id: 4,
    title: <h1 className="welcome-text">Start Working</h1>,
    subtitle: "Start app & learn and earn Cash. Repeat",
    illustration: workImg,
    type: 'work'
  },
  {
    id: 5,
    title: <h1 className="welcome-text">Receive Payments</h1>,
    subtitle: "Receive payment directly to your bank account",
    illustration: paymentImg,
    type: 'payment'
  }
]

function App() {
  const [appState, setAppState] = useState('language_selection') // 'language_selection', 'onboarding', or 'login'
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeMenuData, setActiveMenuData] = useState(null)
  const [purchasePopup, setPurchasePopup] = useState(null)
  const [referralWalletPopup, setReferralWalletPopup] = useState(false)
  const [selectedReferralWallet, setSelectedReferralWallet] = useState('survey')
  const [selectedScheme, setSelectedScheme] = useState('offer')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [paymentProofsPopup, setPaymentProofsPopup] = useState(false)
  const [supportPopup, setSupportPopup] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [currentLanguage, setCurrentLanguage] = useState('en')
  const [userPlan, setUserPlan] = useState('Demo') // 'Demo', 'Gold', 'Platinum', 'Silver Plus'

  
  const translations = {
    en: {
      home: "Home", plans: "Plans", wallet: "Wallet", referralWallet: "Referral Wallet", myCourses: "My Courses",
      englishSpeaking: "English Speaking", eduExamPortal: "Edu-Exam Portal", paymentProofs: "Payment Proofs",
      youtube: "Youtube", govtJobInfo: "Govt Job Info", jobsInfo: "Jobs Info", govtExamInfo: "Govt Exam Info",
      generalKnowledge: "General Knowledge", survey: "Survey", withdrawHistory: "Withdraw History",
      myAccount: "My Account", support: "Support", logout: "Logout User", startDemo: "Start demo work",
      buyPlan: "Buy Plan", selectPlan: "SELECT PLAN", claimIt: "CLAIM IT", tryAgain: "TRY AGAIN",
      congrats: "Congratulations!!", got5Coin: "You got 5 coin", oops: "Oops!", wrongCaptcha: "Wrong Captcha. Please try again.",
      numbers: "Numbers", enterCaptcha: "Enter Captcha", submit: "Submit", skip: "SKIP", referEarn: "Refer & Earn",
      langLabel: "हिंदी", totalWithdrawn: "Total Withdrawn", editProfile: "Edit Profile", appLang: "App Language",
      verificationPending: "KYC Pending", verifyIdentity: "Verify identity to withdraw", verify: "Verify",
      free: "FREE", lifetime: "Lifetime Validity", unlimited: "Unlimited Earning", unlimitedCaptcha: "Unlimited Captcha",
      work24h: "Work 24 hours", surveyEarning: "Surveys", coursesFeature: "Courses + (All Features)",
      jobsInfoFeature: "Jobs Info", eduAcademy: "Edu Academy Access", directPayment: "Start direct payment",
      refundable: "(Refundable)", inclusiveTax: "* Including of all taxes", noteRefund: "Note - This fee is to access all the paid features and will be refunded when you learn and earn 35000 rs/-",
      totalReferral: "Total Referral", yourLink: "Your Referral Link", withdrawCap: "WITHDRAW", copy: "COPY",
      forSupport: "For support or enquiry, email us at", tutorials: "App Tutorials", learnMaximize: "Learn how to maximize your earnings"
    },
    hi: {
      home: "होम", plans: "योजनाएं", wallet: "वॉलेट", referralWallet: "रेफरल वॉलेट", myCourses: "मेरे कोर्स",
      englishSpeaking: "अंग्रेजी बोलना", eduExamPortal: "शिक्षा-परीक्षा पोर्टल", paymentProofs: "भुगतान प्रमाण",
      youtube: "यूट्यूब", govtJobInfo: "सरकारी नौकरी", jobsInfo: "नौकरी जानकारी", govtExamInfo: "सरकारी परीक्षा",
      generalKnowledge: "सामान्य ज्ञान", survey: "सर्वेक्षण", withdrawHistory: "निकासी इतिहास",
      myAccount: "मेरा खाता", support: "सहायता", logout: "लॉगआउट", startDemo: "डेमो शुरू करें",
      buyPlan: "योजना खरीदें", selectPlan: "योजना चुनें", claimIt: "दावा करें", tryAgain: "फिर से प्रयास करें",
      congrats: "बधाई हो!!", got5Coin: "आपको 5 सिक्के मिले", oops: "ओह!", wrongCaptcha: "गलत कैप्चा। कृपया फिर प्रयास करें।",
      numbers: "संख्या", enterCaptcha: "कैप्चा भरें", submit: "सबमिट", skip: "छोड़ें", referEarn: "रेफर और कमाएं",
      langLabel: "English", totalWithdrawn: "कुल निकासी", editProfile: "प्रोफ़ाइल बदलें", appLang: "ऐप की भाषा",
      verificationPending: "केवाईसी लंबित", verifyIdentity: "पैसे निकालने के लिए पहचान सत्यापित करें", verify: "सत्यापित करें",
      free: "मुफ़्त", lifetime: "आजीवन वैधता", unlimited: "असीमित कमाई", unlimitedCaptcha: "असीमित कैप्चा",
      work24h: "24 घंटे काम", surveyEarning: "सर्वेक्षण", coursesFeature: "कोर्स + (सभी सुविधाएं)",
      jobsInfoFeature: "नौकरी जानकारी", eduAcademy: "एजु अकादमी एक्सेस", directPayment: "सीधा भुगतान शुरू करें",
      refundable: "(प्रतिदेय)", inclusiveTax: "* सभी करों सहित", noteRefund: "नोट - यह शुल्क सभी भुगतान सुविधाओं तक पहुँचने के लिए है और जब आप 35000 रुपये कमा लेंगे तो वापस कर दिया जाएगा",
      totalReferral: "कुल रेफरल", yourLink: "आपका रेफरल लिंक", withdrawCap: "पैसे निकालें", copy: "कॉपी",
      forSupport: "सहायता या पूछताछ के लिए, हमें ईमेल करें", tutorials: "ऐप ट्यूटोरियल", learnMaximize: "अपनी कमाई बढ़ाना सीखें"
    }
  }

  const t = (key) => translations[currentLanguage][key] || key;

  const toggleLanguage = () => {
    setCurrentLanguage(prev => prev === 'en' ? 'hi' : 'en');
  }
  
  // Captcha Demo States
  const [captchaText, setCaptchaText] = useState('')
  const [userInput, setUserInput] = useState('')
  const [successCount, setSuccessCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [totalCoins, setTotalCoins] = useState(0)
  const [captchaResult, setCaptchaResult] = useState(null) // null, 'correct', 'incorrect'
  const [timer, setTimer] = useState(60)
  const canvasRef = useRef(null)

  const drawCaptcha = useCallback((text) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Premium Gradient Background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, '#f1f5f9')
    gradient.addColorStop(0.5, '#ffffff')
    gradient.addColorStop(1, '#f8fafc')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Sophisticated Mesh Noise
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = `rgba(${Math.random()*200},${Math.random()*100},${Math.random()*200},${0.1 + Math.random()*0.1})`
      ctx.lineWidth = 0.5 + Math.random() * 1.5
      ctx.beginPath()
      ctx.moveTo(Math.random()*canvas.width, Math.random()*canvas.height)
      ctx.bezierCurveTo(
        Math.random()*canvas.width, Math.random()*canvas.height, 
        Math.random()*canvas.width, Math.random()*canvas.height, 
        Math.random()*canvas.width, Math.random()*canvas.height
      )
      ctx.stroke()
    }

    // Text with High Fidelity Distortion & Shadow
    ctx.textBaseline = 'middle'
    const space = canvas.width / (text.length + 1)
    
    for (let i = 0; i < text.length; i++) {
        const fonts = ['bold 34px "Courier New"', 'bold 36px "System"', '800 32px "Trebuchet MS"'];
        ctx.save()
        ctx.font = fonts[Math.floor(Math.random() * fonts.length)];
        
        ctx.translate((i + 1) * space + (Math.random() - 0.5) * 10, canvas.height / 2 + (Math.random() - 0.5) * 10)
        ctx.rotate((Math.random() - 0.5) * 0.45)
        
        // Soft Shadow for Depth
        ctx.shadowColor = 'rgba(0,0,0,0.15)'
        ctx.shadowBlur = 6
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
        
        const colors = ['#0f172a', '#1e293b', '#334155', '#475569', '#064e3b', '#d81b60'];
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
        ctx.fillText(text[i], -12, 0)
        ctx.restore()
    }

    // Interactive Mesh Overlay
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${Math.random()*216}, 27, 96, ${Math.random() * 0.08})`
      ctx.beginPath()
      ctx.arc(Math.random()*canvas.width, Math.random()*canvas.height, Math.random() * 2, 0, Math.PI*2)
      ctx.fill()
    }
  }, [])

  const generateCaptcha = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCaptchaText(result)
    // Small delay to ensure canvas is rendered
    setTimeout(() => drawCaptcha(result), 50)
    setTimer(60)
    setUserInput('')
  }, [drawCaptcha])

  useEffect(() => {
    if (appState === 'demo') {
      generateCaptcha()
    }
  }, [appState === 'demo', generateCaptcha])

  useEffect(() => {
    let interval
    if (appState === 'demo' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1)
      }, 1000)
    } else if (timer === 0) {
      generateCaptcha()
    }
    return () => clearInterval(interval)
  }, [appState, timer, generateCaptcha])

  const handleCaptchaSubmit = () => {
    if (!userInput) return
    
    if (userInput.toLowerCase() === captchaText.toLowerCase()) {
      setCaptchaResult('correct')
    } else {
      setCaptchaResult('incorrect')
    }
  }

  const claimCoins = () => {
    setSuccessCount(prev => prev + 1)
    setTotalCoins(prev => prev + 5)
    setCaptchaResult(null)
    generateCaptcha()
  }

  const API_BASE_URL = useMemo(
    () => {
      const configured = (import.meta.env.VITE_API_BASE_URL || '').trim()
      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

      // Force local backend during Vite dev to avoid CORS issues from accidental production URLs.
      if (import.meta.env.DEV && isLocalHost) {
        return 'http://localhost:4000'
      }

      if (!configured) {
        return ''
      }
      return configured.endsWith('/') ? configured.slice(0, -1) : configured
    },
    [],
  )

  const saveSession = (session) => {
    if (session.accessToken) localStorage.setItem('accessToken', session.accessToken)
    if (session.refreshToken) localStorage.setItem('refreshToken', session.refreshToken)
  }

  const mapFirebaseUser = (user) => {
    if (!user) return null
    return {
      id: user.uid,
      username: user.displayName || (user.email ? user.email.split('@')[0] : 'Google User'),
      email: user.email || '',
      role: 'user',
      google_id: user.uid,
    }
  }

  const clearSession = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setCurrentUser(null)
  }

  const fetchMe = async (accessToken) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) {
      throw new Error('Session expired, please sign in again')
    }
    return response.json()
  }

  const handleBackendGoogleLogin = async () => {
    setIsAuthenticating(true)
    setAuthMessage('')
    try {
      const credentialResponse = await signInWithPopup(auth, googleProvider)
      const idToken = await credentialResponse.user.getIdToken()
      if (API_BASE_URL) {
        const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })

        if (response.ok) {
          const data = await response.json()
          saveSession(data)
          setCurrentUser(data.user)
          setAppState('activated')
          return
        }

        // If backend Firebase Admin is not configured, continue with Firebase-only session.
        if (response.status !== 503) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.message || 'Google login failed')
        }
      }

      localStorage.setItem('firebaseIdToken', idToken)
      setCurrentUser(mapFirebaseUser(credentialResponse.user))
      setAppState('activated')
      setAuthMessage('')
    } catch (error) {
      if (error?.code === 'auth/popup-closed-by-user') {
        setAuthMessage('Google sign-in popup was cancelled')
      } else if (error?.code === 'auth/popup-blocked') {
        setAuthMessage('Popup blocked by browser. Please allow popups and try again.')
      } else {
        setAuthMessage(error.message || 'Google login failed')
      }
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
      }
    } catch (_error) {
      // Ignore logout API failures and clear local state anyway.
    } finally {
      try {
        await signOut(auth)
      } catch (_error) {
        // Ignore Firebase sign out issues and clear local state anyway.
      }
      localStorage.removeItem('firebaseIdToken')
      clearSession()
      setIsMenuOpen(false)
      setAppState('login')
    }
  }

  useEffect(() => {
    const restoreBackendSession = async () => {
      const accessToken = localStorage.getItem('accessToken')
      if (!accessToken) {
        return false
      }

      setIsAuthenticating(true)
      try {
        const user = await fetchMe(accessToken)
        setCurrentUser(user)
        setAppState('activated')
        return true
      } catch (_error) {
        clearSession()
        return false
      } finally {
        setIsAuthenticating(false)
      }
    }

    const restoreFirebaseSession = () => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) return
        try {
          const token = await user.getIdToken()
          localStorage.setItem('firebaseIdToken', token)
        } catch (_error) {
          // Ignore token refresh issues on boot.
        }
        setCurrentUser(mapFirebaseUser(user))
        setAppState('activated')
      })
      return unsubscribe
    }

    let unsubscribeFirebase = () => {}
    restoreBackendSession().then((restored) => {
      if (!restored) {
        unsubscribeFirebase = restoreFirebaseSession()
      }
    })

    return () => {
      unsubscribeFirebase()
    }
  }, [API_BASE_URL])

  const handleLanguageSelect = (lang) => {
    setAppState('onboarding')
  }

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      setAppState('login')
    }
  }

  const handleDemo = () => {
    setAppState('demo')
  }

  const handleKnowMore = () => {
    setAppState('video')
  }

  const handleVideoBack = () => {
    setAppState('login')
  }

  const handleMenuClick = (title, Icon) => {
    if (title === 'Home') {
      setAppState('demo')
    } else if (title === 'Plans') {
      setAppState('plans')
    } else if (title === 'Wallet') {
      setReferralWalletPopup(true)
    } else if (title === 'Referral Wallet') {
      setActiveMenuData({ title, Icon })
      setAppState('generic-page')
    } else if (title === 'Payment Proofs') {
      setPaymentProofsPopup(true)
    } else if (title === 'Support') {
      setSupportPopup(true)
    } else {
      setActiveMenuData({ title, Icon })
      setAppState('generic-page')
    }
    setIsMenuOpen(false)
  }

  const renderModals = () => {
    return (
      <>
        {/* Purchase Options Popup */}
        {purchasePopup && (
          <div className="sidebar-overlay" style={{zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setPurchasePopup(null)}>
            <div className="scheme-popup" onClick={(e) => e.stopPropagation()}>
              <div className="scheme-popup-header">
                <h3>Select Scheme</h3>
                <button className="popup-close-btn" onClick={() => setPurchasePopup(null)}>✖</button>
              </div>
              
              <div className="scheme-popup-body">
                <label className="scheme-option">
                  <div className={`custom-radio-circle ${selectedScheme === 'offer' ? 'selected' : ''}`}>
                    <div className="inner-dot"></div>
                  </div>
                  <input 
                    type="radio" 
                    name="scheme" 
                    value="offer" 
                    checked={selectedScheme === 'offer'}
                    onChange={(e) => setSelectedScheme(e.target.value)}
                    style={{display: 'none'}}
                  />
                  <span>Offer amount Rs. {purchasePopup.offerAmount}</span>
                </label>
                
                <label className="scheme-option">
                  <div className={`custom-radio-circle ${selectedScheme === 'full' ? 'selected' : ''}`}>
                    <div className="inner-dot"></div>
                  </div>
                  <input 
                    type="radio" 
                    name="scheme" 
                    value="full" 
                    checked={selectedScheme === 'full'}
                    onChange={(e) => setSelectedScheme(e.target.value)}
                    style={{display: 'none'}}
                  />
                  <span>Full Amount Rs. {purchasePopup.fullAmount}</span>
                </label>
              </div>
              
              <div className="scheme-popup-footer">
                <button className="popup-ok-btn" onClick={() => {
                  setUserPlan(purchasePopup.name);
                  setPurchasePopup(null);
                }}>OK</button>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Selection Popup */}
        {referralWalletPopup && (
          <div className="sidebar-overlay" style={{zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setReferralWalletPopup(false)}>
            <div className="scheme-popup" style={{padding: '2.5rem 2rem', borderRadius: '14px'}} onClick={(e) => e.stopPropagation()}>
              <div className="scheme-popup-header" style={{marginBottom: '1.8rem'}}>
                <h3 style={{fontFamily: "'Playfair Display', serif", fontSize: '2.2rem', fontWeight: '600', letterSpacing: '0.2px'}}>Select Wallet</h3>
              </div>
              
              <div className="scheme-popup-body" style={{gap: '1.2rem', marginBottom: '2.5rem'}}>
                <label className="scheme-option" onClick={() => setSelectedReferralWallet('wallet')} style={{color: '#9ca3af', fontSize: '1.2rem', gap: '1.5rem'}}>
                  <div className={`custom-radio-circle ${selectedReferralWallet === 'wallet' ? 'selected' : ''}`} style={{borderColor: selectedReferralWallet === 'wallet' ? '#c2410c' : '#ffffffbf', width: '26px', height: '26px'}}>
                    <div className="inner-dot" style={{backgroundColor: '#ea580c', width: '12px', height: '12px'}}></div>
                  </div>
                  <span style={{color: selectedReferralWallet === 'wallet' ? 'white' : '#9ca3af', fontWeight: 500}}>Wallet</span>
                </label>
                
                <label className="scheme-option" onClick={() => setSelectedReferralWallet('survey')} style={{color: '#9ca3af', fontSize: '1.2rem', gap: '1.5rem'}}>
                  <div className={`custom-radio-circle ${selectedReferralWallet === 'survey' ? 'selected' : ''}`} style={{borderColor: selectedReferralWallet === 'survey' ? '#c2410c' : '#ffffffbf', width: '26px', height: '26px'}}>
                    <div className="inner-dot" style={{backgroundColor: '#ea580c', width: '12px', height: '12px'}}></div>
                  </div>
                  <span style={{color: selectedReferralWallet === 'survey' ? 'white' : '#9ca3af', fontWeight: 500}}>Survey Wallet</span>
                </label>
              </div>
              
              <div className="scheme-popup-footer" style={{display: 'flex', justifyContent: 'flex-end', paddingBottom: '0.5rem'}}>
                <button className="popup-ok-btn" style={{background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', fontWeight: '800', cursor: 'pointer', paddingRight: '0.5rem'}} onClick={() => {
                  setReferralWalletPopup(false);
                  setIsMenuOpen(false); 
                  if (selectedReferralWallet === 'survey') {
                    setActiveMenuData({ title: 'Survey Wallet', Icon: ListChecks });
                  } else {
                    setActiveMenuData({ title: 'Wallet', Icon: Wallet });
                  }
                  setAppState('generic-page');
                }}>OK</button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Proofs Selection Popup */}
        {paymentProofsPopup && (
          <div className="sidebar-overlay" style={{zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setPaymentProofsPopup(false)}>
            <div className="scheme-popup" style={{padding: '2.5rem 2.2rem', borderRadius: '16px', background: '#003d2b'}} onClick={(e) => e.stopPropagation()}>
              <div className="scheme-popup-body" style={{gap: '1.5rem', marginBottom: '2rem', textAlign: 'center'}}>
                <p style={{color: 'white', fontSize: '1.25rem', fontWeight: '500', marginBottom: '1.5rem'}}>For payment proofs click below</p>
                <div style={{display: 'flex', justifyContent: 'center', gap: '1.8rem'}}>
                   {/* Instagram Teardrop Icon */}
                   <div style={{
                     width: '46px', 
                     height: '46px', 
                     borderRadius: '50% 50% 50% 20%', 
                     background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center',
                     transform: 'rotate(-45deg)'
                   }}>
                     <Instagram size={22} color="white" style={{transform: 'rotate(45deg)'}} />
                   </div>
                   
                   {/* Facebook Teardrop Icon */}
                   <div style={{
                     width: '46px', 
                     height: '46px', 
                     borderRadius: '50% 50% 50% 20%', 
                     background: '#1877f2', 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center',
                     transform: 'rotate(-45deg)'
                   }}>
                     <Facebook size={22} color="white" fill="white" style={{transform: 'rotate(45deg)'}} />
                   </div>
                   
                   {/* WhatsApp Teardrop Icon */}
                   <div style={{
                     width: '46px', 
                     height: '46px', 
                     borderRadius: '50% 50% 50% 20%', 
                     background: '#22c55e', 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center',
                     transform: 'rotate(-45deg)'
                   }}>
                     <MessageCircle size={22} color="white" fill="white" style={{transform: 'rotate(45deg)'}} />
                   </div>
                </div>
              </div>
              
              <div className="scheme-popup-footer" style={{display: 'flex', justifyContent: 'flex-end', paddingBottom: '0.2rem'}}>
                <button className="popup-ok-btn" style={{background: 'none', border: 'none', color: 'white', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer', letterSpacing: '1px'}} onClick={() => {
                  setPaymentProofsPopup(false);
                }}>CANCEL</button>
              </div>
            </div>
          </div>
        )}
        {/* Support Selection Popup */}
        {supportPopup && (
          <div className="sidebar-overlay" style={{zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setSupportPopup(false)}>
            <div className="scheme-popup" style={{padding: '2.5rem 2.2rem', borderRadius: '16px', background: '#003024'}} onClick={(e) => e.stopPropagation()}>
              <div className="scheme-popup-body" style={{gap: '1.5rem', marginBottom: '2.5rem', textAlign: 'left'}}>
                <p style={{color: 'white', fontSize: '1.3rem', fontWeight: '500', lineHeight: '1.5', letterSpacing: '0.2px'}}>
                  For support or enquiry, email us at <br />
                  <span style={{fontWeight: '700'}}>help@premium24.co</span>
                </p>
              </div>
              
              <div className="scheme-popup-footer" style={{display: 'flex', justifyContent: 'flex-end', paddingBottom: '0.2rem'}}>
                <button className="popup-ok-btn" style={{background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', fontWeight: '800', cursor: 'pointer', letterSpacing: '1px'}} onClick={() => {
                  setSupportPopup(false);
                }}>OK</button>
              </div>
            </div>
          </div>
        )}
        {/* Captcha Success Selection Popup */}
        {captchaResult === 'correct' && (
          <div className="sidebar-overlay" style={{zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => {}}>
            <div className="scheme-popup" style={{padding: '3rem 2.5rem', borderRadius: '24px', background: '#003024', textAlign: 'center', minWidth: '320px', border: '1px solid #10b981'}} onClick={(e) => e.stopPropagation()}>
              <div style={{width: '90px', height: '90px', backgroundColor: '#10b98120', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '2px solid #10b981'}}>
                 <Check size={48} color="#10b981" />
              </div>
              <div className="scheme-popup-body" style={{marginBottom: '2.5rem'}}>
                <h3 style={{color: 'white', fontSize: '1.8rem', fontWeight: '900', marginBottom: '0.8rem', letterSpacing: '-0.5px'}}>{t('congrats')}</h3>
                <p style={{color: '#d1fae5', fontSize: '1.3rem', fontWeight: '600', opacity: 0.9}}>{t('got5Coin')}</p>
              </div>
              
              <button className="plan-action-btn fill-btn" style={{width: '100%', height: '56px', backgroundColor: '#10b981', border: 'none', borderRadius: '28px', color: 'white', fontSize: '1.3rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 15px rgba(16, 185, 129, 0.4)'}} onClick={claimCoins}>
                {t('claimIt')}
              </button>
            </div>
          </div>
        )}

        {/* Captcha Error Selection Popup */}
        {captchaResult === 'incorrect' && (
          <div className="sidebar-overlay" style={{zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center'}} onClick={() => setCaptchaResult(null)}>
            <div className="scheme-popup" style={{padding: '3rem 2.5rem', borderRadius: '24px', background: '#300000', textAlign: 'center', minWidth: '320px', border: '1px solid #ef4444'}} onClick={(e) => e.stopPropagation()}>
              <div style={{width: '90px', height: '90px', backgroundColor: '#ef444420', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '2px solid #ef4444'}}>
                 <XCircle size={48} color="#ef4444" />
              </div>
              <div className="scheme-popup-body" style={{marginBottom: '2.5rem'}}>
                <h3 style={{color: 'white', fontSize: '1.8rem', fontWeight: '900', marginBottom: '0.8rem', letterSpacing: '-0.5px'}}>{t('oops')}</h3>
                <p style={{color: '#fee2e2', fontSize: '1.1rem', fontWeight: '600', opacity: 0.9}}>{t('wrongCaptcha')}</p>
              </div>
              
              <button className="plan-action-btn fill-btn" style={{width: '100%', height: '56px', backgroundColor: '#ef4444', border: 'none', borderRadius: '28px', color: 'white', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 15px rgba(239, 68, 68, 0.4)'}} onClick={() => {
                setCaptchaResult(null);
                setErrorCount(prev => prev + 1);
                generateCaptcha();
              }}>
                {t('tryAgain')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  const activeSlide = slides[currentSlide]

  if (appState === 'language_selection') {
    return (
      <div className="app-container">
        <header className="header">
          <div className="top-logo">
            PREMIUM <span className="logo-badge">24</span>
          </div>
        </header>

        <main className="main-content">
          <div className="welcome-section">
            <h1 className="welcome-text">Welcome to <span className="highlight">Premium 24</span></h1>
            <p className="subtitle">
              For your skills with the best in Captcha fill, Online Courses, Study and Exam preparation platforms.
            </p>
          </div>

          <div className="central-logo-container splash-logo">
            <img src={centralLogo} alt="Premium 24 Logo" className="central-logo" />
          </div>

          <div className="button-group">
            <button className="btn btn-hindi" onClick={() => handleLanguageSelect('hindi')}>हिंदी</button>
            <button className="btn btn-english" onClick={() => handleLanguageSelect('english')}>ENGLISH</button>
          </div>
        </main>

        <footer className="footer">
          <div className="footer-links">
            <a href="https://www.TechAircraft.com" target="_blank" rel="noopener noreferrer">www.TechAircraft.com</a>
          </div>
          <p className="footer-text">This Application is powered by TechAircraft Solution Pvt. Ltd.</p>
        </footer>
      </div>
    )
  }

  if (appState === 'login') {
    return (
      <div className="app-container login-view">
        <header className="header login-header">
          <div className="top-logo">
            PREMIUM <span className="logo-badge">24</span>
          </div>
          <div className="language-toggle">
            <div className="toggle-switch"></div>
            <span>हिंदी</span>
          </div>
        </header>

        <main className="main-content login-content">
          <div className="login-illustration-container">
            <img src={loginImg} alt="Success" className="login-img" />
          </div>

          <h1 className="login-title">Learn And Earn <span className="highlight">!</span></h1>

          <div className="login-actions">
            <button className="login-btn action-know-more" onClick={handleKnowMore}>
              <div className="btn-icon play-icon"><Play size={18} fill="white" /></div>
              KNOW MORE
            </button>
            <div className="google-login-wrap">
              <button
                className="login-btn action-google"
                onClick={handleBackendGoogleLogin}
                disabled={isAuthenticating}
                type="button"
              >
                Sign in with Google
              </button>
            </div>
            {isAuthenticating && <p className="auth-message">Signing in...</p>}
            {!!authMessage && <p className="auth-message auth-message-error">{authMessage}</p>}
          </div>

          <div className="login-footer-info">
            <p>By signing in, you agree to our</p>
            <div className="legal-links">
              <span className="link-gold">Terms & Conditions</span>, <span className="link-gold">Privacy Policy</span> and <span className="link-gold">Refund Policy</span>
            </div>
            
            <div className="powered-by">
              <p>Powered by TechAircraft Solution Pvt. Ltd.</p>
              <p>Copyright © 2026 Techaircraft Solution. All rights reserved.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (appState === 'video') {
    return (
      <div className="app-container video-view">
        <header className="video-header">
          <ArrowLeft size={28} className="icon-grey back-arrow" onClick={handleVideoBack} />
          <div className="demo-central-logo">
            <div className="logo-badge demo-badge">P<span style={{fontSize:'0.6rem'}}>24</span></div>
            <span style={{fontSize:'8px', fontWeight:'700', marginTop:'2px', color: '#c0842e'}}>PREMIUM24</span>
          </div>
        </header>

        <main className="video-main">
          <div className="iframe-container">
            <iframe 
              width="100%" 
              height="100%" 
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
              title="About us !!" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen>
            </iframe>
          </div>
        </main>
      </div>
    )
  }

  const renderGenericContent = () => {
    if (!activeMenuData) return null;
    const { title, Icon } = activeMenuData;

    if (title === 'Wallet' || title === 'Survey Wallet') {
      return (
        <div className="wallet-screen-container" style={{backgroundColor: '#f1f5f9', padding: '0.8rem'}}>
          <div className="wallet-main-card" style={{padding: '1.2rem', paddingTop: '3rem', position: 'relative', border: '1px solid #e2e8f0', borderRadius: '24px'}}>
            <div className="info-icon-wrapper" style={{left: '1.2rem', right: 'auto', top: '1.2rem'}}>
              <span className="info-circle" style={{backgroundColor: '#e2e8f0', color: '#94a3b8', fontSize: '10px'}}>i</span>
            </div>
            <div className="info-icon-wrapper" style={{right: '1.2rem', top: '1.2rem'}}>
              <span className="info-circle" style={{backgroundColor: '#e2e8f0', color: '#94a3b8', fontSize: '10px'}}>i</span>
            </div>
            
            <div className="wallet-illustration-wrapper" style={{maxWidth: '220px', marginBottom: '1.5rem', marginTop: '1rem'}}>
              <img src={walletIllustration} alt="Wallet Illustration" className="wallet-illustration" />
            </div>

            <div className="wallet-content">
              <h1 className="wallet-screen-title" style={{fontSize: '2.5rem', fontWeight: '900', color: '#003d2b', marginBottom: '0.2rem'}}>{title}</h1>
              
              <div className="wallet-balance-row" style={{marginBottom: '1.5rem', marginTop: '0.2rem', gap: '0.6rem'}}>
                <div style={{display: 'flex', alignItems: 'center', backgroundColor: '#eab308', borderRadius: '50%', color: 'white', fontWeight: 'bold', width: '22px', height: '22px', justifyContent: 'center', fontSize: '14px'}}>★</div>
                <span className="balance-amount" style={{fontSize: '1.8rem', color: '#b45309', fontWeight: '800'}}>0 = ₹ 0</span>
              </div>

              <div className="amount-input-container" style={{boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)', borderRadius: '28px', marginBottom: '1.2rem'}}>
                <input 
                  type="number" 
                  placeholder="Enter Amount" 
                  className="amount-input"
                  style={{border: 'none', backgroundColor: '#f9fafb'}}
                />
              </div>

              <button className="withdraw-button" style={{backgroundColor: '#b45309', height: '60px', borderRadius: '30px', fontSize: '1.3rem', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '0.8rem', boxShadow: '0 10px 20px -5px rgba(180, 83, 9, 0.3)'}}>
                Withdraw
              </button>

              <p className="min-payment-text" style={{textAlign: 'center', width: '100%', color: '#d97706', fontSize: '0.9rem', marginBottom: '1.2rem', fontWeight: '500'}}>Minimum Payment = Rs 100</p>

              <div className="payment-description" style={{color: '#b45309', fontSize: '0.95rem', fontWeight: '600', lineHeight: '1.4', padding: '0 0.5rem', marginBottom: '1.5rem'}}>
                You can receive your payment in a Bank account, Google Pay / Phone Pay / Paytm, or any UPI ID.
              </div>

              <button className="add-bank-button" style={{display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#b45309', fontWeight: '600', background: 'none', padding: '0', fontSize: '1rem'}}>
                <div style={{width: '24px', height: '24px', border: '1.5px solid #b45309', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold'}}>+</div>
                Add your bank details
              </button>
            </div>
          </div>

          <button className="withdraw-history-footer" style={{marginTop: 'auto', backgroundColor: '#003d2b', border: 'none', width: '95%', height: '56px', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', position: 'relative', overflow: 'hidden'}} onClick={() => handleMenuClick('Withdraw History', History)}>
            <div style={{width: '24px', height: '24px', border: '2px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               <div style={{width: '2px', height: '6px', backgroundColor: 'white', position: 'absolute', top: '25%'}}></div>
               <div style={{width: '6px', height: '2px', backgroundColor: 'white', position: 'absolute', right: '25%'}}></div>
            </div>
            <span style={{color: 'white', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '1px'}}>WITHDRAW HISTORY</span>
          </button>
        </div>
      );
    }

    if (title === 'Referral Wallet') {
      return (
        <div className="wallet-screen-container" style={{backgroundColor: '#f1f5f9', padding: '0.8rem'}}>
          <div className="wallet-main-card" style={{padding: '1.2rem', paddingTop: '1rem', position: 'relative', border: '1px solid #e2e8f0', borderRadius: '24px'}}>
             <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem'}}>
               <div style={{width: '32px', height: '32px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                 <MessageCircle size={18} color="white" fill="white" />
               </div>
               <div className="info-icon-wrapper" style={{position: 'static'}}>
                 <span className="info-circle" style={{backgroundColor: '#e2e8f0', color: '#94a3b8', fontSize: '10px'}}>i</span>
               </div>
             </div>
            
            <div className="wallet-illustration-wrapper" style={{maxWidth: '130px', marginBottom: '1rem'}}>
              <img src={referralWalletIllustration} alt="Referral Wallet Illustration" className="wallet-illustration" />
            </div>

            <div className="wallet-content">
              <h1 className="wallet-screen-title" style={{fontSize: '1.8rem', fontWeight: '900', color: '#312e81', marginBottom: '0.2rem'}}>Wallet</h1>
              <div className="wallet-balance-row" style={{marginBottom: '1rem'}}>
                <span className="balance-amount" style={{fontSize: '1.6rem', color: '#b45309', fontWeight: '800'}}>₹ 0</span>
              </div>

              <div className="referral-withdraw-row" style={{display: 'flex', width: '100%', gap: '0', height: '48px', marginBottom: '1rem'}}>
                <input 
                  type="number" 
                  placeholder="Enter Amount" 
                  className="amount-input"
                  style={{flex: 1, borderRadius: '24px 0 0 24px', border: '1px solid #312e81', backgroundColor: 'white', textAlign: 'center', height: '100%'}}
                />
                <button className="withdraw-button" style={{flex: 1, borderRadius: '0 24px 24px 0', backgroundColor: '#064e3b', color: 'white', border: 'none', height: '100%', fontSize: '1.1rem', fontWeight: '700'}}>
                  Withdraw
                </button>
              </div>

              <button className="referral-payment-info-btn" style={{width: '100%', backgroundColor: '#b45309', color: 'white', border: 'none', height: '48px', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '700', marginBottom: '0.8rem'}}>
                How much get referral payment
              </button>

              <p className="min-payment-text thinner-text" style={{color: '#b45309', fontSize: '0.85rem', marginBottom: '1.2rem', textAlign: 'center', fontWeight: '500'}}>Minimum Payment = Rs 50</p>

              <div className="referral-share-section" style={{width: '100%'}}>
                <p className="share-text-label" style={{color: '#312e81', fontSize: '0.9rem', fontWeight: '700', marginBottom: '0.6rem'}}>Share This Referral Link To Your Friends and Followers</p>
                <div className="referral-link-box" style={{border: '1.5px solid #312e81', borderRadius: '24px', padding: '0.8rem 1rem', marginBottom: '1.2rem', color: '#312e81', fontSize: '0.85rem', fontWeight: '600', wordBreak: 'break-all'}}>
                  https://server.premium24.in/e3v5/149122431
                </div>

                <div className="copy-share-row" style={{display: 'flex', gap: '1rem', marginBottom: '1.2rem'}}>
                   <button style={{flex: 1, height: '44px', backgroundColor: '#064e3b', color: 'white', border: 'none', borderRadius: '22px', fontSize: '1.1rem', fontWeight: '800'}}>Copy</button>
                   <button style={{flex: 1, height: '44px', backgroundColor: '#b45309', color: 'white', border: 'none', borderRadius: '22px', fontSize: '1.1rem', fontWeight: '800'}}>Share</button>
                </div>

                <div className="social-icons-row" style={{display: 'flex', justifyContent: 'center', gap: '1.2rem', marginBottom: '1.5rem'}}>
                   <div style={{width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                     <Youtube size={20} color="white" />
                   </div>
                   <div style={{width: '32px', height: '32px', backgroundColor: '#1877f2', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                     <Globe size={20} color="white" />
                   </div>
                   <div style={{width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                     <MessageCircle size={20} color="white" />
                   </div>
                   <div style={{width: '32px', height: '32px', backgroundColor: '#22c55e', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                     <MessageCircle size={20} color="white" />
                   </div>
                </div>
              </div>

              <div className="total-referral-pill" style={{width: '100%', backgroundColor: '#064e3b', borderRadius: '24px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', color: 'white', fontSize: '1.1rem', fontWeight: '700'}}>
                <Users size={20} color="white" /> <span>Total Referral :- 0</span>
              </div>

              <button className="add-bank-button" style={{color: '#312e81', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: '600', marginTop: '1.2rem', fontSize: '1.05rem'}}>
                <div style={{width: '24px', height: '24px', border: '1.5px solid #312e81', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold'}}>+</div>
                Add your bank details
              </button>
            </div>
          </div>

          <button className="withdraw-history-footer" style={{marginTop: 'auto', backgroundColor: '#003d2b', border: 'none', width: '95%', height: '56px', borderRadius: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem'}} onClick={() => handleMenuClick('Withdraw History', History)}>
            <div style={{width: '28px', height: '28px', border: '2px solid white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               <History size={16} color="white" />
            </div>
            <span style={{color: 'white', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '1px'}}>WITHDRAW HISTORY</span>
          </button>
        </div>
      );
    }

    if (title === 'My Account') {
      return (
        <div className="wallet-screen-container" style={{backgroundColor: '#f8fafc', padding: '1rem', position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 64px)'}}>
          {/* Decorative background squares */}
          <div className="account-decor-squares" style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0}}>
            <div className="decor-sq" style={{position: 'absolute', top: '10%', left: '5%', width: '40px', height: '40px', backgroundColor: '#fee2e2', opacity: 0.6, transform: 'rotate(15deg)'}}></div>
            <div className="decor-sq" style={{position: 'absolute', top: '25%', left: '40%', width: '30px', height: '30px', backgroundColor: '#ecfdf5', opacity: 0.6, transform: 'rotate(-10deg)'}}></div>
            <div className="decor-sq" style={{position: 'absolute', top: '40%', right: '5%', width: '50px', height: '50px', backgroundColor: '#eff6ff', opacity: 0.6, transform: 'rotate(20deg)'}}></div>
            <div className="decor-sq" style={{position: 'absolute', bottom: '20%', left: '10%', width: '45px', height: '45px', backgroundColor: '#f5f3ff', opacity: 0.6, transform: 'rotate(-15deg)'}}></div>
            <div className="decor-sq" style={{position: 'absolute', bottom: '35%', right: '15%', width: '35px', height: '35px', backgroundColor: '#fff7ed', opacity: 0.6, transform: 'rotate(10deg)'}}></div>
            <div className="decor-sq" style={{position: 'absolute', top: '60%', left: '20%', width: '60px', height: '60px', backgroundColor: '#f0f9ff', opacity: 0.6, transform: 'rotate(5deg)'}}></div>
            <div className="decor-sq" style={{position: 'absolute', bottom: '5%', right: '40%', width: '25px', height: '25px', backgroundColor: '#ecfdf5', opacity: 0.6, transform: 'rotate(-25deg)'}}></div>
            <div className="decor-sq" style={{position: 'absolute', top: '5%', right: '30%', width: '20px', height: '20px', backgroundColor: '#fef3c7', opacity: 0.6}}></div>
          </div>

          <div className="account-profile-card" style={{width: '100%', backgroundColor: 'white', borderRadius: '24px', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', marginBottom: '1.5rem', position: 'relative', zIndex: 1, border: '1px solid #f1f5f9'}}>
             <div style={{width: '110px', height: '110px', borderRadius: '50%', border: '1.5px solid #003d2b', padding: '5px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden'}}>
                  <img src={loginImg} alt="Profile" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                </div>
             </div>
             <h2 style={{fontSize: '2.2rem', fontWeight: '900', color: '#064e3b', marginBottom: '0.2rem', letterSpacing: '-0.5px'}}>24hr work</h2>
             <p style={{fontSize: '1rem', color: '#94a3b8', fontWeight: '500', letterSpacing: '0.3px'}}>24hrwork.in@gmail.com</p>
          </div>

          <div className="account-plan-card" style={{width: '100%', backgroundColor: 'white', borderRadius: '24px', padding: '2.2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', marginBottom: '2.2rem', position: 'relative', zIndex: 1, border: '1px solid #f1f5f9', textAlign: 'center'}}>
             <h2 style={{fontSize: '2rem', fontWeight: '900', color: '#064e3b', marginBottom: '0.4rem'}}>{userPlan} Plan</h2>
             <p style={{fontSize: '1.1rem', color: '#94a3b8', fontWeight: '500'}}>{userPlan === 'Demo' ? '30 Days Validity' : 'Lifetime Validity'}</p>
          </div>

          <div style={{width: '100%', display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1}}>
            <button className="support-ticket-btn" onClick={() => setSupportPopup(true)} style={{width: '95%', height: '60px', backgroundColor: '#003d2b', color: 'white', border: 'none', borderRadius: '30px', fontSize: '1.25rem', fontWeight: '700', boxShadow: '0 10px 20px -8px rgba(0, 61, 43, 0.4)', letterSpacing: '0.5px', cursor: 'pointer'}}>
               Raise a support Ticket
            </button>
          </div>
        </div>
      );
    }

    if (title === 'Withdraw History') {
      const mockWithdrawals = [
        { id: 'TXN74291', date: '25 Mar 2026', time: '10:30 AM', amount: '1200', status: 'Success', method: 'Bank Account' },
        { id: 'TXN74285', date: '22 Mar 2026', time: '02:15 PM', amount: '500', status: 'Pending', method: 'UPI ID' },
        { id: 'TXN74199', date: '15 Mar 2026', time: '09:45 AM', amount: '2500', status: 'Success', method: 'Bank Account' },
        { id: 'TXN74052', date: '10 Mar 2026', time: '11:10 AM', amount: '1000', status: 'Failed', method: 'Google Pay' },
        { id: 'TXN73921', date: '01 Mar 2026', time: '04:30 PM', amount: '1500', status: 'Success', method: 'UPI ID' }
      ];

      const getStatusColor = (status) => {
        if (status === 'Success') return '#22c55e';
        if (status === 'Pending') return '#f59e0b';
        if (status === 'Failed') return '#ef4444';
        return '#94a3b8';
      };

      return (
        <div className="wallet-screen-container" style={{backgroundColor: '#f8fafc', padding: '1rem', minHeight: 'calc(100vh - 64px)'}}>
          <div className="history-summary-card" style={{width: '100%', backgroundColor: 'white', border: '1.5px solid #eef2f6', borderRadius: '24px', padding: '1.8rem', textAlign: 'center', marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)'}}>
             <p style={{fontSize: '1rem', color: '#64748b', fontWeight: '600', marginBottom: '0.4rem'}}>Total Withdrawn</p>
             <h2 style={{fontSize: '2.4rem', color: '#064e3b', fontWeight: '900'}}>₹ 5,200</h2>
          </div>

          <div className="history-list" style={{display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%'}}>
            {mockWithdrawals.map((tx, idx) => (
              <div key={idx} className="history-item-card" style={{backgroundColor: 'white', borderRadius: '20px', padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9'}}>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                  <div style={{width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                     {tx.method.includes('Bank') ? <Landmark size={20} color="#16a34a" /> : <Smartphone size={20} color="#16a34a" />}
                  </div>
                  <div>
                    <h4 style={{fontSize: '1.05rem', color: '#1e293b', fontWeight: '800', marginBottom: '0.2rem'}}>{tx.id}</h4>
                    <p style={{fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500'}}>{tx.date} • {tx.time}</p>
                  </div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <p style={{fontSize: '1.1rem', color: '#1e293b', fontWeight: '900', marginBottom: '0.3rem'}}>₹ {tx.amount}</p>
                  <span style={{
                    fontSize: '0.75rem', 
                    fontWeight: '700', 
                    padding: '0.3rem 0.6rem', 
                    borderRadius: '12px', 
                    backgroundColor: `${getStatusColor(tx.status)}20`,
                    color: getStatusColor(tx.status),
                    textTransform: 'uppercase'
                  }}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p style={{textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', marginTop: '2rem', paddingBottom: '2rem'}}>
            Showing recent 5 transactions
          </p>
        </div>
      );
    }

    if (title === 'Youtube') {
      const tutorials = [
        { title: 'How to Register & Get Started', duration: '2:15', category: 'Basics', desc: 'Step-by-step guide to creating your account and setting up your profile.' },
        { title: 'Choosing the Right Plan', duration: '3:45', category: 'Membership', desc: 'Understanding the differences between Silver and Silver Plus plans.' },
        { title: 'Earning with Captchas & Surveys', duration: '5:20', category: 'Earnings', desc: 'Maximize your daily income by efficiently solving captchas.' },
        { title: 'How to Withdraw Your Earnings', duration: '1:50', category: 'Finance', desc: 'Complete process of adding bank details and requesting payouts.' }
      ];

      return (
        <div className="wallet-screen-container" style={{backgroundColor: '#f8fafc', padding: '1rem', minHeight: 'calc(100vh - 64px)'}}>
          <div className="tutorial-header" style={{margin: '0.5rem 0 1.5rem 0.5rem'}}>
             <h2 style={{fontSize: '1.8rem', color: '#064e3b', fontWeight: '900', marginBottom: '0.2rem'}}>App Tutorials</h2>
             <p style={{fontSize: '1rem', color: '#94a3b8', fontWeight: '500'}}>Learn how to maximize your earnings on Premium 24</p>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2.5rem'}}>
            {tutorials.map((v, i) => (
              <div key={i} className="video-card" style={{backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 25px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', cursor: 'pointer'}}>
                 <div style={{height: '180px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'}}>
                    <div style={{width: '64px', height: '64px', backgroundColor: '#d81b60', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '4px', boxShadow: '0 8px 20px rgba(216, 27, 96, 0.5)'}}>
                       <Play fill="white" color="white" size={32} />
                    </div>
                    <span style={{position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', fontWeight: '800'}}>{v.duration}</span>
                    <span style={{position: 'absolute', top: '12px', left: '12px', backgroundColor: '#d81b60', color: 'white', fontSize: '0.75rem', padding: '4px 12px', borderRadius: '15px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px'}}>{v.category}</span>
                 </div>
                 <div style={{padding: '1.5rem'}}>
                    <h3 style={{fontSize: '1.3rem', color: '#1e293b', fontWeight: '900', marginBottom: '0.6rem', letterSpacing: '-0.3px'}}>{v.title}</h3>
                    <p style={{fontSize: '0.95rem', color: '#64748b', lineHeight: '1.5', fontWeight: '500'}}>{v.desc}</p>
                 </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    const isBlueThemed = ['English Speaking', 'Govt Job Info', 'Edu-Exam Portal', 'My Courses', 'General Knowledge', 'Jobs Info', 'Govt Exam Info', 'Survey'].includes(title);

    if (isBlueThemed) {
      if (userPlan === 'Demo') {
        return (
          <div className="lock-screen-content" style={{
            backgroundColor: '#003d2b',
            minHeight: 'calc(100vh - 64px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            color: 'white',
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{ marginBottom: '2rem', width: '100%', maxWidth: '300px' }}>
              <img src={activatedImg} alt="Demo Plan" style={{ width: '100%', height: 'auto' }} />
            </div>
            
            <h2 style={{ fontSize: '1.25rem', fontWeight: '400', marginBottom: '1.2rem', lineHeight: '1.4' }}>
              You are subscribed to <span style={{ color: '#eab308', fontWeight: '700' }}>Demo Plan</span> of courses
            </h2>
            
            <p style={{ fontSize: '1.05rem', opacity: 0.9, marginBottom: '3.5rem', fontWeight: '500' }}>
              To access courses, subscribe to a paid plan.
            </p>
            
            <button 
              onClick={() => setAppState('plans')}
              style={{
                width: '100%',
                maxWidth: '300px',
                height: '60px',
                backgroundColor: 'white',
                color: '#003d2b',
                border: 'none',
                borderRadius: '30px',
                fontSize: '1.4rem',
                fontWeight: '800',
                marginBottom: '6rem',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                cursor: 'pointer'
              }}
            >
              Buy Plan
            </button>
            
            <div style={{ position: 'absolute', bottom: '2rem', left: 0, width: '100%', textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: '500' }}>
                Powered by TechAircraft Solution Pvt. Ltd.
              </p>
            </div>
          </div>
        );
      }

      const getLinks = () => {
        if (title === 'English Speaking') return [
          { label: 'Spoken English (Beginners)', color: '#d81b60' },
          { label: 'Spoken English (Professional)', color: 'white', textColor: '#0b0b3a' }
        ];
        if (title === 'Govt Job Info') return [
          { label: 'Services.india', color: '#d81b60' },
          { label: 'Ncs.gov', color: 'white', textColor: '#0b0b3a' },
          { label: 'Govt. Job Openings', color: '#d81b60' },
          { label: 'Govt. jobs alert', color: 'white', textColor: '#0b0b3a' },
          { label: 'Employmentnews', color: '#d81b60' }
        ];
        if (title === 'General Knowledge') return [
          { label: 'Qureka', color: '#d81b60' }
        ];
        if (title === 'Survey') return [
          { label: 'TheoremReach', color: 'white', textColor: '#0b0b3a' },
          { label: 'CPX', color: '#d81b60' },
          { label: 'SurveysIQ', color: 'white', textColor: '#0b0b3a' }
        ];
        return [];
      };

      const links = getLinks();
      const needsAppLinks = ['Edu-Exam Portal', 'My Courses', 'My Account'].some(t => title === t) || (title === 'English Speaking' && false); 
      
      const showOkLayout = ['Edu-Exam Portal', 'My Courses'].includes(title);

      return (
        <div className="wallet-screen-container" style={{backgroundColor: '#0b0b3a', padding: '1.5rem', minHeight: 'calc(100vh - 64px)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
          <h2 style={{fontSize: '1.3rem', fontWeight: '500', marginBottom: '1.5rem', opacity: 0.9}}>{title}</h2>
          
          <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem'}}>
            {links.map((link, idx) => (
              <button key={idx} style={{
                height: '56px', 
                borderRadius: '28px', 
                backgroundColor: link.color, 
                color: link.textColor || 'white', 
                border: 'none', 
                fontSize: '1.1rem', 
                fontWeight: '600',
                width: '100%',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }}>
                {link.label}
              </button>
            ))}
          </div>

          <div style={{marginTop: links.length ? '0' : '1rem'}}>
             {title !== 'Govt Job Info' && title !== 'General Knowledge' && (
               <>
                 <h3 style={{fontSize: '1.4rem', fontWeight: '700', marginBottom: '1.8rem'}}>Congratulations !!</h3>
                 <p style={{fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.5rem', padding: '0 1rem'}}>
                    You are in the paid plan. If you'd like to access the {title.toLowerCase().replace('edu-', '')}
                 </p>
                 <p style={{fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.8rem', padding: '0 1rem'}}>
                    Please email us your email ID at <br />
                    <span style={{color: '#d81b60', fontWeight: '700'}}>support@techaircraft.com</span> along with the proof of payment
                 </p>
                 <p style={{fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem'}}>
                    {title === 'Edu-Exam Portal' ? "and we'll give you the activation key." : "and we'll give you access to that email ID."}
                 </p>
               </>
             )}

             {showOkLayout && (
               <>
                <button onClick={() => setAppState('demo')} style={{width: '100%', maxWidth: '280px', height: '52px', backgroundColor: '#d81b60', border: 'none', borderRadius: '26px', color: 'white', fontSize: '1.1rem', fontWeight: '700', marginBottom: '2.5rem'}}>OK</button>
                <p style={{fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem'}}>You can use this by downloading our app</p>
                <div style={{display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem'}}>
                  <div style={{width: '40px', height: '40px', background: 'white', borderRadius: '8px', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <Play size={24} color="#0b0b3a" fill="#0b0b3a" />
                  </div>
                  <div style={{width: '40px', height: '40px', background: 'white', borderRadius: '8px', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <Globe size={24} color="#0b0b3a" />
                  </div>
                </div>
                <p style={{color: '#d81b60', fontSize: '1rem', fontWeight: '600', cursor: 'pointer'}}>or visit us on https://academy.techaircraft.com/</p>
               </>
             )}

             {title === 'Govt Job Info' && (
               <div style={{marginTop: 'auto', paddingTop: '2rem'}}>
                 <p style={{fontSize: '0.85rem', opacity: 0.8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem'}}>
                   Note - We provide only Government job information; we do not guarantee or provide any Government jobs.
                 </p>
               </div>
             )}
          </div>
        </div>
      );
    }
    
    // Default Fallback or existing Screens
    if (title === 'Support') {
      return (
        <div className="custom-page-content" style={{width: '100%', maxWidth: '500px', margin: '0 auto'}}>
          <div style={{backgroundColor: 'white', borderRadius: '20px', padding: '3rem 2rem', textAlign: 'center', width: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.06)'}}>
            <div style={{width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#e0f2fe', border: '4px solid #bae6fd', margin: '0 auto 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <PhoneCall size={38} color="#0284c7" />
            </div>
            <h2 style={{fontSize: '1.8rem', color: '#0f172a', marginBottom: '1rem', fontWeight: 800}}>How can we help?</h2>
            <p style={{color: '#64748b', fontSize: '1.05rem', marginBottom: '2.5rem', lineHeight: 1.6, fontWeight: 500}}>Our customer support team is available from 10:00 AM to 6:00 PM (Monday to Saturday) to assist you with any queries.</p>
            
            <button className="plan-action-btn dark-btn fill-btn" style={{backgroundColor: '#25D366', border: 'none', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', width: '100%', maxWidth: '100%', height: '56px'}}>
              <MessageCircle size={24} /> Chat on WhatsApp
            </button>
            <button className="plan-action-btn dark-btn fill-btn" style={{backgroundColor: '#f1f5f9', color: '#0f172a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', width: '100%', maxWidth: '100%', height: '56px'}}>
              Email Support
            </button>
          </div>
        </div>
      );
    }

    // Default Fallback
    return (
      <div className="generic-card">
        <div className="generic-icon-wrapper">
          <Icon size={64} className="generic-main-icon" />
        </div>
        <h2 className="generic-title">{title}</h2>
        <p className="generic-subtitle">We are currently working on this feature. It will be available in an upcoming update!</p>
        <button className="captcha-submit-btn" style={{marginTop: '2rem'}} onClick={() => setAppState('demo')}>Return to Home</button>
      </div>
    );
  };

  if (appState === 'generic-page') {
    return (
      <div className="app-container generic-view">
        <header className="demo-header" style={{height: '64px', backgroundColor: '#003d2b'}}>
          <ArrowLeft size={28} className="icon-white back-arrow" onClick={() => setAppState('demo')} style={{cursor: 'pointer'}} />
          <div className="demo-central-logo">
            <div className="logo-badge demo-badge">P<span style={{fontSize:'0.6rem'}}>24</span></div>
            <span style={{fontSize:'8px', fontWeight:'700', marginTop:'2px'}}>PREMIUM24</span>
          </div>
          <div className="demo-header-actions">
            <Wallet size={24} className="icon-white" />
            <Bell size={24} className="icon-white" />
            <div className={`language-toggle demo-lang ${currentLanguage === 'hi' ? 'active' : ''}`} onClick={toggleLanguage} style={{cursor: 'pointer'}}>
              <div className="toggle-switch"></div>
              <span>{t('langLabel')}</span>
            </div>
          </div>
        </header>

        <main className="generic-main">
          {renderGenericContent()}
        </main>
        {renderModals()}
      </div>
    )
  }

  if (appState === 'activated') {
    return (
      <div className="app-container activated-view">
        <header className="header login-header">
          <div className="top-logo">
            PREMIUM <span className="logo-badge">24</span>
          </div>
        </header>

        <main className="main-content activated-content">
          <div className="activated-illustration-container">
            <img src={activatedImg} alt="Account Activated" className="activated-img" />
          </div>

          <h1 className="activated-title">Account Activated<br />Successfully!</h1>
          
          <div className="subscription-info">
            <p>You are subscribed to <span className="highlight-plan">{userPlan} Plan</span>.</p>

            <p className="subscription-note">In order to withdraw money subscribe to a paid plan.</p>
          </div>

          <div className="activated-actions">
            <button className="btn-activated action-demo" onClick={handleDemo}>
              Start demo work
            </button>
            <button className="btn-activated action-buy" onClick={() => setAppState('plans')}>
              Buy Plan
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (appState === 'plans') {
    return (
      <div className="app-container video-view" style={{backgroundColor: '#003d2b', minHeight: '100vh'}}>
        <header className="video-header">
          <ArrowLeft size={28} className="icon-white back-arrow" onClick={() => setAppState('demo')} />
          <div className="demo-central-logo">
            <div className="logo-badge demo-badge">P<span style={{fontSize:'0.6rem'}}>24</span></div>
            <span style={{fontSize:'8px', fontWeight:'700', marginTop:'2px', color: '#c0842e'}}>PREMIUM24</span>
          </div>
        </header>

        <main className="plans-main">
          
          <h2 className="plans-main-title">Subscribe <span style={{fontWeight: '400'}}>To A Plan</span> & Start Earning <span style={{color: '#f97316'}}>!</span></h2>

          {/* DEMO CARD */}
          <div className="plan-card color-card-orange">
            <div className="plan-badge-wrapper demo-badge-wrapper">
              <div className="plan-badge">FREE</div>
              <div className="badge-decoration"></div>
            </div>
            
            <h2 className="plan-title">Demo</h2>
            <h3 className="plan-subtitle">FREE</h3>
            <br />
            
            <ul className="plan-features">
              <li>Demo Account</li>
              <li>No Earning</li>
              <li>30 Days Validity</li>
              <li>Demo Courses</li>
              <li>Customer Support</li>
            </ul>
            
            <button className="plan-action-btn dark-btn" onClick={() => setAppState('demo')}>TRY DEMO WORK</button>
          </div>

          {/* GOLD CARD */}
          <div className="plan-card color-card-white">
            <div className="plan-badge-wrapper gold-badge-wrapper">
              <div className="plan-badge">BEST VALUE</div>
              <div className="badge-decoration"></div>
            </div>
            
            <h2 className="plan-title text-dark">Gold</h2>
            <h3 className="plan-subtitle text-dark">Rs. 499</h3>
            <span className="plan-refundable">(Refundable) <span className="info-icon">i</span></span>
            <div className="plan-footer-tax">* Including of all taxes</div>

            <div className="detail-banner banner-brown">
              The Rs 6999 plan starts with paying only Rs 499. The remaining amount will be deducted from your earnings. You can also pay the total amount and start withdrawing immediately.
            </div>
            
            <ul className="plan-features features-dark">
              <li>Lifetime Validity</li>
              <li>Unlimited Earning</li>
              <li>Unlimited Captcha</li>
              <li>Work 24 hours</li>
              <li>1500 Captchas = Rs. 75</li>
              <li>Surveys</li>
              <li>Courses + (All Features )</li>
              <li>Jobs Info</li>
              <li>Govt Job Info</li>
              <li>Govt Exam Info</li>
              <li>Edu Academy Access</li>
              <li>English Speaking</li>
            </ul>
            
            <div className="bottom-note note-orange">Note - This fee is to access all the paid features and will be refunded when you learn and earn 35000 rs/-</div>
            <button className="plan-action-btn dark-btn fill-btn" onClick={() => setPurchasePopup({name: 'Gold', offerAmount: 499, fullAmount: 6999})}>SELECT PLAN</button>
          </div>

          {/* PLATINUM CARD */}
          <div className="plan-card color-card-orange">
            <div className="plan-badge-wrapper platinum-badge-wrapper">
              <div className="plan-badge">BEST OFFER</div>
              <div className="badge-decoration"></div>
            </div>
            <div className="ribbon-tr">BEST VALUE</div>
            
            <h2 className="plan-title">Platinum</h2>
            <h3 className="plan-subtitle">Rs. 999</h3>
            <span className="plan-refundable text-white">(Refundable) <span className="info-icon">i</span></span>
            <div className="plan-footer-tax text-white">* Including of all taxes</div>

            <div className="detail-banner banner-grey">
              The Rs 9999 plan starts with paying only Rs 999. The remaining amount will be deducted from your earnings. You can also pay the total amount and start withdrawing immediately.
            </div>
            
            <ul className="plan-features">
              <li>Lifetime Validity</li>
              <li>Unlimited Earning</li>
              <li>Unlimited Captcha</li>
              <li>Work 24 hours</li>
              <li>1000 Captchas = Rs. 75</li>
              <li>Surveys</li>
              <li>Courses + (All Features )</li>
              <li>Jobs Info</li>
              <li>Govt Exam Info</li>
              <li>Govt Job Info</li>
              <li>Edu Academy Access</li>
              <li>English Speaking</li>
            </ul>
            
            <div className="bottom-note text-dark text-bold">Note - This fee is to access all the paid features and will be refunded when you learn and earn 35000 rs/-</div>
            <button className="plan-action-btn dark-btn fill-btn" onClick={() => setPurchasePopup({name: 'Platinum', offerAmount: 999, fullAmount: 9999})}>SELECT PLAN</button>
          </div>

          {/* SILVER PLUS CARD */}
          <div className="plan-card color-card-white">
            <div className="plan-badge-wrapper silver-badge-wrapper">
              <div className="plan-badge">TOP SELLING</div>
              <div className="badge-decoration"></div>
            </div>
            
            <h2 className="plan-title text-dark" style={{fontSize: '2.4rem'}}>Silver Plus</h2>
            <h3 className="plan-subtitle text-dark">Rs. 3,999</h3>
            <span className="plan-refundable">(Refundable) <span className="info-icon">i</span></span>
            <div className="plan-footer-tax">* Including of all taxes</div>

            <br />
            
            <ul className="plan-features features-dark">
              <li>Lifetime Validity</li>
              <li>Unlimited Earning</li>
              <li>Unlimited Captcha</li>
              <li>Work 24 hours</li>
              <li>2000 Captchas = Rs. 75</li>
              <li>Surveys</li>
              <li>Courses + (All Features )</li>
              <li>Jobs Info</li>
              <li>Govt Exam Info</li>
              <li>Govt Job Info</li>
              <li>Edu Academy Access</li>
              <li>English Speaking</li>
              <li>Start direct payment</li>
            </ul>
            
            <div className="bottom-note note-orange">Note - This fee is to access all the paid features and will be refunded when you learn and earn 35000 rs/-</div>
            <button className="plan-action-btn dark-btn fill-btn" onClick={() => setPurchasePopup({name: 'Silver Plus', offerAmount: 3999, fullAmount: 39999})}>SELECT PLAN</button>
          </div>
        </main>
        {renderModals()}
      </div>
    )
  }

  if (appState === 'demo') {
    return (
      <div className="app-container demo-view">
        {/* Top App Bar */}
        <header className="demo-header">
          <Menu size={28} className="icon-white" onClick={() => setIsMenuOpen(true)} style={{cursor: 'pointer'}} />
          <div className="demo-central-logo">
            <div className="logo-badge demo-badge">P<span style={{fontSize:'0.6rem'}}>24</span></div>
            <span style={{fontSize:'8px', fontWeight:'700', marginTop:'2px'}}>PREMIUM24</span>
          </div>
          <div className="demo-header-actions">
            <Wallet size={24} className="icon-white" />
            <Bell size={24} className="icon-white" />
            <div className={`language-toggle demo-lang ${currentLanguage === 'hi' ? 'active' : ''}`} onClick={toggleLanguage} style={{cursor: 'pointer'}}>
              <div className="toggle-switch"></div>
              <span>{t('langLabel')}</span>
            </div>
          </div>
        </header>

        <main className="demo-main">
          {/* Captcha Card */}
          <div className="captcha-card">
            <div className="captcha-image-wrapper" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc'}}>
              <canvas ref={canvasRef} width={280} height={120} style={{maxWidth: '100%', cursor: 'pointer'}} onClick={generateCaptcha} />
            </div>
            
            <div className="captcha-statsbar">
              <div className="captcha-stats-left">
                <span className="gold-text">{t('numbers')}</span>
                <span className="gold-text bold">{captchaText.length}</span>
              </div>
              <div className="captcha-timer">
                {timer} s
              </div>
            </div>

            <div className="captcha-input-group">
              <input 
                type="text" 
                placeholder={t('enterCaptcha')}
                className="captcha-input" 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCaptchaSubmit()}
              />
              <button className="captcha-skip-btn" onClick={generateCaptcha}>{t('skip')}</button>
            </div>

            <button className="captcha-submit-btn" onClick={handleCaptchaSubmit}>{t('submit')}</button>

            {/* Refer & Earn Sticker */}
            <div className="refer-sticker">
               {t('referEarn').split(' & ').join('\n&\n')}
            </div>
          
            {/* Stats & Actions */}
            <div className="demo-stats-row">
              <div className="stat-icon-whatsapp">
                <MessageCircle size={24} fill="white" color="#25D366" />
              </div>
              <div className="stat-box box-blue">
                <ChevronsRight size={20} color="#3b82f6" /> <span>{successCount + errorCount}</span>
              </div>
              <div className="stat-box box-red">
                <XCircle size={20} color="#ef4444" /> <span>{errorCount}</span>
              </div>
              <div className="stat-box box-green">
                <CheckCircle size={20} color="#22c55e" /> <span style={{fontSize: '1.2rem', fontWeight: '900', color: '#064e3b'}}>₹ {totalCoins}</span>
              </div>
            </div>

            <button className="refer-btn-large">
              Refer & Earn
            </button>

            {/* Rules List */}
            <ul className="demo-rules">
               <li>* All words are case sensitive.</li>
               <li>* Calculative Captchas must be solved.</li>
               <li>* Length of Captchas will be between 6 to 12 characters.</li>
               <li>* There result can also be negative numbers eg. (5 - 8 = -3).</li>
            </ul>
          </div>
        </main>

        {/* Bottom Banner */}
        <div className="demo-bottom-banner">
          <div className="banner-left">
             <span className="building-icon">🏢</span> Advertise For Brands / Startups / Businesses
          </div>
          <ArrowRight size={20} />
        </div>

        {/* Sidebar overlay and drawer */}
        {isMenuOpen && (
          <div className="sidebar-overlay" onClick={() => setIsMenuOpen(false)}></div>
        )}
        <div className={`sidebar-drawer ${isMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-profile">
              <div className="sidebar-avatar">
                <img src={loginImg} alt="User" />
              </div>
              <span className="sidebar-brand-name">{currentUser?.username || '24hr work'}</span>
            </div>
            <LogOut size={24} className="sidebar-logout" onClick={handleLogout} />
          </div>
          
          <div className="sidebar-menu">
            <div className="menu-item" onClick={() => handleMenuClick('Home', Home)}><Home size={20} /> <span>{t('home')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Plans', List)}><List size={20} /> <span>{t('plans')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Wallet', Wallet)}><Wallet size={20} /> <span>{t('wallet')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Referral Wallet', Users)}><Users size={20} /> <span>{t('referralWallet')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('My Courses', BookOpen)}><BookOpen size={20} /> <span>{t('myCourses')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('English Speaking', ClipboardList)}><ClipboardList size={20} /> <span>{t('englishSpeaking')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Edu-Exam Portal', ClipboardCheck)}><ClipboardCheck size={20} /> <span>{t('eduExamPortal')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Payment Proofs', CheckCircle2)}><CheckCircle2 size={20} /> <span>{t('paymentProofs')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Youtube', Youtube)}><Youtube size={20} /> <span>{t('youtube')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Govt Job Info', Building2)}><Building2 size={20} /> <span>{t('govtJobInfo')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Jobs Info', Briefcase)}><Briefcase size={20} /> <span>{t('jobsInfo')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Govt Exam Info', Landmark)}><Landmark size={20} /> <span>{t('govtExamInfo')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('General Knowledge', Lightbulb)}><Lightbulb size={20} /> <span>{t('generalKnowledge')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Survey', ListChecks)}><ListChecks size={20} /> <span>{t('survey')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Withdraw History', History)}><History size={20} /> <span>{t('withdrawHistory')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('My Account', User)}><User size={20} /> <span>{t('myAccount')}</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Support', PhoneCall)}><PhoneCall size={20} /> <span>{t('support')}</span></div>
          </div>

          <div className="sidebar-footer">
            <div className="footer-refer-info">
              <CircleDollarSign size={40} className="gold-coin-icon" color="#eab308" fill="#fef08a" />
              <div>
                <h3 className="footer-refer-title">Refer & Earn</h3>
                <p className="footer-refer-desc">Earn Upto 25k by referral this app with your friends and family !!</p>
              </div>
            </div>
            <button className="refer-now-btn">REFER NOW</button>
          </div>
        </div>
        {renderModals()}
      </div>
    )
  }

  // Onboarding UI
  return (
    <div className="app-container">
      <header className="header">
        <div className="top-logo">
          PREMIUM <span className="logo-badge">24</span>
        </div>
      </header>

      <main className="main-content onboarding-content">
        <div className="slide-wrapper" key={currentSlide}>
          <div className={`slide-container fade-in`}>
            {activeSlide.illustration && (
              <div className="illustration-area">
                 <img src={activeSlide.illustration} alt="Illustration" className="onboarding-img" />
              </div>
            )}
            <div className="onboarding-text-area">
              {activeSlide.title}
              {activeSlide.type === 'list' ? (
                <ul className="onboarding-list">
                  {activeSlide.items.map((item, idx) => (
                    <li key={idx}>- {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="onboarding-subtitle">{activeSlide.subtitle}</p>
              )}
              {activeSlide.email && <p className="onboarding-email">{activeSlide.email}</p>}
            </div>
          </div>
        </div>
      </main>

      <footer className="onboarding-footer">
        <div className="onboarding-links">
          <a href="https://www.TechAircraft.com" target="_blank" rel="noopener noreferrer">www.TechAircraft.com</a>
          <p>This Application is Powered By TechAircraft Solution Pvt. Ltd.</p>
        </div>
        <div className="navigation-row">
           <div className="dots-container">
            {slides.map((_, idx) => (
              <div key={idx} className={`dot ${currentSlide === idx ? 'active' : ''}`} onClick={() => setCurrentSlide(idx)} />
            ))}
          </div>
          <button className="next-btn" onClick={handleNext}>
            {currentSlide === slides.length - 1 ? <Check size={24} /> : <ArrowRight size={24} />}
          </button>
        </div>
      </footer>
    </div>
  )
}

export default App
