'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiMapPin, FiCrosshair } from 'react-icons/fi';
import Stepper from '../components/Stepper';

const TOP_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 
  'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 
  'Pimpri-Chinchwad', 'Patna', 'Vadodara'
];

export default function SignupProfile() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [formData, setFormData] = useState({
    city: '',
    address: '',
    orgName: '',
    orgType: '', // reused for NGO type
    registrationNumber: '', // NGO only
    operatingHoursStart: '', // Donor only
    operatingHoursEnd: '', // Donor only
    mission: '', // Donor only
    serviceAreas: [], // NGO only
    capacity: 50, // NGO only
    profilePhoto: null,
    latitude: null,
    longitude: null
  });
  
  const [detecting, setDetecting] = useState(false);
  
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('signup_progress') || '{}');
    if (!saved.role || saved.step < 1) {
      router.push('/signup'); // redirect if not completed prev step
      return;
    }
    setRole(saved.role);
    if (saved.formData) {
      setFormData(prev => ({ ...prev, ...saved.formData }));
      setCitySearch(saved.formData.city || '');
    }
    // Close dropdown on click outside
    const handleClickOutside = (e) => {
      if (cityRef.current && !cityRef.current.contains(e.target)) setShowCityDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [router]);

  useEffect(() => {
    if (role) {
      const existing = JSON.parse(localStorage.getItem('signup_progress') || '{}');
      localStorage.setItem('signup_progress', JSON.stringify({ 
        ...existing, 
        step: 2, 
        role, 
        formData: { ...existing.formData, ...formData } 
      }));
    }
  }, [formData, role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCityChange = (e) => {
    setCitySearch(e.target.value);
    setFormData(prev => ({ ...prev, city: e.target.value }));
    setShowCityDropdown(true);
  };

  const selectCity = (city) => {
    setCitySearch(city);
    setFormData(prev => ({ ...prev, city }));
    setShowCityDropdown(false);
  };

  const toggleServiceArea = (area) => {
    setFormData(prev => {
      const current = prev.serviceAreas;
      if (current.includes(area)) {
        return { ...prev, serviceAreas: current.filter(a => a !== area) };
      }
      return { ...prev, serviceAreas: [...current, area] };
    });
  };

  const updateCapacity = (amount) => {
    setFormData(prev => ({
      ...prev,
      capacity: Math.max(0, prev.capacity + amount)
    }));
  };

  const detectLocation = () => {
    setDetecting(true);
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      setDetecting(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setDetecting(false);
        toast.success('Location detected!');
      },
      () => {
        alert('Could not detect location');
        setDetecting(false);
      }
    );
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profilePhoto: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredCities = TOP_CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
  
  const donorOrgTypes = ['Restaurant', 'Hotel', 'Grocery Store', 'Event/Catering', 'Other'];
  const ngoTypes = ['Registered NGO', 'Community Kitchen', 'Orphanage', 'Old Age Home', 'Volunteer Group', 'Other'];
  const delhiZones = ['North', 'South', 'East', 'West', 'Central', 'NCR'];

  const roleColor = role === 'donor' ? '#1D9E75' : '#378ADD';
  const roleLabel = role === 'donor' ? 'Donor' : 'NGO / Volunteer';
  const activeColorClass = role === 'donor' ? 'bg-[#1D9E75]' : 'bg-[#378ADD]';

  const isValid = () => {
    if (!formData.orgName || !formData.orgType || !formData.city || !formData.address) return false;
    if (role === 'donor') {
      if (!formData.operatingHoursStart || !formData.operatingHoursEnd) return false;
    } else {
      if (!formData.registrationNumber || formData.serviceAreas.length === 0) return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (isValid()) {
      router.push('/signup/verify');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-[520px]">
        <Link href="/signup/details" className="text-sm text-slate-400 hover:text-white flex items-center mb-6 w-fit transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back
        </Link>
        
        <Stepper currentStep={2} />
        
        <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex justify-center mb-6">
            <span 
              className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full text-white shadow-sm"
              style={{ backgroundColor: roleColor }}
            >
              {roleLabel}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-center text-white mb-8">Profile Setup</h2>
          
          {/* Profile Photo - Shared */}
          <div className="flex flex-col items-center mb-8">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`w-20 h-20 rounded-full border-2 border-dashed ${formData.profilePhoto ? 'border-transparent' : 'border-[#21262d] hover:border-slate-400'} cursor-pointer flex justify-center items-center overflow-hidden bg-[#0d1117] relative group transition-colors`}
            >
              {formData.profilePhoto ? (
                <>
                  <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </div>
                </>
              ) : (
                <svg className="w-6 h-6 text-slate-500 group-hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">Upload Profile Photo</p>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          </div>

          <div className="space-y-6">
            {/* Common basic fields */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Organization Name</label>
              <input 
                type="text" 
                name="orgName"
                value={formData.orgName}
                onChange={handleChange}
                className="w-full bg-[#0d1117] border border-[#21262d] focus:border-slate-400 px-4 py-2.5 rounded-xl text-white outline-none transition-colors"
                placeholder={role === 'donor' ? "Taj Palace Hotel, FreshMart, etc." : "NGO Name"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{role === 'donor' ? 'Organization Type' : 'NGO Type'}</label>
              <div className="flex flex-wrap gap-2">
                {(role === 'donor' ? donorOrgTypes : ngoTypes).map(type => (
                  <button
                    key={type}
                    onClick={() => setFormData(prev => ({ ...prev, orgType: type }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      formData.orgType === type
                        ? `bg-[${roleColor}] text-white`
                        : 'bg-[#0d1117] border border-[#21262d] text-slate-400 hover:text-slate-200'
                    }`}
                    style={formData.orgType === type ? { backgroundColor: roleColor, border: `1px solid ${roleColor}` } : {}}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Role specific: NGO Registration Number */}
            {role === 'receiver' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Registration Number</label>
                <input 
                  type="text" 
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  className="w-full bg-[#0d1117] border border-[#21262d] focus:border-slate-400 px-4 py-2.5 rounded-xl text-white outline-none transition-colors"
                  placeholder="NGO registration / 80G number"
                />
              </div>
            )}

            {/* Common: Location */}
            <div className="grid gap-6">
              <div ref={cityRef} className="relative">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">City</label>
                <input 
                  type="text" 
                  value={citySearch}
                  onChange={handleCityChange}
                  onFocus={() => setShowCityDropdown(true)}
                  className="w-full bg-[#0d1117] border border-[#21262d] focus:border-slate-400 px-4 py-2.5 rounded-xl text-white outline-none transition-colors"
                  placeholder="e.g. Mumbai, Delhi"
                />
                {showCityDropdown && filteredCities.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-[#161b22] border border-[#21262d] rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {filteredCities.map(city => (
                      <div 
                        key={city} 
                        onClick={() => selectCity(city)}
                        className="px-4 py-2.5 hover:bg-[#21262d] cursor-pointer text-sm text-slate-200"
                      >
                        {city}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Address</label>
                <textarea 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-[#0d1117] border border-[#21262d] focus:border-slate-400 px-4 py-2.5 rounded-xl text-white outline-none transition-colors resize-none"
                  placeholder="Street address, block, area..."
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-[#0d1117] border border-[#21262d] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.latitude ? 'bg-[#1D9E75]/10 text-[#1D9E75]' : 'bg-slate-800 text-slate-500'}`}>
                    <FiMapPin size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-300">Coordinates</div>
                    <div className="text-[10px] text-slate-500">
                      {formData.latitude ? `${formData.latitude.toFixed(4)}, ${formData.longitude.toFixed(4)}` : 'Location not set'}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={detectLocation}
                  disabled={detecting}
                  className="flex items-center gap-2 px-3 py-2 bg-[#21262d] hover:bg-[#30363d] rounded-lg text-xs font-bold text-slate-300 transition-all border border-[#30363d]"
                >
                  <FiCrosshair className={detecting ? 'animate-spin' : ''} />
                  {detecting ? 'Detecting...' : formData.latitude ? 'Redetect' : 'Detect GPS'}
                </button>
              </div>
            </div>

            {/* Role specific additions */}
            {role === 'donor' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Operating Hours</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="time" 
                      name="operatingHoursStart"
                      value={formData.operatingHoursStart}
                      onChange={handleChange}
                      className="flex-1 bg-[#0d1117] border border-[#21262d] focus:border-slate-400 px-4 py-2.5 rounded-xl text-white outline-none transition-colors [color-scheme:dark]"
                    />
                    <span className="text-slate-500">—</span>
                    <input 
                      type="time" 
                      name="operatingHoursEnd"
                      value={formData.operatingHoursEnd}
                      onChange={handleChange}
                      className="flex-1 bg-[#0d1117] border border-[#21262d] focus:border-slate-400 px-4 py-2.5 rounded-xl text-white outline-none transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Why do you want to donate? <span className="text-slate-500 font-normal">(Optional)</span></label>
                  <textarea 
                    name="mission"
                    value={formData.mission}
                    onChange={handleChange}
                    rows={2}
                    className="w-full bg-[#0d1117] border border-[#21262d] focus:border-slate-400 px-4 py-2.5 rounded-xl text-white outline-none transition-colors resize-none"
                    placeholder="Tell NGOs about your mission..."
                  />
                </div>
              </>
            )}

            {role === 'receiver' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Area of Service (Delhi Zones)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {delhiZones.map(zone => (
                      <button
                        key={zone}
                        onClick={() => toggleServiceArea(zone)}
                        className={`py-2 rounded-lg text-sm transition-colors text-center ${
                          formData.serviceAreas.includes(zone)
                            ? 'bg-[#378ADD] text-white font-medium'
                            : 'bg-[#0d1117] border border-[#21262d] text-slate-400 hover:text-slate-200'
                        }`}
                        style={formData.serviceAreas.includes(zone) ? { border: '1px solid #378ADD' } : {}}
                      >
                        {zone}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Capacity</label>
                  <p className="text-xs text-slate-400 mb-2">How many people can you serve per day?</p>
                  <div className="flex items-center gap-4 bg-[#0d1117] border border-[#21262d] p-2 rounded-xl w-fit">
                    <button 
                      onClick={() => updateCapacity(-10)} 
                      className="w-8 h-8 rounded-lg bg-[#161b22] text-slate-300 hover:text-white hover:bg-[#21262d] flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <div className="w-16 text-center text-white font-medium">{formData.capacity}</div>
                    <button 
                      onClick={() => updateCapacity(10)} 
                      className="w-8 h-8 rounded-lg bg-[#161b22] text-slate-300 hover:text-white hover:bg-[#21262d] flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </>
            )}
            
          </div>

          <button 
            onClick={handleContinue}
            disabled={!isValid()}
            className={`w-full mt-8 font-semibold py-3.5 px-4 rounded-xl transition-all ${
              isValid() ? `${activeColorClass} text-white shadow-md hover:brightness-110` : 'bg-[#21262d] text-slate-500 cursor-not-allowed'
            }`}
          >
            Continue to verification
          </button>
        </div>
      </div>
    </div>
  );
}
