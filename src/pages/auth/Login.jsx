import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, loginWithGoogle } from '../../firebase/auth';
import { Eye, EyeOff } from 'lucide-react';

export const Login = () => {
  // Pre-filled admin credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(
          err.message || 'Login failed. Pastikan Firebase Anda sudah dikonfigurasi dan akun ini ada.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError(
          err.message || 'Login dengan Google gagal. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EFEFEF] p-4 lg:p-8 font-sans">
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] w-full max-w-5xl flex overflow-hidden lg:flex-row flex-col min-h-[600px] lg:min-h-[680px]">
        
        {/* Left Side: Form */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative">
          
          {/* Logo */}
          <div className="absolute top-8 left-10 lg:top-12 lg:left-16 flex items-center gap-3">
             <div className="w-5 h-6 bg-[#7B3DF6] rounded-sm flex items-center justify-center">
                 <div className="w-2.5 h-3.5 bg-white rounded-sm"></div>
             </div>
             <span className="font-bold text-slate-800 text-lg tracking-tight">Tiga Warna</span>
          </div>

          <div className="max-w-[380px] w-full mt-12">
            <h1 className="text-[2.75rem] font-bold text-slate-900 leading-[1.1] tracking-tight">
              Halo,<br />
              Selamat Datang Kembali
            </h1>
            <p className="text-slate-500 mt-4 text-[15px] font-medium">
              Masuk untuk melanjutkan
            </p>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3.5 rounded-xl mt-6 text-sm border border-red-100 font-medium flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#7B3DF6]/20 focus:border-[#7B3DF6] outline-none transition-all text-[15px] font-medium text-slate-700 placeholder-slate-400 bg-white"
                  placeholder="admin@gmail.com"
                  required 
                />
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 pr-12 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#7B3DF6]/20 focus:border-[#7B3DF6] outline-none transition-all text-[15px] font-medium text-slate-700 placeholder-slate-400 bg-white tracking-widest"
                  placeholder="••••••••"
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className="flex items-center justify-between text-[13px] pt-1">
                <label className="flex items-center text-slate-500 cursor-pointer group">
                  <input 
                      type="checkbox" 
                      className="peer sr-only" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <div className="w-[18px] h-[18px] rounded-[4px] bg-white border-2 border-slate-200 peer-checked:bg-[#7B3DF6] peer-checked:border-[#7B3DF6] flex items-center justify-center transition-all mr-2.5">
                     <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                     </svg>
                  </div>
                  <span className="font-semibold text-slate-400 group-hover:text-slate-600 transition">Ingatkan Saya</span>
                </label>
                <a href="#" className="font-semibold text-slate-400 hover:text-[#7B3DF6] transition">Lupa Password?</a>
              </div>

              <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-[#7B3DF6] hover:bg-[#682ae3] active:bg-[#5b1fc9] text-white font-semibold py-3.5 px-10 rounded-xl transition-all shadow-[0_8px_20px_-4px_rgba(123,61,246,0.4)] disabled:opacity-70 disabled:shadow-none"
                  >
                    {loading ? 'Masuk...' : 'Masuk'}
                  </button>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">Atau</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                  <button 
                    type="button" 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold py-3.5 px-10 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Masuk dengan Google
                  </button>
              </div>
            </form>

            {/* <div className="mt-12 text-[14px] text-slate-400 font-medium">
               Belum punya akun? <Link to="/register" className="text-[#7B3DF6] font-bold hover:underline">Daftar</Link>
            </div> */}
          </div>
        </div>

        {/* Right Side: Abstract Illustration & Gradient */}
        <div className="bg-gradient-to-br from-[#A06CF6] via-[#8545F3] to-[#6018E6] w-full lg:w-1/2 p-12 relative flex items-center justify-center overflow-hidden min-h-[300px] lg:min-h-full">
            {/* White Cloud Accents Background */}
            <div className="absolute top-1/4 -left-10 w-40 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute top-10 right-20 w-24 h-16 bg-white/20 rounded-full blur-xl"></div>
            <div className="absolute bottom-1/3 right-10 w-48 h-24 bg-white/10 rounded-full blur-2xl"></div>
            
            {/* Abstract Graphic Element (Mobile Mockup representation) */}
            <div className="relative z-10 w-full max-w-[280px] aspect-[1/2] rounded-[2.5rem] flex flex-col items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-500 ease-out">
               
               {/* Main phone body layer */}
               <div className="absolute inset-0 bg-gradient-to-b from-[#b285fa] to-[#8d4bf5] rounded-[3rem] shadow-[-15px_15px_0px_0px_rgba(40,4,115,0.2)] border-2 border-[#b285fa]/30"></div>
               
               {/* Phone screen layer */}
               <div className="absolute inset-2 bg-gradient-to-br from-[#c8a4fc] to-[#a36df7] rounded-[2.5rem] overflow-hidden flex flex-col items-center p-6 border-t border-[#d3b8fd]/50">
                  
                  {/* Fingerprint / Check bubble */}
                  <div className="absolute top-10 -left-6 z-20 w-16 h-16 bg-white rounded-full shadow-[0_10px_20px_-5px_rgba(0,0,0,0.2)] flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#A06CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                  </div>
                  
                  {/* Floating Lock */}
                  <div className="absolute bottom-24 -right-10 z-20 w-20 h-24 bg-white rounded-2xl shadow-[0_20px_30px_-10px_rgba(0,0,0,0.3)] flex items-center justify-center -rotate-6">
                      <svg className="w-8 h-8 text-[#A06CF6] mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                      </svg>
                      {/* lock keyhole */}
                      <div className="absolute top-[60%] w-2 h-2 rounded-full bg-[#A06CF6]"></div>
                      <div className="absolute top-[60%] mt-1 w-1 h-3 rounded-b-sm bg-[#A06CF6]"></div>
                  </div>

                  {/* Screen Content Graphics */}
                  <div className="w-full flex justify-end mb-8 space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                  </div>
                  
                  {/* Fingerprint animation circle */}
                  <div className="w-24 h-24 rounded-full border-4 border-white/20 mt-10 flex items-center justify-center relative">
                     <div className="w-16 h-16 rounded-full border-4 border-[#fff] border-t-white/10 animate-spin absolute"></div>
                     <svg className="w-10 h-10 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                     </svg>
                  </div>
                  
                  <div className="bg-white/20 h-1.5 w-3/4 rounded-full mt-auto mb-2"></div>
                  <div className="text-white/60 text-[10px] uppercase tracking-widest font-bold mb-8">Tiga Warna Printing</div>
               </div>
            </div>

            {/* Cloud shapes vector at bottom */}
            <div className="absolute bottom-0 left-0 w-full z-0 translate-y-2">
                <svg viewBox="0 0 1200 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-24">
                   <path d="M0,80 C150,150 300,40 450,80 C600,120 750,40 900,80 C1050,120 1200,80 1200,80 L1200,120 L0,120 Z" fill="#ffffff"></path>
                   <path d="M0,100 C200,50 400,120 600,80 C800,40 1000,110 1200,80 L1200,120 L0,120 Z" fill="#ffffff" opacity="0.6"></path>
                   <path d="M0,120 C250,90 500,120 750,90 C1000,60 1200,120 1200,120 L1200,120 L0,120 Z" fill="#ffffff" opacity="0.3"></path>
                </svg>
            </div>
            {/* Some floating clouds left/right */}
            <div className="absolute top-1/2 left-8 w-16 h-8 bg-white/20 rounded-full blur-sm"></div>
            <div className="absolute bottom-1/4 right-1/4 w-24 h-10 bg-white/30 rounded-full blur-[2px]"></div>
        </div>
      </div>
    </div>
  );
};
