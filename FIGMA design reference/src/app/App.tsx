import { useState } from 'react';
import { Shield, TrendingUp, Target, AlertCircle, ChevronRight, Activity, Zap, Users, Lock, Clock, Moon, Sun } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('risk-map');
  const [activeSession, setActiveSession] = useState('the-vault');
  const [isDark, setIsDark] = useState(false);

  const sessions = [
    { id: 'the-vault', name: 'The Vault', icon: Lock },
    { id: 'war-room', name: 'The War Room', icon: Activity },
    { id: 'hot-seat', name: 'The Hot Seat', icon: Zap },
  ];

  const stats = [
    { label: 'Vulnerabilities', value: '0', status: 'Mapped', icon: Shield, statusColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Buyer Personas', value: '5', status: 'Panel Ready', icon: Users, statusColor: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'Attack Zones', value: '4', status: 'Identified', icon: Target, statusColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'Analysis Status', value: '', status: 'Process to Q&A', icon: TrendingUp, statusColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  const vulnerabilities = [
    {
      id: 1,
      title: 'Customer Concentration — Single Client at 35% ARR',
      severity: 'critical',
      field: 'Deal',
      issue: 'One healthcare conglomerate represents ~$1.3MM ARR — 35% of total revenue — with renewal due Q3 2027.',
      impact: 'A single non-renewal event post-close destroys the equity story and potentially triggers covenant breaches if the deal is leveraged.',
    },
    {
      id: 2,
      title: 'Founder Dependency — Key Relationships',
      severity: 'high',
      field: 'Deal',
      issue: "How a buyer frames it: This isn't a SaaS business in a diversified revenue base — it's a concentrated services relationship dressed in SaaS clothing.",
      impact: "The multiple compresses immediately; buyers apply a haircut to ARR and model a downside scenario around that client's exit.",
    },
    {
      id: 3,
      title: 'Integration Complexity',
      severity: 'medium',
      field: 'Operations',
      issue: 'Must validate contract terms, integration depth, switching cost narrative, and renewal relationship status fully researched.',
      impact: 'Preparation Priority #1 — Must validate contract terms, integration depth, switching cost narrative, and renewal relationships status fully researched.',
    },
  ];

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className={`size-full flex ${
      isDark
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100'
        : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 text-foreground'
    }`}>
      <aside className={`w-64 backdrop-blur-xl border-r flex flex-col shadow-sm ${
        isDark
          ? 'bg-slate-900/80 border-slate-700/60'
          : 'bg-white/80 border-slate-200/60'
      }`}>
        <div className={`p-6 border-b ${isDark ? 'border-slate-700/60' : 'border-slate-200/60'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative size-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 to-transparent"></div>
                <Shield className="size-5 text-white relative z-10" />
              </div>
              <h1 className={`text-lg bg-gradient-to-br bg-clip-text text-transparent ${
                isDark ? 'from-slate-100 to-slate-300' : 'from-slate-900 to-slate-700'
              }`}>Dealbeady</h1>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-lg transition-all ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex-1 p-4">
          <div className={`text-xs mb-3 px-2 tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ALL SESSIONS</div>
          <div className="space-y-1.5">
            {sessions.map((session) => {
              const Icon = session.icon;
              const isActive = activeSession === session.id;
              return (
                <button
                  key={session.id}
                  onClick={() => setActiveSession(session.id)}
                  className={`group w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : isDark
                        ? 'text-slate-300 hover:bg-slate-800/80'
                        : 'text-slate-600 hover:bg-slate-100/80'
                  }`}
                >
                  <div className={`relative size-7 rounded-lg flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-white/20 shadow-inner'
                      : isDark
                        ? 'bg-slate-800 group-hover:bg-slate-700'
                        : 'bg-slate-100 group-hover:bg-slate-200'
                  }`}>
                    {isActive && <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/30 to-transparent"></div>}
                    <Icon className="size-4 flex-shrink-0 relative z-10" />
                  </div>
                  <span className="flex-1 text-left">{session.name}</span>
                  {isActive && (
                    <div className="size-2 rounded-full bg-white shadow-sm"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`p-4 border-t ${isDark ? 'border-slate-700/60' : 'border-slate-200/60'}`}>
          <div className={`relative px-3 py-3 rounded-xl border shadow-sm overflow-hidden ${
            isDark
              ? 'bg-gradient-to-br from-blue-950/50 to-indigo-950/50 border-blue-800/60'
              : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60'
          }`}>
            <div className={`absolute inset-0 bg-gradient-to-br to-transparent ${
              isDark ? 'from-blue-400/10' : 'from-white/60'
            }`}></div>
            <div className="relative z-10">
              <div className={`flex items-center gap-2 text-xs mb-1 ${
                isDark ? 'text-blue-400' : 'text-blue-600'
              }`}>
                <Clock className="size-3.5" />
                <span className="font-medium">Active Analysis</span>
              </div>
              <div className={`text-sm ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Part 1: PRE-INTERVIEW</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8 space-y-6">
          <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <span className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark ? 'hover:text-slate-200' : 'hover:text-slate-900'
            }`}>
              <Shield className="size-4" />
              Part (GE) 1
            </span>
            <ChevronRight className="size-4" />
            <span className={isDark ? 'text-slate-100' : 'text-slate-900'}>PRE-INTERVIEW</span>
          </div>

          <div>
            <div className="relative inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs shadow-lg shadow-blue-500/25 mb-4 overflow-hidden">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent"></div>
              <span className="relative z-10 font-medium tracking-wide">PRE-INTERVIEW</span>
            </div>
            <h2 className={`text-4xl mb-2 bg-gradient-to-br bg-clip-text text-transparent ${
              isDark ? 'from-slate-100 via-slate-200 to-slate-300' : 'from-slate-900 via-slate-800 to-slate-700'
            }`}>Analysis</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Part 1 reviews the buyer context. Part 2 generates the full risk map and attack zones.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-5">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`group relative rounded-2xl border p-6 shadow-sm transition-all duration-300 overflow-hidden ${
                  isDark
                    ? 'bg-slate-800/50 border-slate-700/60 hover:shadow-xl hover:shadow-blue-500/10'
                    : 'bg-white border-slate-200/60 hover:shadow-xl hover:shadow-slate-200/50'
                }`}>
                  <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity ${
                    isDark
                      ? 'from-slate-700/50 via-slate-800/50 to-slate-900/50'
                      : 'from-white via-slate-50/50 to-white'
                  }`}></div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`relative size-10 rounded-xl bg-gradient-to-br flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${
                        isDark
                          ? 'from-slate-700 to-slate-800'
                          : 'from-slate-100 to-slate-200'
                      }`}>
                        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br to-transparent ${
                          isDark ? 'from-slate-600/40' : 'from-white/60'
                        }`}></div>
                        <Icon className={`size-5 relative z-10 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
                      </div>
                    </div>
                    {stat.value && <div className={`text-3xl mb-1.5 bg-gradient-to-br bg-clip-text text-transparent ${
                      isDark ? 'from-slate-100 to-slate-300' : 'from-slate-900 to-slate-700'
                    }`}>{stat.value}</div>}
                    <div className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{stat.label}</div>
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs border shadow-sm ${stat.statusColor}`}>
                      {stat.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex gap-6">
              {[
                { id: 'risk-map', label: 'Risk Map' },
                { id: 'buyer-personas', label: 'Buyer Personas' },
                { id: 'positioning', label: 'Positioning' },
                { id: 'attack-zones', label: 'Attack Zones' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-1 py-3 text-sm border-b-2 transition-all ${
                    activeTab === tab.id
                      ? isDark
                        ? 'border-blue-500 text-slate-100'
                        : 'border-blue-600 text-slate-900'
                      : isDark
                        ? 'border-transparent text-slate-400 hover:text-slate-200'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {activeTab === tab.id && (
                    <div className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 shadow-sm"></div>
                  )}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`relative rounded-2xl border shadow-lg overflow-hidden ${
            isDark
              ? 'bg-slate-800/50 border-slate-700/60'
              : 'bg-white border-slate-200/60'
          }`}>
            <div className={`absolute inset-0 bg-gradient-to-br opacity-50 ${
              isDark
                ? 'from-slate-700 via-slate-800 to-slate-900'
                : 'from-slate-50 via-white to-slate-50'
            }`}></div>
            <div className={`relative bg-gradient-to-r border-b px-6 py-4 ${
              isDark
                ? 'from-slate-800 to-slate-900/50 border-slate-700/60'
                : 'from-slate-50 to-blue-50/30 border-slate-200/60'
            }`}>
              <div className={`text-xs mb-1 tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SHOWING RAW ANALYSIS — STRUCTURED VIEW COMING SOON</div>
              <h3 className={`text-lg bg-gradient-to-br bg-clip-text text-transparent ${
                isDark ? 'from-slate-100 to-slate-300' : 'from-slate-900 to-slate-700'
              }`}>A. BUYER RISK MAP — Top 13 Vulnerabilities</h3>
            </div>

            <div className="relative p-6">
              <div className="space-y-4">
                {vulnerabilities.map((vuln) => (
                  <div
                    key={vuln.id}
                    className={`relative rounded-xl border p-5 shadow-sm hover:shadow-md transition-all overflow-hidden ${
                      isDark
                        ? vuln.severity === 'critical' ? 'bg-red-950/20 border-red-900/40' :
                          vuln.severity === 'high' ? 'bg-orange-950/20 border-orange-900/40' :
                          'bg-yellow-950/20 border-yellow-900/40'
                        : getSeverityStyle(vuln.severity)
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br to-transparent ${
                      isDark ? 'from-white/5' : 'from-white/60'
                    }`}></div>
                    <div className="relative flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`relative size-9 rounded-lg flex items-center justify-center shadow-sm ${
                          isDark
                            ? vuln.severity === 'critical' ? 'bg-red-900/40' :
                              vuln.severity === 'high' ? 'bg-orange-900/40' :
                              'bg-yellow-900/40'
                            : vuln.severity === 'critical' ? 'bg-red-100' :
                              vuln.severity === 'high' ? 'bg-orange-100' :
                              'bg-yellow-100'
                        }`}>
                          <div className={`absolute inset-0 rounded-lg bg-gradient-to-br to-transparent ${
                            isDark ? 'from-white/10' : 'from-white/50'
                          }`}></div>
                          <AlertCircle className={`size-5 relative z-10 ${
                            vuln.severity === 'critical' ? isDark ? 'text-red-400' : 'text-red-600' :
                            vuln.severity === 'high' ? isDark ? 'text-orange-400' : 'text-orange-600' :
                            isDark ? 'text-yellow-400' : 'text-yellow-600'
                          }`} />
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <h4 className={`text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>VULNERABILITY {vuln.id}: {vuln.title}</h4>
                          <div className="flex gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs border whitespace-nowrap shadow-sm ${
                              isDark
                                ? vuln.severity === 'critical' ? 'bg-red-900/40 text-red-300 border-red-800/60' :
                                  vuln.severity === 'high' ? 'bg-orange-900/40 text-orange-300 border-orange-800/60' :
                                  'bg-yellow-900/40 text-yellow-300 border-yellow-800/60'
                                : getSeverityBadge(vuln.severity)
                            }`}>
                              {vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2.5 text-sm">
                          <p>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs border mr-2 shadow-sm ${
                              isDark
                                ? 'bg-blue-900/40 text-blue-300 border-blue-800/60'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                            }`}>
                              Field
                            </span>
                            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{vuln.field}</span>
                          </p>
                          <p>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs border mr-2 shadow-sm ${
                              isDark
                                ? 'bg-purple-900/40 text-purple-300 border-purple-800/60'
                                : 'bg-purple-100 text-purple-700 border-purple-200'
                            }`}>
                              Issue
                            </span>
                            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{vuln.issue}</span>
                          </p>
                          <p>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs border mr-2 shadow-sm ${
                              isDark
                                ? 'bg-pink-900/40 text-pink-300 border-pink-800/60'
                                : 'bg-pink-100 text-pink-700 border-pink-200'
                            }`}>
                              Why a buyer cares
                            </span>
                            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{vuln.impact}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}