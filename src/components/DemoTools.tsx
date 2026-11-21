import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SAMPLE_TICKETS, saveStoredTickets, STORAGE_KEY_EVENTS, STORAGE_KEY_TICKETS, notifyChange, logAuditEvent } from '../lib/storage';
import { Sparkles, RefreshCw, Trash2, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export const DEMO_SAMPLES = [
  {
    lang: 'Hindi',
    label: 'Hindi: Pothole',
    text: 'हमारी गली में बड़ा गड्ढा है, गाड़ियाँ फँस रही हैं',
  },
  {
    lang: 'Telugu',
    label: 'Telugu: Garbage',
    text: 'మా వీధిలో చెత్త రెండు రోజులుగా తీయలేదు, దుర్వాసన వస్తోంది',
  },
  {
    lang: 'Kannada',
    label: 'Kannada: Live Wire',
    text: 'ರಸ್ತೆಯಲ್ಲಿ ನೀರು ನಿಂತಿದ್ದು ವಿದ್ಯುತ್ ತಂತಿ ಕೆಳಗೆ ಬಿದ್ದಿದೆ',
  },
  {
    lang: 'Tamil',
    label: 'Tamil: Water Pipe',
    text: 'எங்கள் தெருவில் குடிநீர் குழாய் உடைந்து தண்ணீர் வீணாகிறது',
  },
  {
    lang: 'English',
    label: 'English: Wire in Puddle',
    text: 'There is a live electric wire hanging down into a puddle of rainwater on the main road.',
  },
];

export const DemoTools: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsVisible(params.get('demo') === '1');
  }, [location.search]);

  if (!isVisible) return null;

  const handleFillSample = (text: string) => {
    // If not on report page, navigate to report page with demo parameter
    if (!location.pathname.includes('/report') && location.pathname !== '/') {
      navigate('/report?demo=1');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('civiclens-fill-demo', { detail: { text } }));
      }, 200);
    } else {
      window.dispatchEvent(new CustomEvent('civiclens-fill-demo', { detail: { text } }));
    }
  };

  const handleLoadSampleData = () => {
    saveStoredTickets(SAMPLE_TICKETS);
    localStorage.removeItem(STORAGE_KEY_EVENTS);
    SAMPLE_TICKETS.forEach(t => {
      logAuditEvent({
        ticket_id: t.id,
        event_type: 'created',
        old_value: null,
        new_value: `Sample ticket loaded: ${t.category} (${t.severity})`,
        actor: 'System',
      });
    });
    notifyChange();
    alert('6 realistic sample tickets loaded into database.');
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all civic tickets and logs?')) {
      localStorage.removeItem(STORAGE_KEY_TICKETS);
      localStorage.removeItem(STORAGE_KEY_EVENTS);
      notifyChange();
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full sm:w-80 bg-white/95 backdrop-blur-md border border-slate-300 shadow-2xl rounded-2xl overflow-hidden transition-all text-xs font-sans">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-navy-800 text-white px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none hover:bg-navy-750 transition-colors"
      >
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Demo Tools (?demo=1)</span>
        </div>
        <button type="button" className="text-slate-300 hover:text-white">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-3 space-y-3 bg-white">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <FileText className="w-3 h-3 text-civic-600" />
              <span>Fill Complaint Samples</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_SAMPLES.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleFillSample(s.text)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-civic-500 hover:bg-civic-50 text-slate-700 font-medium transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{s.label}</span>
                  <span className="text-[10px] text-slate-400 group-hover:text-civic-600 font-mono">Fill &rarr;</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSampleData}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>Load Samples</span>
            </button>
            <button
              type="button"
              onClick={handleResetData}
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-colors"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
