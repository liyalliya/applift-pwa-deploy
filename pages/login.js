import Head from 'next/head'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useUserProfile } from '../utils/userProfileStore'
import { shouldUseAppMode } from '../utils/pwaInstalled'

export default function Login() {
  const { profile, updateProfile } = useUserProfile()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [showPwReminder, setShowPwReminder] = useState(false)
  const router = useRouter()
  const [isAppMode, setIsAppMode] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsAppMode(shouldUseAppMode())
  }, [])

  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?"':{}|<>\-_=+\/\\\[\]`~;]/.test(password),
  }

  function handleSubmit(e) {
    e.preventDefault()
    // Clear any previous custom validity
    if (emailRef.current) emailRef.current.setCustomValidity('')
    if (passwordRef.current) passwordRef.current.setCustomValidity('')
    setEmailError(false)
    setPasswordError(false)

    // Email required
    if (!email) {
      if (emailRef.current) {
        emailRef.current.reportValidity()
        emailRef.current.focus()
        setEmailError(true)
      }
      return
    }

    if (!email.includes('@')) {
      if (emailRef.current) {
        emailRef.current.setCustomValidity('Email must contain an @')
        emailRef.current.reportValidity()
        emailRef.current.focus()
      }
      return
    }

    // Password rules
    const pwErrors = []
    if (!requirements.uppercase) pwErrors.push('include an uppercase letter')
    if (!requirements.number) pwErrors.push('include a number')
    if (!requirements.special) pwErrors.push('include a special character')
    if (!requirements.length) pwErrors.push('be at least 8 characters')

    if (pwErrors.length) {
      const message = `Password must ${pwErrors.join(', ')}`
      if (passwordRef.current) {
        passwordRef.current.setCustomValidity(message)
        passwordRef.current.reportValidity()
        passwordRef.current.focus()
        setPasswordError(true)
      }
      return
    }

    // Persist login details to profile; create userId if missing
    const userId = profile.userId || `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`
    updateProfile({ email, authProvider: 'email', userId })

    // All good -> redirect to dashboard (no backend yet)
    router.push('/dashboard')
  }

  return (
    <>
      <style jsx>{`
        .auth-container {
          height: 100dvh;
          width: 100vw;
          overflow: hidden;
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
          padding-left: max(1rem, env(safe-area-inset-left));
          padding-right: max(1rem, env(safe-area-inset-right));
        }
        
        @media (min-width: 768px) {
          .auth-container {
            min-height: 100vh;
            height: auto;
            overflow: auto;
            padding: 1.5rem;
          }
        }
        
        .auth-wrapper {
          max-width: 420px;
          max-height: 100%;
          overflow: auto;
        }
        
        @media (min-width: 768px) {
          .auth-wrapper {
            max-width: 28rem;
            max-height: none;
            overflow: visible;
          }
        }
      `}</style>
      
      <div className="auth-container bg-black flex items-center justify-center">
      <Head>
        <title>Log in — AppLift</title>
        <meta name="description" content="Log in to your " />
      </Head>

      <div className="auth-wrapper relative w-full">

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[36px] shadow-2xl" style={{
          padding: 'clamp(1rem, 3vh, 2rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(0.75rem, 2vh, 1.25rem)',
        }}>
          <h1 className="font-semibold text-center" style={{ 
            color: 'var(--app-white)',
            fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
            marginBottom: 'clamp(0.25rem, 1vh, 0.5rem)',
          }}>Welcome Back!</h1>
          <p className="text-center" style={{ 
            color: 'rgba(238,235,217,0.8)',
            fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
          }}>Sign in to your account</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.75rem, 2vh, 1rem)' }}>
              <label className="block">
                <span style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.75rem)', color: 'rgba(238,235,217,0.85)' }}>Email</span>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(false); if (emailRef.current) emailRef.current.setCustomValidity('') }}
                  className={`w-full rounded-full bg-black/40 text-white placeholder-gray-400 border ${emailError ? 'border-rose-400' : 'border-white/5'}`}
                  style={{
                    fontSize: 'clamp(0.875rem, 3vw, 1rem)',
                    padding: 'clamp(0.625rem, 2vh, 0.75rem) clamp(0.875rem, 3vw, 1rem)',
                    marginTop: 'clamp(0.25rem, 1vh, 0.5rem)',
                  }}
                  placeholder="Email"
                required
              />
            </label>

              <label className="block relative">
              <span style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.75rem)', color: 'rgba(238,235,217,0.85)' }}>Password</span>
              <div className="relative" style={{ marginTop: 'clamp(0.25rem, 1vh, 0.5rem)' }}>
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(false); if (passwordRef.current) passwordRef.current.setCustomValidity('') }}
                  onFocus={() => setShowPwReminder(true)}
                  onBlur={() => setShowPwReminder(false)}
                  className={`w-full rounded-full bg-black/40 text-white placeholder-gray-400 border ${passwordError ? 'border-rose-400' : 'border-white/5'}`}
                  style={{
                    fontSize: 'clamp(0.875rem, 3vw, 1rem)',
                    padding: 'clamp(0.625rem, 2vh, 0.75rem) clamp(2.5rem, 8vw, 3rem) clamp(0.625rem, 2vh, 0.75rem) clamp(0.875rem, 3vw, 1rem)',
                  }}
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 p-1"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 640 640" fill="currentColor">
                      <path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L504.5 470.8C507.2 468.4 509.9 466 512.5 463.6C559.3 420.1 590.6 368.2 605.5 332.5C608.8 324.6 608.8 315.8 605.5 307.9C590.6 272.2 559.3 220.2 512.5 176.8C465.4 133.1 400.7 96.2 319.9 96.2C263.1 96.2 214.3 114.4 173.9 140.4L73 39.1zM208.9 175.1C241 156.2 278.1 144 320 144C385.2 144 438.8 173.6 479.9 211.7C518.4 247.4 545 290 558.5 320C544.9 350 518.3 392.5 479.9 428.3C476.8 431.1 473.7 433.9 470.5 436.7L425.8 392C439.8 371.5 448 346.7 448 320C448 249.3 390.7 192 320 192C293.3 192 268.5 200.2 248 214.2L208.9 175.1zM390.9 357.1L282.9 249.1C294 243.3 306.6 240 320 240C364.2 240 400 275.8 400 320C400 333.4 396.7 346 390.9 357.1zM135.4 237.2L101.4 203.2C68.8 240 46.4 279 34.5 307.7C31.2 315.6 31.2 324.4 34.5 332.3C49.4 368 80.7 420 127.5 463.4C174.6 507.1 239.3 544 320.1 544C357.4 544 391.3 536.1 421.6 523.4L384.2 486C364.2 492.4 342.8 496 320 496C254.8 496 201.2 466.4 160.1 428.3C121.6 392.6 95 350 81.5 320C91.9 296.9 110.1 266.4 135.5 237.2z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 640 640" fill="currentColor">
                      <path d="M320 144C254.8 144 201.2 173.6 160.1 211.7C121.6 247.5 95 290 81.4 320C95 350 121.6 392.5 160.1 428.3C201.2 466.4 254.8 496 320 496C385.2 496 438.8 466.4 479.9 428.3C518.4 392.5 545 350 558.6 320C545 290 518.4 247.5 479.9 211.7C438.8 173.6 385.2 144 320 144zM127.4 176.6C174.5 132.8 239.2 96 320 96C400.8 96 465.5 132.8 512.6 176.6C559.4 220.1 590.7 272 605.6 307.7C608.9 315.6 608.9 324.4 605.6 332.3C590.7 368 559.4 420 512.6 463.4C465.5 507.1 400.8 544 320 544C239.2 544 174.5 507.2 127.4 463.4C80.6 419.9 49.3 368 34.4 332.3C31.1 324.4 31.1 315.6 34.4 307.7C49.3 272 80.6 220 127.4 176.6zM320 400C364.2 400 400 364.2 400 320C400 290.4 383.9 264.5 360 250.7C358.6 310.4 310.4 358.6 250.7 360C264.5 383.9 290.4 400 320 400zM240.4 311.6C242.9 311.9 245.4 312 248 312C283.3 312 312 283.3 312 248C312 245.4 311.8 242.9 311.6 240.4C274.2 244.3 244.4 274.1 240.5 311.5zM286 196.6C296.8 193.6 308.2 192.1 319.9 192.1C328.7 192.1 337.4 193 345.7 194.7C346 194.8 346.2 194.8 346.5 194.9C404.4 207.1 447.9 258.6 447.9 320.1C447.9 390.8 390.6 448.1 319.9 448.1C258.3 448.1 206.9 404.6 194.7 346.7C192.9 338.1 191.9 329.2 191.9 320.1C191.9 309.1 193.3 298.3 195.9 288.1C196.1 287.4 196.2 286.8 196.4 286.2C208.3 242.8 242.5 208.6 285.9 196.7z" />
                    </svg>
                  )}
                </button>
                {showPwReminder ? (
                  <div className="text-xs text-rose-400 mt-2">At least 8 characters with an uppercase, number, and symbol.</div>
                ) : null}
              </div>
            </label>

            <div className="flex items-center justify-between">
              <label className="flex items-center" style={{ gap: 'clamp(0.25rem, 1vw, 0.5rem)', fontSize: 'clamp(0.7rem, 2.5vw, 0.75rem)' }}>
                <input type="checkbox" className="rounded-sm bg-black/20 border border-white/5 checked:bg-[#EEEDB9] checked:border-[#EEEDB9]" style={{ width: 'clamp(0.875rem, 3vw, 1rem)', height: 'clamp(0.875rem, 3vw, 1rem)' }} />
                <span style={{ color: 'rgba(238,235,217,0.85)' }}>Remember me</span>
              </label>
              <a href="#" style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.75rem)', color: 'rgba(238,235,217,0.9)' }}>Forgot password?</a>
            </div>

            <button type="submit" className="w-full rounded-full bg-[#EEEDB9] text-black font-semibold flex items-center justify-center" style={{
              fontSize: 'clamp(0.875rem, 3vw, 1rem)',
              padding: 'clamp(0.625rem, 2vh, 0.75rem) clamp(0.875rem, 3vw, 1rem)',
            }}>
              <span>Sign in</span>
            </button>

            <div className="relative" style={{ margin: 'clamp(0.5rem, 1.5vh, 0.75rem) 0' }}>
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative text-center text-gray-400" style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.75rem)' }}>or</div>
            </div>
            <button className="w-full inline-flex items-center justify-center rounded-full bg-black/30 text-white border border-white/5" style={{
              gap: 'clamp(0.5rem, 2vw, 0.75rem)',
              padding: 'clamp(0.625rem, 2vh, 0.75rem) clamp(0.875rem, 3vw, 1rem)',
            }} onClick={() => updateProfile({ authProvider: 'google' })}>
              <svg width="18" height="18" viewBox="0 0 48 48" className="rounded-sm" style={{ width: 'clamp(14px, 4vw, 18px)', height: 'clamp(14px, 4vw, 18px)' }}>
                <path fill="#EA4335" d="M24 9.5c3.9 0 6.6 1.7 8.6 3.2l6.3-6.1C35.9 3 30.6 1 24 1 14.7 1 6.9 6.2 3 13.9l7.3 5.7C12.9 14.3 17.8 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8h12.7c-.5 2.6-2.3 6.6-6.7 9l8.3 6.4C43.6 37.4 46.5 31.5 46.5 24.5z"/>
                <path fill="#4A90E2" d="M10.3 29.6A14.5 14.5 0 0 1 9 24.5c0-1.7.3-3.3.8-4.8L3 13.9C1.1 17.5 0 21.7 0 24.5c0 5.6 2.1 10.5 5.6 14.2l4.7-9.1z"/>
                <path fill="#FBBC05" d="M24 46.9c6.6 0 12.1-2.2 16.1-6l-8.3-6.4c-2.4 1.6-5.4 2.6-7.8 2.6-6.2 0-11.1-4.8-12.2-11.2L3 34.5C6.9 41.8 14.7 46.9 24 46.9z"/>
              </svg>
              <span style={{ fontSize: 'clamp(0.8rem, 2.75vw, 0.875rem)' }}>Sign in with Google</span>
            </button>

            <div className="text-center" style={{ fontSize: 'clamp(0.8rem, 2.75vw, 0.875rem)', marginTop: 'clamp(0.5rem, 1.5vh, 1rem)' }}>Don't have an account? <Link href="/signup"><a style={{ color: 'var(--app-white)' }}>Sign up</a></Link></div>
          </form>
        </div>
      </div>
      </div>
    </>
  )
}
