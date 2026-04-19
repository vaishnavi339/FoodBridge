export default function Stepper({ currentStep }) {
  const steps = [
    { num: 1, label: 'Account' },
    { num: 2, label: 'Profile' },
    { num: 3, label: 'Verify' },
    { num: 4, label: 'Done' }
  ];

  return (
    <div className="flex items-center justify-between mb-8 relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-[#21262d] -z-10" />
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#1D9E75] -z-10 transition-all duration-500" 
        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
      />
      
      {steps.map((step) => {
        const isCompleted = step.num < currentStep;
        const isActive = step.num === currentStep;
        
        return (
          <div key={step.num} className="flex flex-col items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mb-2 transition-colors ${
                isCompleted 
                  ? 'bg-[#1D9E75] text-white border-2 border-[#1D9E75]' 
                  : isActive 
                    ? 'bg-transparent border-2 border-[#1D9E75] text-[#1D9E75]' 
                    : 'bg-[#161b22] border-2 border-[#21262d] text-slate-500'
              }`}
            >
              {isCompleted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              ) : (
                step.num
              )}
            </div>
            <span className={`text-xs ${isActive ? 'text-white' : 'text-slate-500'}`}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
