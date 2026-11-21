import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  Map as MapIcon,
  Users,
  History,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  X,
  Building2,
  Zap,
  Droplets,
  Trash2,
  Trees,
  Construction,
  Shield,
  Eye,
  ArrowRight,
  TrendingUp,
  MapPin,
  Menu,
  Sliders,
  Send,
  Sparkles,
  ExternalLink,
  Lock,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import {
  getStoredTickets,
  saveStoredTickets,
  getStoredEvents,
  logAuditEvent,
  computePriorityScore,
  subscribeToChanges,
  initializeStorageIfNeeded,
  haversineDistanceMeters,
} from '../lib/storage';
import {
  Ticket,
  AuditEvent,
  CategoryKey,
  Severity,
  CATEGORY_DEPARTMENT_MAP,
  CATEGORY_DISPLAY_NAMES,
  TicketStatus
} from '../types';
import { Footer } from '../components/Footer';

export const DashboardPage: React.FC = () => {
  const location = useLocation();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'queue' | 'map' | 'review' | 'activity'>('queue');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [languageFilter, setLanguageFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');
  const [showSignInModal, setShowSignInModal] = useState(false);

  // Officer override form state
  const [overrideCategory, setOverrideCategory] = useState<CategoryKey>('roads');
  const [overrideSeverity, setOverrideSeverity] = useState<Severity>('Medium');
  const [overrideDepartment, setOverrideDepartment] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideFeedback, setOverrideFeedback] = useState<string | null>(null);

  // Map view selected pin
  const [mapSelectedTicketId, setMapSelectedTicketId] = useState<string | null>(null);

  // Initialize and load data
  const loadData = () => {
    initializeStorageIfNeeded();
    const loadedTickets = getStoredTickets();
    const loadedEvents = getStoredEvents();

    // Recompute priority scores on render so age keeps counting
    const updatedTickets = loadedTickets.map(t => {
      const priority_score = computePriorityScore(
        t.severity,
        t.report_count,
        t.created_at,
        t.hazard_flags
      );
      return { ...t, priority_score };
    });

    setTickets(updatedTickets);
    setEvents(loadedEvents);
    setLastUpdated('Just now');
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToChanges(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  // Update override fields when selected ticket changes
  useEffect(() => {
    if (selectedTicketId) {
      const target = tickets.find(t => t.id === selectedTicketId);
      if (target) {
        setOverrideCategory(target.category);
        setOverrideSeverity(target.severity);
        setOverrideDepartment(target.department);
        setOverrideReason('');
        setOverrideFeedback(null);
      }
    }
  }, [selectedTicketId, tickets]);

  // Derived: Parent tickets only for priority queue & dashboard table
  const rootTickets = useMemo(() => {
    return tickets.filter(t => t.parent_ticket_id === null);
  }, [tickets]);

  // Filtered tickets for Priority Queue
  const filteredQueueTickets = useMemo(() => {
    return rootTickets
      .filter(t => {
        if (departmentFilter !== 'All' && t.department !== departmentFilter) return false;
        if (severityFilter !== 'All' && t.severity !== severityFilter) return false;
        if (statusFilter !== 'All' && t.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesCode = t.tracking_code.toLowerCase().includes(q);
          const matchesSummary = t.summary.toLowerCase().includes(q);
          const matchesText = (t.translated_text || t.raw_text).toLowerCase().includes(q);
          if (!matchesCode && !matchesSummary && !matchesText) return false;
        }
        return true;
      })
      .sort((a, b) => b.priority_score - a.priority_score);
  }, [rootTickets, departmentFilter, severityFilter, statusFilter, searchQuery]);

  // Needs review tickets
  const needsReviewTickets = useMemo(() => {
    return rootTickets
      .filter(t => t.status === 'needs_review' || t.confidence < 0.4)
      .filter(t => {
        if (departmentFilter !== 'All' && t.department !== departmentFilter) return false;
        if (languageFilter !== 'All' && t.language !== languageFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            t.tracking_code.toLowerCase().includes(q) ||
            t.summary.toLowerCase().includes(q) ||
            t.raw_text.toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [rootTickets, departmentFilter, languageFilter, searchQuery]);

  // Counts for KPI Stat cards
  const openCount = rootTickets.filter(t => t.status !== 'resolved').length;
  const criticalCount = rootTickets.filter(t => t.severity === 'Critical' && t.status !== 'resolved').length;
  const reviewCount = rootTickets.filter(t => t.status === 'needs_review' || t.confidence < 0.4).length;

  // Selected ticket for detail panel
  const selectedTicket = useMemo(() => {
    return tickets.find(t => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  // Merged duplicate children for selected ticket
  const mergedChildren = useMemo(() => {
    if (!selectedTicket) return [];
    return tickets.filter(t => t.parent_ticket_id === selectedTicket.id);
  }, [tickets, selectedTicket]);

  // Selected ticket audit events
  const selectedTicketEvents = useMemo(() => {
    if (!selectedTicket) return [];
    return events.filter(e => e.ticket_id === selectedTicket.id);
  }, [events, selectedTicket]);

  // Handler: Category change in override controls
  const handleCategoryChange = (newCat: CategoryKey) => {
    setOverrideCategory(newCat);
    // If officer changes category, department is re-derived through the routing table unless set explicitly
    setOverrideDepartment(CATEGORY_DEPARTMENT_MAP[newCat] || 'General Administration');
  };

  // Handler: Save override
  const handleSaveOverride = () => {
    if (!selectedTicket) return;

    const all = getStoredTickets();
    const idx = all.findIndex(t => t.id === selectedTicket.id);
    if (idx === -1) return;

    const oldCat = all[idx].category;
    const oldSev = all[idx].severity;
    const oldDep = all[idx].department;

    const justification = overrideReason.trim() || 'Officer manual triage override';

    all[idx].category = overrideCategory;
    all[idx].severity = overrideSeverity;
    all[idx].department = overrideDepartment;
    all[idx].status = 'triaged';

    // Recalculate priority
    all[idx].priority_score = computePriorityScore(
      overrideSeverity,
      all[idx].report_count,
      all[idx].created_at,
      all[idx].hazard_flags
    );

    saveStoredTickets(all);

    logAuditEvent({
      ticket_id: selectedTicket.id,
      event_type: 'officer_override',
      old_value: `AI said ${oldCat} / ${oldSev} / ${oldDep}`,
      new_value: `Officer changed to ${overrideCategory} / ${overrideSeverity} / ${overrideDepartment}. Reason: ${justification}`,
      actor: 'Officer',
    });

    setOverrideFeedback('Override successfully applied and priority recomputed.');
    setTimeout(() => setOverrideFeedback(null), 3000);
  };

  // Handler: Mark resolved
  const handleMarkResolved = () => {
    if (!selectedTicket) return;

    const all = getStoredTickets();
    const idx = all.findIndex(t => t.id === selectedTicket.id);
    if (idx === -1) return;

    all[idx].status = 'resolved';
    saveStoredTickets(all);

    logAuditEvent({
      ticket_id: selectedTicket.id,
      event_type: 'resolved',
      old_value: 'status: triaged',
      new_value: 'Officer marked grievance as Resolved in field inspection',
      actor: 'Officer',
    });

    setOverrideFeedback('Ticket marked as Resolved.');
    setTimeout(() => {
      setOverrideFeedback(null);
      setSelectedTicketId(null);
    }, 1200);
  };

  const formatAge = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 60) return `${Math.max(1, mins)}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'roads': return <Construction className="w-4 h-4 text-amber-600" />;
      case 'waste': return <Trash2 className="w-4 h-4 text-emerald-600" />;
      case 'water': return <Droplets className="w-4 h-4 text-blue-600" />;
      case 'electricity': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'trees': return <Trees className="w-4 h-4 text-emerald-700" />;
      case 'drainage': return <Droplets className="w-4 h-4 text-indigo-600" />;
      default: return <Building2 className="w-4 h-4 text-slate-600" />;
    }
  };

  const renderSeverityChip = (severity: Severity) => {
    switch (severity) {
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-red-600 text-white shadow-xs">
            ▲ Critical
          </span>
        );
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#A34015] text-white shadow-xs">
            ↑ High
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#D97706] text-white shadow-xs">
            - Medium
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#15803D] text-white shadow-xs">
            ↓ Low
          </span>
        );
    }
  };

  const renderStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'triaged':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-civic-700 text-white">Triaged</span>;
      case 'needs_review':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">Needs Review</span>;
      case 'resolved':
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-600 text-white">Resolved</span>;
      case 'received':
      default:
        return <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-200 text-slate-700">Received</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col font-sans">
      {/* Top Karnataka State Tricolor Bar */}
      <div className="w-full h-1 flex">
        <div className="w-1/2 bg-gov-saffron"></div>
        <div className="w-1/2 bg-gov-green"></div>
      </div>

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">CivicLens</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              Officer Console - Government of Karnataka
            </div>
          </div>
        </div>

        {/* Officer Profile & Sign out */}
        <div className="flex items-center gap-3.5">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900 leading-tight">R. Venkataraman</div>
            <div className="text-[11px] text-slate-500">Electricity & Water</div>
          </div>

          <span className="hidden md:inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-civic-50 text-civic-700 border border-civic-200">
            Department officer
          </span>

          <button
            type="button"
            onClick={() => setShowSignInModal(true)}
            className="w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center hover:bg-navy-700 transition-colors shadow-xs"
          >
            <Users className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowSignInModal(true)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Layout: Sidebar + Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navy Sidebar */}
        <aside
          className={`bg-navy-800 text-slate-200 flex flex-col justify-between transition-all duration-200 z-20 shrink-0 ${
            sidebarCollapsed ? 'w-16' : 'w-56'
          }`}
        >
          <div className="p-3 space-y-1">
            {/* Priority Queue tab */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('queue');
                setSelectedTicketId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'queue' && !selectedTicketId
                  ? 'bg-navy-700 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-navy-750 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0 text-slate-200" />
              {!sidebarCollapsed && <span>Priority queue</span>}
            </button>

            {/* Map View tab */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('map');
                setSelectedTicketId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'map'
                  ? 'bg-navy-700 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-navy-750 hover:text-white'
              }`}
            >
              <MapIcon className="w-4 h-4 shrink-0 text-slate-200" />
              {!sidebarCollapsed && <span>Map view</span>}
            </button>

            {/* Needs Review tab */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('review');
                setSelectedTicketId(null);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'review'
                  ? 'bg-navy-700 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-navy-750 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 shrink-0 text-slate-200" />
                {!sidebarCollapsed && <span>Needs review</span>}
              </div>
              {!sidebarCollapsed && reviewCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {reviewCount}
                </span>
              )}
            </button>

            {/* Activity Log tab */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('activity');
                setSelectedTicketId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'activity'
                  ? 'bg-navy-700 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-navy-750 hover:text-white'
              }`}
            >
              <History className="w-4 h-4 shrink-0 text-slate-200" />
              {!sidebarCollapsed && <span>Activity log</span>}
            </button>
          </div>

          {/* Sidebar Collapse Toggle Button */}
          <div className="p-3 border-t border-navy-750">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-navy-750 transition-colors"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
              {!sidebarCollapsed && <span>Collapse rail</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: PRIORITY QUEUE TABLE or DETAIL VIEW */}
          {activeTab === 'queue' && (
            <>
              {selectedTicket ? (
                /* Ticket Detail Panel (screen (2).png) */
                <div className="space-y-5">
                  {/* Breadcrumb & Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <button
                          type="button"
                          onClick={() => setSelectedTicketId(null)}
                          className="hover:text-civic-700 font-medium"
                        >
                          Priority queue
                        </button>
                        <span>&gt;</span>
                        <span className="font-mono font-bold text-slate-800">{selectedTicket.tracking_code}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                          {selectedTicket.tracking_code}: {selectedTicket.summary}
                        </h1>
                        {renderSeverityChip(selectedTicket.severity)}
                        {renderStatusBadge(selectedTicket.status)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reported Today, {new Date(selectedTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {overrideFeedback && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{overrideFeedback}</span>
                    </div>
                  )}

                  {/* Two-Column Grid: Evidence & Actions */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column (8 cols): Photo, Text, Merged, Audit */}
                    <div className="lg:col-span-7 space-y-5">
                      {/* Citizen photo card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">Citizen photo</span>
                          <span className="text-slate-400 font-medium">Evidence #1</span>
                        </div>

                        <div className="rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-video flex items-center justify-center relative">
                          {selectedTicket.photo_data_url ? (
                            <img
                              src={selectedTicket.photo_data_url}
                              alt="Citizen Evidence"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-6 text-slate-400">
                              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                              <span className="text-xs font-medium">No photo attached by citizen</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-1">
                          <div className="flex items-center gap-1.5 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-civic-600" />
                            <span>Ward 14 — Gandhi Chowk Bus Stop</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>14 May 2025, 09:58 AM</span>
                          </div>
                        </div>
                      </div>

                      {/* Original vs Translated Text Card */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">
                              Original text ({selectedTicket.language})
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-civic-100 text-civic-800">
                              {selectedTicket.language.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed min-h-[60px]">
                            {selectedTicket.raw_text}
                          </p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">Translated text (English)</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-civic-100 text-civic-800">
                              EN
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed min-h-[60px]">
                            {selectedTicket.translated_text || selectedTicket.raw_text}
                          </p>
                        </div>
                      </div>

                      {/* Similar tickets card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-civic-600" />
                            <span className="text-xs font-bold text-slate-900">Similar tickets</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            {selectedTicket.report_count > 1 ? `${selectedTicket.report_count} Merged` : '0 Merged'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500">
                          {selectedTicket.report_count > 1
                            ? `${selectedTicket.report_count} reports within 150 m. Merged into this ticket. Raises priority.`
                            : 'No nearby duplicate complaints detected within 150m or 24h.'}
                        </p>

                        {selectedTicket.report_count > 1 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {mergedChildren.length > 0 ? (
                              mergedChildren.map((child, cIdx) => (
                                <div
                                  key={child.id}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono flex items-center gap-2"
                                >
                                  <span className="font-bold text-civic-700">{child.tracking_code}</span>
                                  <span className="text-slate-400 font-sans text-[11px]">
                                    {45 * (cIdx + 1)} m
                                  </span>
                                </div>
                              ))
                            ) : (
                              /* Realistic fallback items when seeded */
                              [1, 2].map((num) => (
                                <div
                                  key={num}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono flex items-center gap-2"
                                >
                                  <span className="font-bold text-civic-700">CL-4828{num + 7}</span>
                                  <span className="text-slate-400 font-sans text-[11px]">{num * 45} m</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Audit trail card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-slate-500" />
                          <span className="text-xs font-bold text-slate-900">Audit trail</span>
                        </div>

                        <div className="space-y-2.5 pt-1">
                          {selectedTicketEvents.length > 0 ? (
                            selectedTicketEvents.map((evt) => (
                              <div key={evt.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                  <span className="font-semibold text-slate-800">
                                    ● {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {evt.actor}
                                  </span>
                                  <span className="font-mono text-[10px]">{evt.event_type}</span>
                                </div>
                                <div className="text-slate-800">{evt.new_value}</div>
                                {evt.old_value && (
                                  <div className="text-slate-400 text-[10px]">Previously: {evt.old_value}</div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                              ● 10:02 AI triaged as {selectedTicket.severity} ({Math.round(selectedTicket.confidence * 100)}% confidence)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column (5 cols): AI Assessment & Override Controls */}
                    <div className="lg:col-span-5 space-y-5">
                      {/* AI Assessment Card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-civic-600" />
                            <span className="text-xs font-bold text-slate-900">AI assessment</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">Model v3.2</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-[11px] text-slate-400 uppercase font-semibold">Category</div>
                            <div className="font-bold text-slate-900 mt-0.5 capitalize">
                              {CATEGORY_DISPLAY_NAMES[selectedTicket.category] || selectedTicket.category}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-slate-400 uppercase font-semibold">Department</div>
                            <div className="font-bold text-slate-900 mt-0.5 truncate">
                              {selectedTicket.department}
                            </div>
                          </div>
                        </div>

                        {/* Confidence Score Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">Confidence score</span>
                            <span className="font-bold text-civic-700">
                              {Math.round(selectedTicket.confidence * 100)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-civic-700 rounded-full"
                              style={{ width: `${Math.round(selectedTicket.confidence * 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {selectedTicket.severity_reason}
                        </p>

                        {/* Hazard Flags */}
                        {selectedTicket.hazard_flags && selectedTicket.hazard_flags.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {selectedTicket.hazard_flags.map((flag) => (
                              <span
                                key={flag}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-900 flex items-center gap-1.5"
                              >
                                {flag === 'live_wire' && <Zap className="w-3.5 h-3.5 text-amber-600" />}
                                {flag === 'standing_water' && <Droplets className="w-3.5 h-3.5 text-blue-600" />}
                                {flag.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Override and Assign Card */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Sliders className="w-4 h-4 text-civic-600" />
                          <span className="text-xs font-bold text-slate-900">Override and assign</span>
                        </div>

                        {/* Category Select */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Category</label>
                          <select
                            value={overrideCategory}
                            onChange={(e) => handleCategoryChange(e.target.value as CategoryKey)}
                            className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:border-civic-600 focus:ring-1 focus:ring-civic-600 outline-hidden"
                          >
                            <option value="roads">Roads (Roads Department)</option>
                            <option value="waste">Waste (Sanitation Department)</option>
                            <option value="water">Water (Water Board)</option>
                            <option value="electricity">Electricity (Electricity Department)</option>
                            <option value="trees">Trees (Parks and Trees Department)</option>
                            <option value="drainage">Drainage (Drainage Department)</option>
                            <option value="other">Other (General Administration)</option>
                          </select>
                        </div>

                        {/* Severity & Department */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Severity</label>
                            <select
                              value={overrideSeverity}
                              onChange={(e) => setOverrideSeverity(e.target.value as Severity)}
                              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:border-civic-600 focus:ring-1 focus:ring-civic-600 outline-hidden"
                            >
                              <option value="Critical">Critical</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Department</label>
                            <select
                              value={overrideDepartment}
                              onChange={(e) => setOverrideDepartment(e.target.value)}
                              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:border-civic-600 focus:ring-1 focus:ring-civic-600 outline-hidden"
                            >
                              <option value="Roads Department">Roads Department</option>
                              <option value="Sanitation Department">Sanitation Department</option>
                              <option value="Water Board">Water Board</option>
                              <option value="Electricity Department">Electricity Department</option>
                              <option value="Parks and Trees Department">Parks & Trees Department</option>
                              <option value="Drainage Department">Drainage Department</option>
                              <option value="General Administration">General Administration</option>
                            </select>
                          </div>
                        </div>

                        {/* Reason for change */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Reason for change</label>
                          <input
                            type="text"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="Enter justification if overriding AI assessment..."
                            className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 bg-white focus:border-civic-600 focus:ring-1 focus:ring-civic-600 outline-hidden"
                          />
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={handleSaveOverride}
                            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer text-center"
                          >
                            Save override
                          </button>

                          <button
                            type="button"
                            onClick={handleMarkResolved}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-navy-800 hover:bg-navy-900 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer text-center"
                          >
                            Mark resolved
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Priority Queue Table View (screen (1).png) */
                <div className="space-y-5">
                  {/* Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Priority queue</h1>
                      <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        LIVE
                      </span>
                      <span className="text-xs text-slate-400">Last updated: {lastUpdated}</span>
                    </div>

                    <button
                      type="button"
                      onClick={loadData}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Refresh queue</span>
                    </button>
                  </div>

                  {/* 4 Stat KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Open tickets */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Open tickets</span>
                        <div className="p-1 rounded bg-civic-50 text-civic-700">
                          <Layers className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-extrabold text-slate-900">{openCount}</span>
                        <span className="text-xs font-semibold text-slate-400">+12 today</span>
                      </div>
                      {/* Stylized Sparkline bar */}
                      <div className="w-full h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
                        <div className="w-3/4 h-full bg-civic-600 rounded-full"></div>
                      </div>
                    </div>

                    {/* Card 2: Critical */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Critical</span>
                        <div className="p-1 rounded bg-red-50 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-extrabold text-red-600">{criticalCount}</span>
                        <span className="text-xs font-semibold text-red-500">Immediate action</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full bg-red-600 rounded-full"
                          style={{ width: `${Math.min(100, criticalCount * 25)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Card 3: Needs review */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Needs review</span>
                        <div className="p-1 rounded bg-amber-50 text-amber-600">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-extrabold text-amber-600">{reviewCount}</span>
                        <span className="text-xs font-semibold text-amber-600">Awaiting triage</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, reviewCount * 20)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Card 4: Average age */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>Average age</span>
                        <div className="p-1 rounded bg-emerald-50 text-emerald-600">
                          <Clock className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-3xl font-extrabold text-slate-900">4h</span>
                        <span className="text-xs font-semibold text-emerald-600">-18m vs yesterday</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
                        <div className="w-2/5 h-full bg-emerald-600 rounded-full"></div>
                      </div>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
                    {/* Department Filter */}
                    <div className="flex-1 min-w-[160px]">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Department</label>
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white outline-hidden focus:border-civic-600"
                      >
                        <option value="All">All departments</option>
                        <option value="Electricity Department">Electricity</option>
                        <option value="Roads Department">Roads</option>
                        <option value="Water Board">Water</option>
                        <option value="Sanitation Department">Sanitation</option>
                        <option value="Drainage Department">Drainage</option>
                        <option value="Parks and Trees Department">Parks & Trees</option>
                        <option value="General Administration">General Admin</option>
                      </select>
                    </div>

                    {/* Severity Filter */}
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Severity</label>
                      <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white outline-hidden focus:border-civic-600"
                      >
                        <option value="All">All severities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white outline-hidden focus:border-civic-600"
                      >
                        <option value="All">All statuses</option>
                        <option value="received">Received</option>
                        <option value="triaged">Triaged</option>
                        <option value="needs_review">Needs Review</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>

                    {/* Search by tracking ID */}
                    <div className="flex-2 min-w-[220px]">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Search by tracking ID</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by tracking ID or keyword..."
                          className="w-full pl-9 pr-3 p-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 bg-white outline-hidden focus:border-civic-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Priority Queue Complaints Table */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                            <th className="py-3 px-4">Severity</th>
                            <th className="py-3 px-4">Issue</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Department</th>
                            <th className="py-3 px-4 text-center">Reports</th>
                            <th className="py-3 px-4">Age</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredQueueTickets.length > 0 ? (
                            filteredQueueTickets.map((t) => {
                              const isCritical = t.severity === 'Critical';
                              return (
                                <tr
                                  key={t.id}
                                  onClick={() => setSelectedTicketId(t.id)}
                                  className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                                    isCritical ? 'bg-red-50/40' : ''
                                  }`}
                                >
                                  {/* Severity */}
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    {renderSeverityChip(t.severity)}
                                  </td>

                                  {/* Issue */}
                                  <td className="py-3.5 px-4 min-w-[260px]">
                                    <div className="font-bold text-slate-900 line-clamp-1">{t.summary}</div>
                                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                      AI: {t.severity_reason} • <span className="font-mono text-slate-600 font-semibold">{t.tracking_code}</span>
                                    </div>
                                  </td>

                                  {/* Category */}
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        {getCategoryIcon(t.category)}
                                      </div>
                                      <span className="capitalize">{t.category}</span>
                                    </div>
                                  </td>

                                  {/* Department */}
                                  <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-700">
                                    {t.department}
                                  </td>

                                  {/* Reports count */}
                                  <td className="py-3.5 px-4 whitespace-nowrap text-center font-mono font-bold text-slate-800">
                                    ×{t.report_count}
                                  </td>

                                  {/* Age */}
                                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                                    {formatAge(t.created_at)}
                                  </td>

                                  {/* Status */}
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    {renderStatusBadge(t.status)}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-400">
                                <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <div className="text-sm font-semibold text-slate-700">No complaints matching filter</div>
                                <div className="text-xs text-slate-400 mt-1">Try clearing filters or search term</div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Table Footer / Pagination */}
                    <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                      <span>
                        Showing 1-{filteredQueueTickets.length} of {rootTickets.length} complaints
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          disabled
                        >
                          Previous
                        </button>
                        <span className="px-2.5 py-1 rounded-lg bg-navy-800 text-white font-bold">1</span>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          disabled
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: MAP VIEW (screen (3).png) */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Map view</h1>
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    ● LIVE
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-civic-600" />
                  <span>Bengaluru Urban Jurisdiction • {rootTickets.length} active incidents</span>
                </div>
              </div>

              {/* Map Filter Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-wrap items-center gap-3 text-xs">
                <div className="flex-1 min-w-[140px]">
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white outline-hidden"
                  >
                    <option value="All">All departments</option>
                    <option value="Electricity Department">Electricity</option>
                    <option value="Water Board">Water</option>
                    <option value="Roads Department">Roads</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[130px]">
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white outline-hidden"
                  >
                    <option value="All">All Severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[130px]">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white outline-hidden"
                  >
                    <option value="All">All Statuses</option>
                    <option value="triaged">Triaged</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDepartmentFilter('All');
                    setSeverityFilter('All');
                    setStatusFilter('All');
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Interactive Visual Map Container */}
              <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-slate-300 shadow-inner bg-[#EBF0F5]">
                {/* Bengaluru map visual SVG representation */}
                <svg className="w-full h-full object-cover" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
                  {/* Base geographical roads and grid */}
                  <rect width="1000" height="600" fill="#E8EEF5" />
                  <path d="M 0 150 Q 300 200 500 120 T 1000 200" stroke="#CBD5E1" strokeWidth="8" fill="none" />
                  <path d="M 200 0 Q 350 300 450 600" stroke="#CBD5E1" strokeWidth="6" fill="none" />
                  <path d="M 100 500 Q 500 450 900 550" stroke="#CBD5E1" strokeWidth="5" fill="none" />
                  <path d="M 500 0 L 520 600" stroke="#E2E8F0" strokeWidth="4" fill="none" />
                  <path d="M 0 350 L 1000 320" stroke="#E2E8F0" strokeWidth="4" fill="none" />

                  {/* Parks & Water bodies */}
                  <ellipse cx="620" cy="180" rx="90" ry="50" fill="#D1E7DD" opacity="0.6" />
                  <text x="580" y="180" fill="#0F5132" fontSize="12" fontWeight="bold">Cubbon Park</text>

                  <ellipse cx="680" cy="380" rx="70" ry="40" fill="#D1E7DD" opacity="0.6" />
                  <text x="650" y="380" fill="#0F5132" fontSize="12" fontWeight="bold">Lalbagh</text>

                  <ellipse cx="250" cy="400" rx="60" ry="35" fill="#CFE2FF" opacity="0.5" />
                  <text x="220" y="405" fill="#084298" fontSize="11" fontWeight="bold">Ulsoor Lake</text>

                  {/* Major Area Labels */}
                  <text x="440" y="270" fill="#334155" fontSize="24" fontWeight="800" opacity="0.85">Bengaluru</text>
                  <text x="460" y="295" fill="#475569" fontSize="16" fontWeight="bold" opacity="0.7">ಬೆಂಗಳೂರು</text>

                  <text x="280" y="180" fill="#64748B" fontSize="12" fontWeight="600">RAJAJINAGAR</text>
                  <text x="750" y="200" fill="#64748B" fontSize="12" fontWeight="600">INDIRANAGAR</text>
                  <text x="720" y="460" fill="#64748B" fontSize="12" fontWeight="600">KORAMANGALA</text>
                  <text x="540" y="480" fill="#64748B" fontSize="12" fontWeight="600">JAYANAGAR</text>
                  <text x="240" y="320" fill="#64748B" fontSize="12" fontWeight="600">VIJAYANAGAR</text>
                </svg>

                {/* Map Control Buttons top-left */}
                <div className="absolute top-4 left-4 flex flex-col gap-1 bg-white border border-slate-300 rounded-xl shadow-md overflow-hidden">
                  <button type="button" className="p-2 hover:bg-slate-100 text-slate-700 font-bold text-xs">+</button>
                  <div className="h-px bg-slate-200"></div>
                  <button type="button" className="p-2 hover:bg-slate-100 text-slate-700 font-bold text-xs">-</button>
                </div>

                {/* Simulated Incident Pins on the Map */}
                {/* Pin 1: Critical (Live wire) */}
                <div
                  onClick={() => setMapSelectedTicketId('TKT-001')}
                  className="absolute top-[220px] left-[510px] transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-red-600 shadow-xl flex items-center justify-center text-white ring-4 ring-red-200 group-hover:scale-110 transition-transform">
                    <span className="font-bold text-xs">▲</span>
                  </div>
                </div>

                {/* Pin 2: High (Manhole) */}
                <div
                  onClick={() => setMapSelectedTicketId('TKT-002')}
                  className="absolute top-[340px] left-[635px] transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#A34015] shadow-lg flex items-center justify-center text-white ring-4 ring-orange-200 group-hover:scale-110 transition-transform">
                    <span className="font-bold text-xs">↑</span>
                  </div>
                </div>

                {/* Pin 3: Medium (Water leak) */}
                <div
                  onClick={() => setMapSelectedTicketId('TKT-003')}
                  className="absolute top-[170px] left-[610px] transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500 shadow-lg flex items-center justify-center text-white ring-4 ring-amber-200 group-hover:scale-110 transition-transform">
                    <span className="font-bold text-xs">-</span>
                  </div>
                </div>

                {/* Pin 4: Low (Streetlight) */}
                <div
                  onClick={() => setMapSelectedTicketId('TKT-006')}
                  className="absolute top-[420px] left-[570px] transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 shadow-lg flex items-center justify-center text-white ring-4 ring-emerald-200 group-hover:scale-110 transition-transform">
                    <span className="font-bold text-xs">↓</span>
                  </div>
                </div>

                {/* Cluster Pin 7 */}
                <div className="absolute top-[280px] left-[320px] transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-8 h-8 rounded-full bg-navy-800 text-white font-bold text-xs shadow-md flex items-center justify-center border-2 border-white">
                    7
                  </div>
                </div>

                {/* Cluster Pin 4 */}
                <div className="absolute top-[170px] left-[740px] transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-8 h-8 rounded-full bg-navy-800 text-white font-bold text-xs shadow-md flex items-center justify-center border-2 border-white">
                    4
                  </div>
                </div>

                {/* Bottom Left Severity Legend (matching screen (3).png) */}
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-2xl p-3 shadow-md text-xs space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">SEVERITY LEGEND</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-semibold text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">▲</span>
                      <span>Critical</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-[#A34015] text-white text-[10px] flex items-center justify-center font-bold">↑</span>
                      <span>High</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">-</span>
                      <span>Medium</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">↓</span>
                      <span>Low</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Incident Card on Pin Click (matching screen (3).png) */}
                {mapSelectedTicketId && (
                  <div className="absolute top-4 right-4 max-w-xs w-full bg-white border border-slate-300 rounded-2xl p-4 shadow-xl text-xs space-y-3 z-10 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-civic-700">CL-48291</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white">
                          ▲ Critical
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMapSelectedTicketId(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="font-extrabold text-sm text-slate-900 leading-tight">
                        Live wire hanging into puddle
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-civic-600" />
                        <span>12th Main, Indiranagar</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Department:</span>
                        <strong className="text-slate-900">Electricity</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>SLA Target:</span>
                        <strong className="text-red-600">30 mins remaining</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicketId('TKT-001');
                        setActiveTab('queue');
                      }}
                      className="w-full py-2.5 rounded-xl bg-navy-800 hover:bg-navy-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Open ticket</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NEEDS REVIEW (screen (4).png) */}
          {activeTab === 'review' && (
            <div className="space-y-5">
              {/* Breadcrumb & Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    TRIAGE QUEUE / Human-in-the-loop
                  </div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                    Needs review
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-xs text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Pending items</span>
                    <strong className="text-slate-900 font-extrabold text-sm">{needsReviewTickets.length} reports</strong>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-xs text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Avg. confidence</span>
                    <strong className="text-amber-600 font-extrabold text-sm">52.8%</strong>
                  </div>
                </div>
              </div>

              {/* Alert banner */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>The system was not confident about these reports. Please check and assign.</span>
              </div>

              {/* Filters toolbar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3 text-xs">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Department</label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white outline-hidden"
                  >
                    <option value="All">All departments</option>
                    <option value="Water Board">Water Supply</option>
                    <option value="Roads Department">Roads & Drains</option>
                    <option value="Electricity Department">Electricity</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Language</label>
                  <select
                    value={languageFilter}
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 bg-white outline-hidden"
                  >
                    <option value="All">All</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Tamil">Tamil</option>
                    <option value="English">English</option>
                  </select>
                </div>

                <div className="flex-2 min-w-[200px]">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Search by tracking ID</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. CL-2025-0841 or keyword..."
                      className="w-full pl-9 pr-3 p-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setDepartmentFilter('All');
                      setLanguageFilter('All');
                      setSearchQuery('');
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 font-semibold text-slate-600 text-xs"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Needs Review Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                        <th className="py-3 px-4">Issue summary</th>
                        <th className="py-3 px-4">Detected language</th>
                        <th className="py-3 px-4">Suggested category</th>
                        <th className="py-3 px-4">Confidence</th>
                        <th className="py-3 px-4">Why it needs review</th>
                        <th className="py-3 px-4">Age</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {needsReviewTickets.length > 0 ? (
                        needsReviewTickets.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Summary & Tracking */}
                            <td className="py-3 px-4 min-w-[200px]">
                              <div className="font-bold text-slate-900">{t.summary}</div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                ID: {t.tracking_code} • Ward 14
                              </div>
                            </td>

                            {/* Detected Language */}
                            <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                              {t.language}
                            </td>

                            {/* Suggested Category */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800 capitalize">{t.category}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-civic-100 text-civic-800">
                                  Suggestion
                                </span>
                              </div>
                            </td>

                            {/* Confidence bar */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700 w-8">
                                  {Math.round(t.confidence * 100)}%
                                </span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 rounded-full"
                                    style={{ width: `${Math.round(t.confidence * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>

                            {/* Why it needs review */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                                {t.confidence < 0.4 ? `Low confidence ${Math.round(t.confidence * 100)}%` : 'Ambiguous category'}
                              </span>
                            </td>

                            {/* Age */}
                            <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                              {formatAge(t.created_at)}
                            </td>

                            {/* Review Action */}
                            <td className="py-3 px-4 whitespace-nowrap text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTicketId(t.id);
                                  setActiveTab('queue');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-civic-50 hover:bg-civic-100 text-civic-700 font-bold border border-civic-200 transition-colors cursor-pointer"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                            <div className="text-sm font-semibold text-slate-700">All reports triaged</div>
                            <div className="text-xs text-slate-400 mt-1">No items currently requiring human officer review</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                  <span>Showing {needsReviewTickets.length} reports needing review</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Audit activity log</h1>
              <p className="text-xs text-slate-500">Immutable chronological record of AI triage and officer decisions.</p>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 text-xs">
                {events.length > 0 ? (
                  events.map((evt) => (
                    <div key={evt.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            evt.actor === 'AI'
                              ? 'bg-purple-100 text-purple-800'
                              : evt.actor === 'Officer'
                              ? 'bg-civic-100 text-civic-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {evt.actor}
                          </span>
                          <span className="font-mono font-bold text-slate-800">{evt.event_type}</span>
                          <span className="text-slate-400 font-mono text-[11px]">[{evt.ticket_id}]</span>
                        </div>
                        <div className="text-slate-800 font-medium">{evt.new_value}</div>
                        {evt.old_value && (
                          <div className="text-slate-400 text-[11px]">Previous state: {evt.old_value}</div>
                        )}
                      </div>
                      <span className="text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <span>No audit events recorded yet</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Officer Sign In Modal (Screen.png) */}
      {showSignInModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setShowSignInModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* GIGW Secure Portal Header */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-civic-700 uppercase tracking-widest">
                <Shield className="w-3.5 h-3.5" />
                <span>GIGW 3.0 SECURE PORTAL</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-2">Officer sign in</h2>
              <p className="text-xs text-slate-500 mt-0.5">For authorised department staff only</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowSignInModal(false);
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Official email</label>
                <input
                  type="email"
                  defaultValue="officer@civic.gov.in"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-civic-600 focus:ring-1 focus:ring-civic-600 text-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    defaultValue="password123"
                    className="w-full p-3 rounded-xl border border-slate-300 focus:border-civic-600 focus:ring-1 focus:ring-civic-600 text-slate-800 text-xs"
                  />
                  <Eye className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-navy-800 hover:bg-navy-900 text-white font-bold text-sm shadow-md transition-colors"
              >
                Sign in
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span className="hover:underline cursor-pointer">Forgot password?</span>
                <span className="font-medium text-slate-600">SSO Enabled</span>
              </div>

              <div className="relative flex items-center py-2">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-3 text-[10px] uppercase font-bold text-slate-400">OR</span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={() => setShowSignInModal(false)}
                className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span className="font-bold text-red-500">G</span>
                <span>Continue with Google</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Official Government Footer */}
      <Footer />
    </div>
  );
};
