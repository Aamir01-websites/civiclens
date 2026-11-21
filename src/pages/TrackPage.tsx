import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import {
  Search,
  Clock,
  MapPin,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Bell,
  Headphones,
  Shield,
  PlusCircle,
  Globe,
  User,
  Droplets,
  Zap,
  Trash2,
  Trees,
  Construction,
  Building2,
  Calendar,
  ChevronRight,
  Flame
} from 'lucide-react';
import { getStoredTickets, subscribeToChanges } from '../lib/storage';
import { Ticket, CATEGORY_DISPLAY_NAMES } from '../types';

export const TrackPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [inputCode, setInputCode] = useState(searchParams.get('code') || '');
  const [searchedCode, setSearchedCode] = useState(searchParams.get('code') || '');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [searched, setSearched] = useState(false);
  const [recentCodes, setRecentCodes] = useState<string[]>([]);
  const [alertSubscribed, setAlertSubscribed] = useState(false);

  useEffect(() => {
    // Load recent codes from local storage or defaults
    const all = getStoredTickets();
    if (all.length > 0) {
      const topCodes = all.slice(0, 3).map(t => t.tracking_code);
      setRecentCodes(topCodes);
    }

    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setInputCode(codeFromUrl);
      setSearchedCode(codeFromUrl);
      findTicket(codeFromUrl);
    }
  }, []);

  const findTicket = (codeToFind: string) => {
    setSearched(true);
    const clean = codeToFind.trim().toUpperCase();
    if (!clean) {
      setTicket(null);
      return;
    }
    const all = getStoredTickets();
    const found = all.find(t => t.tracking_code.toUpperCase() === clean);
    setTicket(found || null);
  };

  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => {
      if (searchedCode) {
        findTicket(searchedCode);
      }
    });
    return () => unsubscribe();
  }, [searchedCode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setSearchedCode(inputCode.trim());
    setSearchParams({ code: inputCode.trim() });
    findTicket(inputCode.trim());
  };

  const handleSelectRecent = (code: string) => {
    setInputCode(code);
    setSearchedCode(code);
    setSearchParams({ code });
    findTicket(code);
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
            Critical Severity
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-600 text-white shadow-xs">
            ▲ High Severity
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
            ● Medium Severity
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
            ● Low Severity
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-md mx-auto relative border-x border-slate-200/80 shadow-sm">
      {/* Citizen Top App Header */}
      <header className="bg-white border-b border-slate-200/80 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">CivicLens</div>
          <div className="text-[11px] font-medium text-slate-500 mt-1">Track Status</div>
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
      <main className="p-4 flex-1 space-y-4 pb-24">
        {/* Title & Subtitle */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Track your report
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Enter your reference number to view live municipal updates.
          </p>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSearch} className="space-y-2">
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-slate-400 font-mono font-bold text-sm">#</span>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="CL-48291"
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-300 focus:border-civic-600 focus:ring-2 focus:ring-civic-100 text-sm font-mono font-bold tracking-wider text-slate-800 placeholder-slate-400 outline-hidden bg-white shadow-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-civic-700 hover:bg-civic-800 active:bg-civic-900 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Check status</span>
          </button>
        </form>

        {/* Recent Codes */}
        {recentCodes.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto pb-1">
            <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="shrink-0 font-medium">Recent:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {recentCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSelectRecent(code)}
                  className="px-2 py-0.5 rounded-md bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-mono text-[11px] font-semibold transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Result Container */}
        {searched && !ticket && (
          <div className="p-6 bg-white border border-slate-200 rounded-2xl text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No report found</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              We couldn't find any complaint matching tracking code <strong className="font-mono text-slate-800">{searchedCode}</strong>. Please check your reference ID or submit a new report.
            </p>
            <Link
              to={`/report${location.search}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-civic-700 hover:underline pt-1"
            >
              <span>Submit a complaint instead</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {ticket && (
          <div className="space-y-3.5">
            {/* Header Ticket Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-civic-700">
                  Reference ID #{ticket.tracking_code}
                </span>
                {getSeverityBadge(ticket.severity)}
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-civic-50 flex items-center justify-center shrink-0 border border-civic-100">
                  {getCategoryIcon(ticket.category)}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 capitalize">
                    {ticket.summary || CATEGORY_DISPLAY_NAMES[ticket.category] || ticket.category}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {ticket.department}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-civic-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900 block text-[11px]">Incident Spot</span>
                    <span>Ward 14, Main Road, Bengaluru</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-slate-600 pt-1 border-t border-slate-200/60">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900 block text-[11px]">Submission Log</span>
                    <span>{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(ticket.created_at).toLocaleDateString()})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Others Reported This Too (Duplicate callout) */}
            {ticket.report_count > 1 && (
              <div className="p-3.5 rounded-2xl bg-civic-50 border border-civic-200 text-civic-900 space-y-1 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-xs text-civic-800">
                  <Megaphone className="w-4 h-4 text-civic-600 shrink-0" />
                  <span>Others reported this too</span>
                </div>
                <p className="text-xs text-civic-700 leading-snug">
                  <strong>{ticket.report_count} verified reports</strong> from your neighborhood. This automatically raised municipal priority to High response schedule.
                </p>
              </div>
            )}

            {/* Resolution Progress Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">Resolution Progress</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-civic-100 text-civic-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-civic-600 animate-pulse"></span>
                  {ticket.status === 'resolved' ? 'Completed' : 'In Action'}
                </span>
              </div>

              {/* Steps */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {/* Step 1: Received */}
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-4 ring-white">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-slate-900">Received</strong>
                      <span className="text-[11px] text-slate-400">10:24 AM</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Report logged via Citizen Web Portal</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Ticket Generated
                    </span>
                  </div>
                </div>

                {/* Step 2: Triaged */}
                <div className="relative">
                  <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                    ticket.status !== 'received'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-slate-900">Triaged</strong>
                      <span className="text-[11px] text-slate-400">
                        {ticket.status !== 'received' ? '10:45 AM' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Categorized by CivicLens AI & verified by Ward Triage Desk
                    </p>
                  </div>
                </div>

                {/* Step 3: Assigned */}
                <div className="relative">
                  <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                    ticket.status === 'resolved' || ticket.status === 'triaged'
                      ? 'bg-civic-700 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-civic-50/70 border border-civic-100">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-civic-900">Assigned</strong>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                        In Field
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Dispatched to Field Crew #4 (Officer: R. Sharma).
                    </p>
                    <div className="mt-1.5 pt-1.5 border-t border-civic-100 flex items-center gap-1.5 text-[10px] text-civic-800 font-medium">
                      <Calendar className="w-3 h-3 text-civic-600" />
                      <span>Inspection scheduled for 2:30 PM today</span>
                    </div>
                  </div>
                </div>

                {/* Step 4: Resolved */}
                <div className="relative">
                  <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                    ticket.status === 'resolved'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <strong className={ticket.status === 'resolved' ? 'text-emerald-700' : 'text-slate-500'}>
                        Resolved
                      </strong>
                      <span className="text-[11px] text-slate-400">
                        {ticket.status === 'resolved' ? 'Completed' : 'Expected ~4:30 PM'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {ticket.status === 'resolved'
                        ? 'Issue verified and closed by municipal field inspector.'
                        : 'Pending completion & field verification photo.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts & Contact Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setAlertSubscribed(!alertSubscribed)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  alertSubscribed
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-civic-50 hover:bg-civic-100 border-civic-200 text-civic-700'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{alertSubscribed ? '✓ SMS / WhatsApp Alerts Active' : 'Get SMS / WhatsApp alerts'}</span>
              </button>

              <button
                type="button"
                onClick={() => alert('Ward 14 Engineering Control Room Hotline: 080-2266-0000 (Toll Free)')}
                className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Headphones className="w-3.5 h-3.5 text-slate-500" />
                <span>Need help? Contact Ward Desk</span>
              </button>
            </div>

            {/* Public Records Note */}
            <div className="p-2.5 rounded-xl bg-slate-100 text-[11px] text-slate-600 flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>Public records are refreshed every <strong>10 minutes</strong>. No personal citizen data is displayed publicly.</span>
            </div>
          </div>
        )}

        {/* Anonymous footer badge */}
        <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-500 text-[11px] text-center flex items-center justify-center gap-1.5 mt-4">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>No account needed. Straight to the right department.</span>
        </div>
      </main>

      {/* Citizen Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 px-6 py-2.5 flex items-center justify-around z-40 shadow-lg">
        <Link
          to={`/report${location.search}`}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 text-xs transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Report</span>
        </Link>
        <Link
          to={`/track${location.search}`}
          className="flex flex-col items-center gap-1 text-civic-700 font-semibold text-xs"
        >
          <Search className="w-5 h-5" />
          <span>Track</span>
        </Link>
      </nav>
    </div>
  );
};
