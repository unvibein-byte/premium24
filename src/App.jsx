import React, { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import './App.css'
import { auth, googleProvider } from './firebase'
import { 
  ArrowRight, ArrowLeft, Check, Play, Globe, Menu, Wallet, Bell, MessageCircle, ChevronsRight, XCircle, CheckCircle,
  Home, List, Users, BookOpen, ClipboardList, ClipboardCheck, CheckCircle2, Youtube, Building2, Briefcase, Landmark, Lightbulb, ListChecks, Tag, Newspaper, History, User, PhoneCall, LogOut, CircleDollarSign
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
      "News Portal Access",
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
  const [selectedScheme, setSelectedScheme] = useState('offer')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

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
    } else {
      setActiveMenuData({ title, Icon })
      setAppState('generic-page')
    }
    setIsMenuOpen(false)
  }

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

    if (title === 'Wallet' || title === 'Referral Wallet') {
      return (
        <div className="custom-page-content" style={{width: '100%', maxWidth: '500px', margin: '0 auto'}}>
          <div className="wallet-balance-card" style={{backgroundColor: '#003d2b', color: 'white', borderRadius: '20px', padding: '2.5rem 2rem', textAlign: 'center', width: '100%', marginBottom: '1.5rem', boxShadow: '0 10px 30px rgba(0,61,43,0.2)'}}>
            <h3 style={{fontSize: '1rem', fontWeight: 600, color: '#a3b1a7', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px'}}>{title} Balance</h3>
            <h1 style={{fontSize: '4rem', fontWeight: 800, margin: 0, letterSpacing: '-1px'}}>₹ 0.00</h1>
            <p style={{fontSize: '0.9rem', color: '#e2e8f0', marginTop: '1.2rem', letterSpacing: '0.5px'}}>Total Lifetime Earnings: ₹ 0.00</p>
          </div>
          <div className="wallet-actions" style={{display: 'flex', gap: '1rem', width: '100%'}}>
            <button className="plan-action-btn dark-btn fill-btn" style={{flex: 1, backgroundColor: '#f97316', border: 'none', height: '54px'}}>Withdraw Funds</button>
            <button className="plan-action-btn dark-btn fill-btn" style={{flex: 1, height: '54px'}}>Add Money</button>
          </div>
          
          <h3 style={{marginTop: '3rem', color: '#0f172a', fontWeight: 800, fontSize: '1.3rem'}}>Recent Transactions</h3>
          <div className="transaction-empty" style={{textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8'}}>
            <History size={48} style={{opacity: 0.3, marginBottom: '1rem'}} />
            <p style={{fontWeight: 600}}>No transactions found yet</p>
          </div>
        </div>
      );
    }

    if (title === 'My Account') {
      return (
        <div className="custom-page-content" style={{width: '100%', maxWidth: '500px', margin: '0 auto'}}>
          <div className="profile-card" style={{backgroundColor: 'white', borderRadius: '20px', padding: '2.5rem 1.5rem', textAlign: 'center', width: '100%', marginBottom: '1.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.06)'}}>
            <div className="profile-avatar" style={{width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#f5f8fa', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #e2e8f0'}}>
              <User size={48} color="#94a3b8" />
            </div>
            <h2 style={{fontSize: '1.8rem', color: '#0f172a', marginBottom: '0.4rem', fontWeight: 800}}>John Doe</h2>
            <p style={{color: '#64748b', fontSize: '1rem', marginBottom: '2rem', fontWeight: 500}}>+91 9876543210</p>
            
            <div className="kyc-banner" style={{backgroundColor: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
              <div style={{textAlign: 'left'}}>
                <h4 style={{margin: '0 0 0.2rem 0', color: '#b45309', fontWeight: 800, fontSize: '1.1rem'}}>KYC Pending</h4>
                <span style={{fontSize: '0.85rem', color: '#d97706', fontWeight: 500}}>Verify identity to withdraw</span>
              </div>
              <button style={{backgroundColor: '#b45309', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'}}>Verify</button>
            </div>
          </div>

          <div className="profile-actions-list" style={{backgroundColor: 'white', borderRadius: '20px', padding: '0.5rem', width: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.06)'}}>
            <div style={{display: 'flex', alignItems: 'center', padding: '1.2rem 1rem', borderBottom: '1px solid #f1f5f9', color: '#1e293b', fontWeight: 600, cursor: 'pointer'}}><User size={22} style={{marginRight: '1rem', color: '#64748b'}} /> Edit Profile</div>
            <div style={{display: 'flex', alignItems: 'center', padding: '1.2rem 1rem', borderBottom: '1px solid #f1f5f9', color: '#1e293b', fontWeight: 600, cursor: 'pointer'}}><Globe size={22} style={{marginRight: '1rem', color: '#64748b'}} /> App Language</div>
            <div style={{display: 'flex', alignItems: 'center', padding: '1.2rem 1rem', color: '#ef4444', fontWeight: 700, cursor: 'pointer'}} onClick={handleLogout}><LogOut size={22} style={{marginRight: '1rem'}} /> Logout User</div>
          </div>
        </div>
      );
    }

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
        <header className="video-header">
          <ArrowLeft size={28} className="icon-white back-arrow" onClick={() => setAppState('demo')} />
          <h2 className="generic-header-title">{activeMenuData?.title}</h2>
          <div style={{flex: 1}}></div>
        </header>

        <main className="generic-main">
          {renderGenericContent()}
        </main>
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
            <p>You are subscribed to <span className="highlight-plan">Demo Plan</span>.</p>
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
      <div className="app-container video-view" style={{backgroundColor: '#003d2b', minHeight: '100dvh'}}>
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
                <button className="popup-ok-btn" onClick={() => setPurchasePopup(null)}>OK</button>
              </div>
            </div>
          </div>
        )}
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
            <div className="language-toggle demo-lang">
              <div className="toggle-switch"></div>
              <span>हिंदी</span>
            </div>
          </div>
        </header>

        <main className="demo-main">
          {/* Captcha Card */}
          <div className="captcha-card">
            <div className="captcha-image-wrapper">
              <img src={captchaImg} alt="Captcha" />
            </div>
            
            <div className="captcha-statsbar">
              <div className="captcha-stats-left">
                <span className="gold-text">Numbers</span>
                <span className="gold-text bold">6</span>
              </div>
              <div className="captcha-timer">
                59 s
              </div>
            </div>

            <div className="captcha-input-group">
              <input type="text" placeholder="Enter Captcha" className="captcha-input" />
              <button className="captcha-skip-btn">SKIP</button>
            </div>

            <button className="captcha-submit-btn">Submit</button>

            {/* Refer & Earn Sticker */}
            <div className="refer-sticker">
               REFER<br/>&<br/>EARN
            </div>
          
            {/* Stats & Actions */}
            <div className="demo-stats-row">
              <div className="stat-icon-whatsapp">
                <MessageCircle size={24} fill="white" color="#25D366" />
              </div>
              <div className="stat-box box-blue">
                <ChevronsRight size={20} color="#3b82f6" /> <span>0</span>
              </div>
              <div className="stat-box box-red">
                <XCircle size={20} color="#ef4444" /> <span>0</span>
              </div>
              <div className="stat-box box-green">
                <CheckCircle size={20} color="#22c55e" /> <span>0</span>
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
            <div className="menu-item" onClick={() => handleMenuClick('Home', Home)}><Home size={20} /> <span>Home</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Plans', List)}><List size={20} /> <span>Plans</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Wallet', Wallet)}><Wallet size={20} /> <span>Wallet</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Referral Wallet', Users)}><Users size={20} /> <span>Referral Wallet</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('My Courses', BookOpen)}><BookOpen size={20} /> <span>My Courses</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('English Speaking', ClipboardList)}><ClipboardList size={20} /> <span>English Speaking</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Edu-Exam Portal', ClipboardCheck)}><ClipboardCheck size={20} /> <span>Edu-Exam Portal</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Payment Proofs', CheckCircle2)}><CheckCircle2 size={20} /> <span>Payment Proofs</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Youtube', Youtube)}><Youtube size={20} /> <span>Youtube</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Govt Job Info', Building2)}><Building2 size={20} /> <span>Govt Job Info</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Jobs Info', Briefcase)}><Briefcase size={20} /> <span>Jobs Info</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Govt Exam Info', Landmark)}><Landmark size={20} /> <span>Govt Exam Info</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('General Knowledge', Lightbulb)}><Lightbulb size={20} /> <span>Genral knowledge</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Survey', ListChecks)}><ListChecks size={20} /> <span>Survey</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Discounts', Tag)}><Tag size={20} /> <span>Discounts</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('News Portal', Newspaper)}><Newspaper size={20} /> <span>News Portal</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Withdraw History', History)}><History size={20} /> <span>Withdraw History</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('My Account', User)}><User size={20} /> <span>My Account</span></div>
            <div className="menu-item" onClick={() => handleMenuClick('Support', PhoneCall)}><PhoneCall size={20} /> <span>Support</span></div>
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
