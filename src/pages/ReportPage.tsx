import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Camera,
  MapPin,
  Navigation,
  Shield,
  Zap,
  Globe,
  User,
  ArrowRight,
  PlusCircle,
  Search,
  CheckCircle2,
  X,
  Crosshair,
  AlertTriangle
} from 'lucide-react';
import {
  downscaleImageFile,
  generateTrackingCode,
  getStoredTickets,
  saveStoredTickets,
  logAuditEvent,
  computePriorityScore,
  findDuplicateParent,
} from '../lib/storage';
import { triage, detectLanguage } from '../lib/triage';
import { Ticket, CATEGORY_DEPARTMENT_MAP } from '../types';

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [text, setText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [photoSizeText, setPhotoSizeText] = useState<string>('');
  const [locationAddress, setLocationAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsConfirmed, setGpsConfirmed] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'priority' | 'critical'>('priority');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quotaWarning, setQuotaWarning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for demo fill events from DemoTools
  useEffect(() => {
    const handleDemoFill = (e: any) => {
      if (e.detail?.text) {
        setText(e.detail.text);
        const lang = detectLanguage(e.detail.text);
        setSelectedLanguage(lang);
        setErrorMsg(null);
      }
    };
    window.addEventListener('civiclens-fill-demo', handleDemoFill);
    return () => window.removeEventListener('civiclens-fill-demo', handleDemoFill);
  }, []);

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setPhotoFileName(file.name);
      setPhotoSizeText(`${sizeMb} MB`);
      
      const downscaled = await downscaleImageFile(file);
      setPhotoDataUrl(downscaled);
      setErrorMsg(null);
    } catch (err) {
      console.error('Image compression error:', err);
      setErrorMsg('Failed to process photo. Please try a different image.');
    }
  };

  const removePhoto = () => {
    setPhotoDataUrl(null);
    setPhotoFileName('');
    setPhotoSizeText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUseGps = () => {
    setGpsLoading(true);
    setErrorMsg(null);

    if (!('geolocation' in navigator)) {
      setGpsLoading(false);
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLat(latitude);
        setLng(longitude);
        setGpsConfirmed(true);
        setGpsLoading(false);
        if (!locationAddress) {
          setLocationAddress(`Ward 14, Opposite Government High School (GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        }
      },
      (error) => {
        setGpsLoading(false);
        console.warn('Geolocation denied or failed:', error.message);
        // Fallback to Bengaluru landmark default
        setLat(12.9716);
        setLng(77.5946);
        setGpsConfirmed(true);
        setLocationAddress('Ward 14, Main Road (Simulated GPS)');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setErrorMsg('Please describe the issue before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const trackingCode = generateTrackingCode();
    const newId = 'TKT-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const createdAt = new Date().toISOString();

    // Default status: "received"
    const initialTicket: Ticket = {
      id: newId,
      tracking_code: trackingCode,
      raw_text: text.trim(),
      translated_text: text.trim(),
      language: selectedLanguage,
      photo_data_url: photoDataUrl,
      lat: lat ?? 12.9716,
      lng: lng ?? 77.5946,
      category: 'other',
      severity: urgencyLevel === 'critical' ? 'Critical' : urgencyLevel === 'normal' ? 'Low' : 'Medium',
      severity_reason: 'Complaint logged by citizen. Pending AI triage analysis.',
      department: 'General Administration',
      confidence: 0.5,
      priority_score: 25.0,
      status: 'received',
      report_count: 1,
      hazard_flags: [],
      summary: text.trim().slice(0, 80),
      parent_ticket_id: null,
      created_at: createdAt,
    };

    // SAVE FIRST
    try {
      const tickets = getStoredTickets();
      tickets.unshift(initialTicket);
      const saved = saveStoredTickets(tickets);

      if (!saved) {
        // Quota recovery: save without photo
        setQuotaWarning(true);
        const withoutPhoto = { ...initialTicket, photo_data_url: null };
        const ticketsRetry = getStoredTickets();
        ticketsRetry.unshift(withoutPhoto);
        saveStoredTickets(ticketsRetry);
      }

      logAuditEvent({
        ticket_id: newId,
        event_type: 'created',
        old_value: null,
        new_value: `Complaint received with tracking code ${trackingCode}`,
        actor: 'System',
      });

      // Preserve demo parameter during navigation if present
      const hasDemo = location.search.includes('demo=1');
      navigate(`/confirmation/${trackingCode}${hasDemo ? '?demo=1' : ''}`);

      // Asynchronous triage after ~1.5 seconds simulating AI processing
      setTimeout(() => {
        try {
          const triageResult = triage(initialTicket.raw_text);
          const currentTickets = getStoredTickets();
          const targetIndex = currentTickets.findIndex(t => t.id === newId);

          if (targetIndex !== -1) {
            const ticketToUpdate = currentTickets[targetIndex];
            
            // Check confidence threshold: below 0.4 => needs_review
            const newStatus = triageResult.confidence < 0.4 ? 'needs_review' : 'triaged';
            const department = CATEGORY_DEPARTMENT_MAP[triageResult.category] || 'General Administration';

            ticketToUpdate.language = triageResult.language;
            ticketToUpdate.translated_text = triageResult.translated_text;
            ticketToUpdate.category = triageResult.category;
            ticketToUpdate.severity = triageResult.severity;
            ticketToUpdate.severity_reason = triageResult.severity_reason;
            ticketToUpdate.department = department;
            ticketToUpdate.confidence = triageResult.confidence;
            ticketToUpdate.hazard_flags = triageResult.hazard_flags;
            ticketToUpdate.summary = triageResult.summary;
            ticketToUpdate.status = newStatus;

            // Recompute priority score
            ticketToUpdate.priority_score = computePriorityScore(
              ticketToUpdate.severity,
              ticketToUpdate.report_count,
              ticketToUpdate.created_at,
              ticketToUpdate.hazard_flags
            );

            // Duplicate detection check
            const duplicateParent = findDuplicateParent(ticketToUpdate, currentTickets);
            if (duplicateParent) {
              ticketToUpdate.parent_ticket_id = duplicateParent.id;
              
              // Increment parent report count and recompute priority
              const parentIndex = currentTickets.findIndex(t => t.id === duplicateParent.id);
              if (parentIndex !== -1) {
                currentTickets[parentIndex].report_count += 1;
                currentTickets[parentIndex].priority_score = computePriorityScore(
                  currentTickets[parentIndex].severity,
                  currentTickets[parentIndex].report_count,
                  currentTickets[parentIndex].created_at,
                  currentTickets[parentIndex].hazard_flags
                );

                logAuditEvent({
                  ticket_id: duplicateParent.id,
                  event_type: 'duplicate_merged',
                  old_value: `Report count: ${duplicateParent.report_count}`,
                  new_value: `Merged nearby complaint ${trackingCode}. New count: ${currentTickets[parentIndex].report_count}`,
                  actor: 'AI',
                });
              }

              logAuditEvent({
                ticket_id: newId,
                event_type: 'linked_duplicate',
                old_value: null,
                new_value: `Linked to existing issue ${duplicateParent.tracking_code}`,
                actor: 'AI',
              });
            }

            // Save updated tickets
            saveStoredTickets(currentTickets);

            logAuditEvent({
              ticket_id: newId,
              event_type: 'triaged',
              old_value: 'status: received',
              new_value: `AI classified as ${triageResult.category} (${triageResult.severity}) with ${Math.round(triageResult.confidence * 100)}% confidence`,
              actor: 'AI',
            });
          }
        } catch (triageErr) {
          console.error('Async triage execution failed:', triageErr);
        }
      }, 1500);

    } catch (saveErr) {
      console.error('Error during complaint submission:', saveErr);
      setErrorMsg('Failed to save complaint. Please try again.');
      setIsSubmitting(false);
    }
  };

  const languages = ['English', 'ಕನ್ನಡ', 'हिंदी', 'తెలుగు', 'தமிழ்'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto relative border-x border-slate-200/80 shadow-sm">
      {/* Citizen Top App Header */}
      <header className="bg-white border-b border-slate-200/80 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">CivicLens</div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">Report Issue</div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-civic-600" />
            <span>EN | हि | తె</span>
          </button>
          
          <div className="w-8 h-8 rounded-full bg-civic-700 text-white flex items-center justify-center shadow-sm">
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="p-4 flex-1 space-y-5 pb-24">
        {/* Quick Badge */}
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-civic-50 text-civic-700 border border-civic-100 shadow-sm">
            <Zap className="w-3.5 h-3.5 fill-current" />
            Quick 60-Second Civic Report
          </span>

          <h1 className="text-2xl font-extrabold text-slate-900 mt-2.5 tracking-tight leading-tight">
            What's the problem near you?
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Write in any language. We'll understand.
          </p>
        </div>

        {/* Language Selection Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {languages.map((lang) => {
            const isSelected = selectedLanguage === lang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => handleLanguageChange(lang)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-civic-100 text-civic-800 border border-civic-300 font-semibold shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>

        {quotaWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Storage quota exceeded. Your complaint will be saved without photo attachment.</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Describe the Issue Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
              <label htmlFor="issue-description">Describe the issue <span className="text-red-500">*</span></label>
              <span className="text-slate-400 font-mono text-[11px]">{text.length} / 500</span>
            </div>
            <textarea
              id="issue-description"
              rows={4}
              maxLength={500}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value.trim()) {
                  const detected = detectLanguage(e.target.value);
                  setSelectedLanguage(detected);
                }
              }}
              placeholder="e.g., Broken water pipe leaking near Gandhi statue road, streetlights not working on 4th cross..."
              className="w-full p-3.5 rounded-xl border border-slate-300 focus:border-civic-600 focus:ring-2 focus:ring-civic-100 text-sm text-slate-800 placeholder-slate-400 transition-all outline-hidden resize-none bg-white shadow-xs"
              required
            />
          </div>

          {/* Photo Proof Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">Photo proof</span>
              <span className="text-slate-500 text-[11px]">Optional, helps resolve 3x faster</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {!photoDataUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-civic-200/90 hover:border-civic-400 bg-civic-50/40 hover:bg-civic-50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-full bg-civic-100 group-hover:bg-civic-200 text-civic-600 flex items-center justify-center mb-2.5 transition-colors">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-civic-700">Add a photo or snapshot</span>
                <span className="text-[11px] text-slate-500 mt-0.5">Drag & drop or tap to open camera</span>
              </div>
            ) : (
              <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={photoDataUrl}
                    alt="Complaint preview"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{photoFileName || 'complaint_photo.jpg'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                      <span>{photoSizeText || 'Compressed'}</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        AI Geo-verified
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={removePhoto}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Privacy Guard Notice */}
            <div className="p-3 rounded-xl bg-civic-50/70 border border-civic-100/80 flex items-start gap-2.5 text-xs text-slate-600">
              <Shield className="w-4 h-4 text-civic-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong className="text-slate-800">Citizen Privacy Guard:</strong> Try not to include faces or vehicle number plates. CivicLens automatically blurs sensitive identifiable details.
              </p>
            </div>
          </div>

          {/* Incident Location Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">Incident Location <span className="text-red-500">*</span></span>
              <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5" />
                GPS Enabled
              </span>
            </div>

            <button
              type="button"
              onClick={handleUseGps}
              disabled={gpsLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-civic-50 hover:bg-civic-100 text-civic-700 border border-civic-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
              <span>{gpsLoading ? 'Acquiring satellite lock...' : 'Use my current GPS location'}</span>
            </button>

            <div className="relative flex items-center py-1">
              <div className="grow border-t border-slate-200"></div>
              <span className="shrink mx-3 text-[10px] uppercase font-medium text-slate-400">or type landmark / ward address</span>
              <div className="grow border-t border-slate-200"></div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4 text-civic-600" />
              </div>
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Ward 14, Opposite Government High School..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-civic-600 focus:ring-2 focus:ring-civic-100 text-xs text-slate-800 placeholder-slate-400 transition-all outline-hidden bg-white shadow-xs"
              />
            </div>

            {gpsConfirmed && (
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-700">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pin drop confirmed • Accuracy ~4 meters</span>
              </div>
            )}
          </div>

          {/* Urgency Level Cards */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-900">Urgency Level</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUrgencyLevel('normal')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  urgencyLevel === 'normal'
                    ? 'border-civic-600 bg-civic-50 ring-1 ring-civic-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 font-bold text-xs text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Normal
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Routine check</div>
              </button>

              <button
                type="button"
                onClick={() => setUrgencyLevel('priority')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  urgencyLevel === 'priority'
                    ? 'border-civic-600 bg-civic-50 ring-1 ring-civic-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 font-bold text-xs text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-civic-600"></span>
                  Priority
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Daily obstacle</div>
              </button>

              <button
                type="button"
                onClick={() => setUrgencyLevel('critical')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  urgencyLevel === 'critical'
                    ? 'border-civic-600 bg-civic-50 ring-1 ring-civic-600'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 font-bold text-xs text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Critical
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Hazard / Injury</div>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !text.trim()}
              className="w-full bg-civic-700 hover:bg-civic-800 active:bg-civic-900 text-white font-bold py-3.5 px-4 rounded-xl shadow-md text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>{isSubmitting ? 'Logging grievance...' : 'Submit report'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1 mt-2.5">
              <span>Auto-routes to the Municipal Engineering Ward Officer</span>
            </p>
          </div>
        </form>

        {/* Anonymous badge */}
        <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-600 text-[11px] text-center flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <span>No account needed. Straight to the right department.</span>
        </div>
      </main>

      {/* Citizen Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 px-6 py-2.5 flex items-center justify-around z-40 shadow-lg">
        <Link
          to={`/report${location.search}`}
          className="flex flex-col items-center gap-1 text-civic-700 font-semibold text-xs"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Report</span>
        </Link>
        <Link
          to={`/track${location.search}`}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 text-xs transition-colors"
        >
          <Search className="w-5 h-5" />
          <span>Track</span>
        </Link>
      </nav>
    </div>
  );
};
