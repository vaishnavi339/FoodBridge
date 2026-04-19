'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Stepper from '../components/Stepper';

export default function SignupVerify() {
  const router = useRouter();
  const { register } = useAuth();
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({});
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [phoneOtp, setPhoneOtp] = useState(['', '', '', '', '', '']);
  const [verifyPhone, setVerifyPhone] = useState(false);
  const [timer, setTimer] = useState(30);
  const [customError, setCustomError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [uploads, setUploads] = useState({
    registrationCert: null,
    cert80G: null,
    idProof: null,
  });

  const otpRefs = useRef([...Array(6)].map(() => useRef(null)));
  const phoneOtpRefs = useRef([...Array(6)].map(() => useRef(null)));

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('signup_progress') || '{}');
    if (!saved.role || saved.step < 2) {
      router.push('/signup');
      return;
    }
    setRole(saved.role);
    setFormData(saved.formData);
    setEmail(saved.formData?.email || 'your email');
  }, [router]);

  useEffect(() => {
    if (timer > 0) {
      const int = setInterval(() => setTimer(prev => prev - 1), 1000);
      return () => clearInterval(int);
    }
  }, [timer]);

  useEffect(() => {
    if (role) {
      const existing = JSON.parse(localStorage.getItem('signup_progress') || '{}');
      localStorage.setItem('signup_progress', JSON.stringify({ 
        ...existing, 
        step: 3
      }));
    }
  }, [role]);

  const handleOTPInput = (index, value, isPhone = false) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = isPhone ? [...phoneOtp] : [...otp];
    newOtp[index] = value;
    
    if (isPhone) setPhoneOtp(newOtp);
    else setOtp(newOtp);

    const refs = isPhone ? phoneOtpRefs.current : otpRefs.current;
    
    // Auto-advance
    if (value && index < 5) {
      refs[index + 1].current.focus();
    }
    
    // Auto-verify on last digit
    if (!isPhone && value && index === 5 && newOtp.every(d => d !== '')) {
      simulateVerify();
    }
  };

  const handleOTPKeyDown = (e, index, isPhone = false) => {
    if (e.key === 'Backspace') {
      const currentOtp = isPhone ? phoneOtp : otp;
      const refs = isPhone ? phoneOtpRefs.current : otpRefs.current;
      
      if (!currentOtp[index] && index > 0) {
        refs[index - 1].current.focus();
      }
    }
  };

  const simulateVerify = () => {
    setIsVerifying(true);
    // Simulate API call
    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
    }, 1000);
  };

  const resendCode = () => {
    if (timer === 0) {
      setTimer(30);
      setOtp(['', '', '', '', '', '']);
    }
  };

  const handleFileUpload = (type, file) => {
    if (file) {
      setUploads(prev => ({
        ...prev,
        [type]: { name: file.name, size: (file.size / 1024 / 1024).toFixed(2) + 'MB' }
      }));
    }
  };

  const removeFile = (type) => {
    setUploads(prev => ({ ...prev, [type]: null }));
  };

  const handleComplete = async () => {
    setSubmitLoading(true);
    setCustomError('');
    try {
      // Mock document upload if NGO
      if (role === 'receiver') {
        const formDataPayload = new FormData();
        if (uploads.registrationCert) formDataPayload.append('registrationCert', 'uploaded');
        if (uploads.idProof) formDataPayload.append('idProof', 'uploaded');
        // Fetch mock for POST /api/auth/upload-documents
        try { fetch('/api/auth/upload-documents', { method: 'POST', body: formDataPayload }).catch(()=>null); } catch(e){}
      }
      
      // Call Context Auth API
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: role,
        orgName: formData.orgName,
        orgType: formData.orgType,
        address: formData.address,
        latitude: null,
        longitude: null,
      };

      await register(payload);
      router.push('/signup/welcome');
    } catch (err) {
      setCustomError(err?.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const FileDropZone = ({ title, required, type }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {title} {required ? '' : <span className="text-slate-500 font-normal">(Optional)</span>}
      </label>
      
      {uploads[type] ? (
        <div className="bg-[#161b22] border border-[#1D9E75] rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
              <p className="text-sm font-medium text-slate-200">{uploads[type].name}</p>
              <p className="text-xs text-slate-400">{uploads[type].size}</p>
            </div>
          </div>
          <button onClick={() => removeFile(type)} className="text-slate-400 hover:text-red-400 p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-[#21262d] rounded-xl p-6 text-center hover:border-slate-400 transition-colors bg-[#0d1117] relative">
          <input 
            type="file" 
            accept=".pdf,.png,.jpg,.jpeg" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => handleFileUpload(type, e.target.files[0])}
          />
          <svg className="w-8 h-8 text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          <p className="text-sm text-slate-300 font-medium">Upload PDF or image (max 5MB)</p>
          <p className="text-xs text-slate-500 mt-1">Drag and drop or click to browse</p>
        </div>
      )}
    </div>
  );

  const canComplete = isVerified && (role === 'donor' || (uploads.registrationCert && uploads.idProof));
  const activeColorClass = role === 'donor' ? 'bg-[#1D9E75]' : 'bg-[#378ADD]';

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-[520px]">
        <Link href="/signup/profile" className="text-sm text-slate-400 hover:text-white flex items-center mb-6 w-fit transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back
        </Link>
        
        <Stepper currentStep={3} />
        
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-center text-white mb-6">Verification</h2>

          {role === 'donor' ? (
            <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-xl p-4 mb-8 flex items-start gap-3">
              <svg className="w-6 h-6 text-[#1D9E75] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p className="text-sm text-emerald-100">Donors are verified quickly — just confirm your contact details.</p>
            </div>
          ) : (
            <div className="bg-[#EF9F27]/10 border border-[#EF9F27]/20 rounded-xl p-4 mb-8 flex items-start gap-3">
              <svg className="w-6 h-6 text-[#EF9F27] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p className="text-sm text-amber-100/90">NGO accounts require document verification. This usually takes 24–48 hours.</p>
            </div>
          )}

          {role === 'receiver' && (
            <div className="mb-8 border-b border-[#21262d] pb-8">
              <FileDropZone title="1. NGO registration certificate" required={true} type="registrationCert" />
              <FileDropZone title="2. 80G / 12A certificate" required={false} type="cert80G" />
              <FileDropZone title="3. ID proof of authorized person" required={true} type="idProof" />
            </div>
          )}

          {/* Email OTP Verification */}
          <div className="mb-8">
            <h3 className="text-base font-semibold text-white mb-2">Email Verification</h3>
            <p className="text-sm text-slate-400 mb-4">We sent a 6-digit code to <span className="text-slate-200">{email}</span></p>
            
            <div className="flex gap-2 sm:gap-3 justify-center mb-4">
              {otp.map((digit, i) => (
                <input
                  key={`otp-${i}`}
                  ref={(el) => otpRefs.current[i].current = el}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOTPInput(i, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(e, i)}
                  className={`w-10 sm:w-12 h-12 sm:h-14 text-center text-xl font-bold bg-[#0d1117] border rounded-xl outline-none transition-all ${
                    digit ? 'border-[#1D9E75] text-[#1D9E75]' : 'border-[#21262d] text-white focus:border-slate-400'
                  }`}
                  disabled={isVerifying || isVerified}
                />
              ))}
            </div>

            <div className="text-center">
              <button 
                onClick={resendCode}
                disabled={timer > 0 || isVerified}
                className={`text-sm ${timer === 0 && !isVerified ? 'text-[#378ADD] hover:underline' : 'text-slate-500 cursor-not-allowed'}`}
              >
                {timer > 0 ? `Resend code in 00:${timer.toString().padStart(2, '0')}` : 'Resend code'}
              </button>
            </div>
          </div>

          {/* Phone OTP Toggle Options (Donor or both) */}
          {!isVerified && (
            <div className="mb-8">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${verifyPhone ? 'bg-[#1D9E75]' : 'border border-[#21262d] bg-[#0d1117] group-hover:border-slate-500'}`}>
                  {verifyPhone && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                </div>
                <span className="text-sm text-slate-300 select-none">Also verify phone number (recommended)</span>
                <input type="checkbox" className="hidden" checked={verifyPhone} onChange={() => setVerifyPhone(!verifyPhone)} />
              </label>

              {verifyPhone && (
                <div className="mt-4 flex gap-2 sm:gap-3 justify-center">
                  {phoneOtp.map((digit, i) => (
                    <input
                      key={`phoneotp-${i}`}
                      ref={(el) => phoneOtpRefs.current[i].current = el}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleOTPInput(i, e.target.value, true)}
                      onKeyDown={(e) => handleOTPKeyDown(e, i, true)}
                      className={`w-10 sm:w-12 h-12 sm:h-14 text-center text-xl font-bold bg-[#0d1117] border border-[#21262d] rounded-xl outline-none focus:border-slate-400 text-white transition-all`}
                      disabled={isVerifying || isVerified}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {isVerified && (
            <div className="bg-[#0d1117] border border-[#21262d] rounded-xl p-5 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-5 h-5 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p className="text-sm font-medium text-slate-200">Email verified successfully</p>
              </div>
              
              {role === 'receiver' && (
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-5 h-5 text-[#EF9F27]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <p className="text-sm font-medium text-slate-200">Documents under review (24–48 hours)</p>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#378ADD]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p className="text-sm font-medium text-slate-200">You can explore the platform while we verify</p>
              </div>
            </div>
          )}

          {customError && (
             <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
               {customError}
             </div>
          )}

          <button 
            onClick={handleComplete}
            disabled={!canComplete || submitLoading}
            className={`w-full font-semibold py-3.5 px-4 rounded-xl transition-all ${
              canComplete && !submitLoading ? `${activeColorClass} text-white shadow-md hover:brightness-110` : 'bg-[#21262d] text-slate-500 cursor-not-allowed'
            }`}
          >
            {submitLoading ? 'Creating Account...' : 'Complete signup'}
          </button>
        </div>
      </div>
    </div>
  );
}
