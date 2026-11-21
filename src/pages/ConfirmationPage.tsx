import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Check,
  Copy,
  Share2,
  Lightbulb,
  Building2,
  Clock,
  Languages,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  TrendingUp,
  Shield,
  ArrowLeft,
  Globe,
  User,
  Loader2,
  AlertTriangle,
  Flame,
  Droplets,
  Zap,
  Trash2,
  Trees,
  Construction
} from 'lucide-react';
import { getStoredTickets, subscribeToChanges } from '../lib/storage';
import { Ticket, CATEGORY_DISPLAY_NAMES } from '../types';

export const ConfirmationPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTicket = () => {
    if (!code) return;
    const all = getStoredTickets();
    const found = all.find(t => t.tracking_code.toUpperCase() === code.toUpperCase());
    setTicket(found || null);
    setLoading(false);
  };

  useEffect(() => {
    fetchTicket();
    const unsubscribe = subscribeToChanges(() => {
      fetchTicket();
    });
    return () => unsubscribe();
  }, [code]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share && code) {
      navigator.share({
        title: 'CivicLens Complaint',
        text: `My civic complaint tracking code is ${code}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'roads': return <Construction className="w-5 h-5 text-amber-600" />;
      case 'waste': return <Trash2 className="w-5 h-5 text-emerald-600" />;
      case 'water': return <Droplets className="w-5 h-5 text-blue-600" />;
      case 'electricity': return <Zap className="w-5 h-5 text-amber-500" />;
      case 'trees': return <Trees className="w-5 h-5 text-emerald-700" />;
      case 'drainage': return <Droplets className="w-5 h-5 text-indigo-600" />;
      default: return <Building2 className="w-5 h-5 text-slate-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-xs">
            <Flame className="w-3.5 h-3.5" />
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-600 text-white shadow-xs">
            ▲ High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
            ● Medium
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
            ● Low
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-civic-600 animate-spin" />
          <span className="text-sm font-medium text-slate-600">Retrieving ticket details...</span>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Complaint Not Found</h2>
        <p className="text-sm text-slate-600 text-center mt-1 mb-6">
          No grievance record found with tracking code <span className="font-mono font-bold text-slate-800">{code}</span>.
        </p>
        <Link
          to={`/report${location.search}`}
          className="px-5 py-2.5 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          Submit a New Complaint
        </Link>
      </div>
    );
  }

  const isReceived = ticket.status === 'received';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto relative border-x border-slate-200/80 shadow-sm pb-10">
      {/* Citizen Top App Header */}
      <header className="bg-white border-b border-slate-200/80 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/report${location.search}`)}
            className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-sm font-bold text-slate-900 truncate max-w-[180px]">
            Report Confirmation
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium"
          >
            <Globe className="w-3.5 h-3.5 text-civic-600" />
            <span>EN | हि | తె</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-civic-700 text-white flex items-center justify-center shadow-sm">
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 flex-1 space-y-5">
        {/* Success Icon & Heading */}
        <div className="text-center pt-2">
          <div className="w-16 h-16 rounded-full bg-emerald-700 text-white flex items-center justify-center mx-auto shadow-md ring-8 ring-emerald-100">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-4 tracking-tight">
            Report received!
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
            Thank you for being an active citizen. We have logged your grievance.
          </p>
        </div>

        {/* Tracking ID Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-center space-y-3.5">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            YOUR TRACKING ID
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-wider">
            {ticket.tracking_code}
          </div>

          <div className="flex items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 py-2 px-3 rounded-xl bg-civic-50 hover:bg-civic-100 text-civic-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-civic-100"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy ID'}</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Share</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Save this ID to check progress anytime.</span>
          </div>
        </div>

        {/* AI Classification Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900">CivicLens AI Classification</span>
            {!isReceived && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-civic-50 text-civic-700 border border-civic-100">
                Confidence {Math.round(ticket.confidence * 100)}%
              </span>
            )}
          </div>

          {isReceived ? (
            /* Analyzing Complaint State */
            <div className="py-8 text-center space-y-3">
              <div className="relative w-12 h-12 mx-auto">
                <div className="w-12 h-12 rounded-full border-4 border-civic-100 border-t-civic-600 animate-spin"></div>
                <Zap className="w-5 h-5 text-civic-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Analysing your complaint...</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                CivicLens AI is identifying language, detecting hazard risks, and routing to the right municipal engineering desk.
              </p>
            </div>
          ) : (
            /* Analyzed / Triaged Details */
            <div className="space-y-4">
              {/* Detected Issue */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-civic-50 flex items-center justify-center shrink-0 border border-civic-100">
                    {getCategoryIcon(ticket.category)}
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">Detected Issue</div>
                    <div className="text-sm font-bold text-slate-900 capitalize">
                      {ticket.summary || CATEGORY_DISPLAY_NAMES[ticket.category] || ticket.category}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {ticket.severity_reason}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {getSeverityBadge(ticket.severity)}
                </div>
              </div>

              {/* Department */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Routed to Department</div>
                    <div className="text-xs font-bold text-slate-800">{ticket.department}</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-civic-100 text-civic-800">
                  Ward 14
                </span>
              </div>

              {/* Photo Proof thumbnail with GPS Tag */}
              {ticket.photo_data_url && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video max-h-40 bg-slate-100">
                  <img
                    src={ticket.photo_data_url}
                    alt="Complaint Evidence"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1.5 shadow-xs">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span>GPS & Timestamp Attached</span>
                  </div>
                </div>
              )}

              {/* Detected Language */}
              <div className="p-3 rounded-xl bg-civic-50/60 border border-civic-100 text-xs text-slate-700 flex items-start gap-2.5">
                <Languages className="w-4 h-4 text-civic-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">
                    Detected language: {ticket.language}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {ticket.language !== 'English'
                      ? `Translated: "${ticket.translated_text}"`
                      : 'Verified and queued for municipal field engineers.'}
                  </p>
                </div>
              </div>

              {/* Estimated Response */}
              <div className="flex items-center gap-2 text-xs text-slate-600 px-1">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Estimated initial response:{' '}
                  <strong className="text-slate-900 font-semibold">
                    {ticket.severity === 'Critical' ? 'within 2 hours' : 'within 24 hours'}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <Link
            to={`/track?code=${ticket.tracking_code}${location.search.includes('demo=1') ? '&demo=1' : ''}`}
            className="w-full py-3.5 px-4 rounded-xl bg-civic-700 hover:bg-civic-800 active:bg-civic-900 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Track this report</span>
          </Link>

          <Link
            to={`/report${location.search}`}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-slate-500" />
            <span>Report another problem</span>
          </Link>
        </div>

        {/* Anonymous footer badge */}
        <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-500 text-[11px] text-center flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Submitted anonymously. No personal login or KYC required.</span>
        </div>
      </main>
    </div>
  );
};
