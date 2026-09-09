import React, { useState } from 'react';
import {
  FileText,
  ShieldAlert,
  Clock,
  ExternalLink,
  Info,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Smartphone,
  Eye,
  AlertCircle
} from 'lucide-react';
import {
  REALISTIC_SCRIPTS_DATABASE,
  RealisticScriptModel,
  HotspotDetail
} from '../data/realisticScriptsData';
import { HotspotDetailModal } from './HotspotDetailModal';

export type ScriptType = 'pb82' | 'repeat_pb24' | 'handwritten' | 'escript' | 's8_nsw' | 'odt_racf';

export interface ScriptVisualizerPanelProps {
  language: 'fa' | 'en';
  onSelectScriptForDispense?: (scriptCode: string) => void;
  activeScriptType?: string;
  onSelectScriptType?: (type: string) => void;
}

export const ScriptVisualizerPanel: React.FC<ScriptVisualizerPanelProps> = ({
  language,
  onSelectScriptForDispense,
  activeScriptType,
  onSelectScriptType,
}) => {
  const isFa = language === 'fa';
  const initialActiveTab = REALISTIC_SCRIPTS_DATABASE.some((script) => script.tab_id === activeScriptType)
    ? (activeScriptType as ScriptType)
    : 'pb82';
  const [activeTab, setActiveTab] = useState<ScriptType>(initialActiveTab);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotDetail | null>(null);

  const currentScript: RealisticScriptModel =
    REALISTIC_SCRIPTS_DATABASE.find((s) => s.tab_id === activeTab) || REALISTIC_SCRIPTS_DATABASE[0];

  const getHotspotById = (id: string) => {
    return currentScript.hotspots.find((h) => h.id === id) || null;
  };

  const handleOpenHotspot = (id: string) => {
    const hs = getHotspotById(id);
    if (hs) setSelectedHotspot(hs);
  };

  return (
    <div id="script_visualizer_panel_root" className="space-y-4">
      {/* 1. Header & 6-Script Navigation Bar */}
      <div className="app-card border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b app-border pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <h2 className="font-extrabold text-base sm:text-lg app-text flex items-center gap-2">
                  {isFa ? 'شبیه‌ساز و بازرس بصری نسخه‌های استرالیا (۶ نوع نسخه)' : 'Australian 6-Prescription Realistic Inspector'}
                </h2>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {onSelectScriptForDispense && (
              <button
                onClick={() => onSelectScriptForDispense(currentScript.tab_id)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {isFa ? 'دیسپنس این نسخه در Fred' : 'Dispense in Fred'}
              </button>
            )}
          </div>
        </div>

        {/* 6 Tabs Grid Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {REALISTIC_SCRIPTS_DATABASE.map((item) => {
            const isActive = activeTab === item.tab_id;
            const badgeText = isFa
              ? item.badge
              : item.tab_id === 'pb82'
              ? 'Dual PBS'
              : item.tab_id === 'repeat_pb24'
              ? 'PB 24 Repeat'
              : item.tab_id === 'handwritten'
              ? 'Handwritten'
              : item.tab_id === 'escript'
              ? 'eScript Token'
              : item.tab_id === 's8_nsw'
              ? 'S8 Controlled'
              : 'ODT Chart';

            return (
              <button
                key={item.tab_id}
                id={`tab_script_${item.tab_id}`}
                onClick={() => {
                  setActiveTab(item.tab_id);
                  onSelectScriptType?.(item.tab_id);
                }}
                className={`p-2.5 rounded-xl border text-right sm:text-center transition flex flex-col justify-between gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                    : 'app-bg app-border app-muted hover:app-text hover:border-slate-400/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${item.badge_color}`}>
                    {badgeText}
                  </span>
                  {isActive && <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />}
                </div>
                <div className="font-bold text-xs line-clamp-2 leading-snug">
                  {isFa ? item.title_fa : item.title_en}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Visual Canvas + Quick Inspection Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: The Realistic Visual Script Canvas (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between text-xs px-1 text-slate-300">
            <span className="flex items-center gap-1.5 font-bold text-indigo-300">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isFa ? currentScript.title_fa : currentScript.title_en}</span>
            </span>
          </div>

          {/* SCRIPT 1: PB 82 Computerized Dual Prescription */}
          {activeTab === 'pb82' && (
            <div className="bg-slate-900/90 border border-slate-700 p-3 sm:p-4 rounded-2xl shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Original Part */}
                <div className="bg-[#fcfbf7] text-slate-900 border-2 border-teal-800/80 rounded-xl p-3.5 shadow-md flex flex-col justify-between space-y-2 text-[11px] font-mono select-none" dir="ltr">
                  <div className="border-b-2 border-teal-800 pb-1 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-teal-900">COMMONWEALTH OF AUSTRALIA</span>
                      <p className="text-[9px] text-slate-600">PBS / RPBS PRESCRIPTION (PB 82)</p>
                    </div>
                    <span className="bg-teal-800 text-white font-bold px-2 py-0.5 rounded text-[10px]">ORIGINAL</span>
                  </div>

                  {/* Hotspot 1: Prescriber */}
                  <div
                    onClick={() => handleOpenHotspot('pb82_prescriber')}
                    className="p-1.5 rounded-lg border border-dashed border-sky-600 bg-sky-50/70 hover:bg-sky-100 cursor-pointer transition relative group"
                  >
                    <span className="absolute top-1 right-1 text-[8px] font-bold bg-sky-600 text-white px-1 rounded opacity-75 group-hover:opacity-100">CLICK</span>
                    <p className="font-bold text-slate-900">Dr. Sarah Smith (MBBS, FRACGP)</p>
                    <p className="text-[10px] text-slate-700">Sydney Health Medical Clinic, 120 George St, Sydney NSW 2000</p>
                    <p className="text-[10px] font-bold text-sky-800">Phone: (02) 9876 5432 | Provider No: 2938471A</p>
                  </div>

                  {/* Hotspot 2: Date & Patient */}
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      onClick={() => handleOpenHotspot('pb82_date')}
                      className="p-1.5 rounded-lg border border-dashed border-amber-600 bg-amber-50/70 hover:bg-amber-100 cursor-pointer transition relative group"
                    >
                      <span className="text-[9px] text-slate-600 block">Date of Issue:</span>
                      <strong className="text-amber-900 text-xs">10/08/2026</strong>
                    </div>
                    <div
                      onClick={() => handleOpenHotspot('pb82_patient')}
                      className="p-1.5 rounded-lg border border-dashed border-teal-600 bg-teal-50/70 hover:bg-teal-100 cursor-pointer transition relative group"
                    >
                      <span className="text-[9px] text-slate-600 block">Medicare No:</span>
                      <strong className="text-teal-900 text-xs">2345 67890 1 - 1</strong>
                    </div>
                  </div>

                  {/* Hotspot 3: Patient Name & Address */}
                  <div
                    onClick={() => handleOpenHotspot('pb82_patient')}
                    className="p-1.5 rounded-lg border border-dashed border-teal-600 bg-teal-50/70 hover:bg-teal-100 cursor-pointer transition"
                  >
                    <p className="font-bold text-slate-900">David Miller</p>
                    <p className="text-[10px] text-slate-700">14 King St, Newtown NSW 2042 | DOB: 14/08/1982</p>
                  </div>

                  {/* Hotspot 4: Medication */}
                  <div
                    onClick={() => handleOpenHotspot('pb82_medication')}
                    className="p-2 rounded-lg border-2 border-dashed border-indigo-600 bg-indigo-50/70 hover:bg-indigo-100 cursor-pointer transition space-y-1 relative group"
                  >
                    <span className="absolute top-1 right-1 text-[8px] font-bold bg-indigo-600 text-white px-1 rounded opacity-75 group-hover:opacity-100">ITEM & PBS</span>
                    <p className="font-bold text-xs text-indigo-950">Rosuvastatin 10mg Tablet</p>
                    <p className="text-[10px] text-slate-800">Sig: Take ONE tablet at night. Qty: 30 | Repeats: 5</p>
                    <div className="flex items-center justify-between text-[9px] text-slate-700 pt-1 border-t border-indigo-200">
                      <span>PBS Code: <strong className="text-indigo-900">8214K</strong></span>
                      <span className="text-rose-700 font-bold">[ ] Brand Substitution NOT permitted</span>
                    </div>
                  </div>

                  {/* Hotspot 5: Signature */}
                  <div
                    onClick={() => handleOpenHotspot('pb82_signature')}
                    className="p-2 rounded-lg border border-dashed border-emerald-600 bg-emerald-50/70 hover:bg-emerald-100 cursor-pointer transition flex items-center justify-between relative group"
                  >
                    <div>
                      <span className="text-[9px] text-slate-600 block">Doctor Signature:</span>
                      <span className="font-serif italic text-sm font-bold text-blue-900">S. Smith, MD</span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      WET-INK VALID
                    </span>
                  </div>
                </div>

                {/* Duplicate Part */}
                <div className="bg-[#f7faf8] text-slate-700 border-2 border-dashed border-teal-600/60 rounded-xl p-3.5 shadow-md flex flex-col justify-between space-y-2 text-[11px] font-mono select-none opacity-90" dir="ltr">
                  <div className="border-b border-teal-700/50 pb-1 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-teal-800">MEDICARE DUPLICATE COPY</span>
                      <p className="text-[9px] text-slate-500">Not to be used alone for initial dispensing</p>
                    </div>
                    <span className="bg-teal-700/80 text-white font-bold px-2 py-0.5 rounded text-[10px]">DUPLICATE</span>
                  </div>
                  <div className="space-y-1 text-[10px] text-slate-600 p-2 rounded bg-white/60 border border-teal-200">
                    <p><strong>Patient:</strong> David Miller (DOB: 14/08/1982)</p>
                    <p><strong>Prescriber:</strong> Dr. Sarah Smith (2938471A)</p>
                    <p><strong>Item:</strong> Rosuvastatin 10mg Tab x 30 (5 Repeats)</p>
                  </div>
                  <div className="p-2 rounded bg-amber-100/70 border border-amber-300 text-[10px] text-amber-900 space-y-1">
                    <p className="font-bold">📎 Duplicate Handling Mandate:</p>
                    <p>If repeats exist, this Duplicate is NOT retained in the pharmacy; it is stapled to Yellow Form PB 24 and handed to the patient.</p>
                  </div>
                  <div className="text-[9px] text-slate-500 text-center border-t border-slate-300 pt-1">
                    PBS FORM PB 82 DUPLICATE RECONCILIATION
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCRIPT 2: Repeat Authorisation (Yellow PB 24 + Duplicate) */}
          {activeTab === 'repeat_pb24' && (
            <div className="bg-slate-900/90 border border-amber-500/50 p-3 sm:p-4 rounded-2xl shadow-2xl space-y-3">
              <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between text-xs text-amber-200">
                <span className="font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  {isFa ? 'بسته تکرار دو لایه (فرم زرد رسمی PB 24 منگنه شده به Duplicate Copy)' : '2-Layer Attached Repeat Authorisation (PB 24 + Medicare Duplicate)'}
                </span>
                <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black">
                  PB 24 YELLOW
                </span>
              </div>

              {/* Connected 2-Layer Visual Mockup */}
              <div className="relative pt-6">
                {/* Staple Pin Indicator */}
                <div
                  onClick={() => handleOpenHotspot('repeat_staple')}
                  className="absolute top-0 left-10 z-20 px-3 py-1 bg-slate-900 border-2 border-amber-400 rounded-full text-[10px] font-black text-amber-300 shadow-xl cursor-pointer hover:scale-105 transition flex items-center gap-1"
                >
                  <span className="text-base">📎</span>
                  <span>{isFa ? 'منگنه فیزیکی الزامی' : 'MANDATORY STAPLE'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3" dir="ltr">
                  {/* Left: Yellow PB 24 Repeat Form */}
                  <div className="bg-[#fff9db] text-slate-900 border-4 border-amber-500 rounded-xl p-4 shadow-xl space-y-2 text-[11px] font-mono select-none">
                    <div className="border-b-2 border-amber-600 pb-1 flex items-center justify-between">
                      <div>
                        <span className="font-black text-xs text-amber-950">REPEAT AUTHORISATION</span>
                        <p className="text-[9px] text-amber-800">FORM PB 24 - COMMONWEALTH OF AUSTRALIA</p>
                      </div>
                      <span className="bg-amber-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">REPEAT</span>
                    </div>

                    {/* Barcode Hotspot */}
                    <div
                      onClick={() => handleOpenHotspot('repeat_barcode')}
                      className="p-2 rounded-lg border-2 border-dashed border-amber-700 bg-amber-100/80 hover:bg-amber-200 cursor-pointer transition text-center space-y-1"
                    >
                      <div className="tracking-[4px] font-bold text-xs bg-white py-1 rounded border border-amber-400">
                        ||| | |||| || ||||| ||| ||||
                      </div>
                      <span className="text-[9px] font-bold text-amber-950">
                        *8214K-2938471A-004-98721*
                      </span>
                    </div>

                    {/* Repeats Remaining Hotspot */}
                    <div
                      onClick={() => handleOpenHotspot('repeat_counter')}
                      className="p-2 rounded-lg border-2 border-dashed border-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 cursor-pointer transition"
                    >
                      <p className="text-[10px] text-indigo-900 font-bold">REPEATS AUTHORISED: <strong className="text-sm text-indigo-950">4 OF 5 REMAINING</strong></p>
                      <p className="text-[9px] text-slate-700">Item: Rosuvastatin 10mg Tab x 30 | PBS Code: 8214K</p>
                    </div>

                    {/* Previous Dispense Audit Hotspot */}
                    <div
                      onClick={() => handleOpenHotspot('repeat_previous_audit')}
                      className="p-2 rounded-lg border border-dashed border-rose-700 bg-rose-50/80 hover:bg-rose-100 cursor-pointer transition text-[10px]"
                    >
                      <p className="font-bold text-rose-950">Previous Dispensing Audit:</p>
                      <p className="text-slate-800">Last Dispensed: <strong>10/08/2026</strong> at Chemist Warehouse (Sec 90: <strong>49182B</strong>)</p>
                      <p className="text-[9px] text-rose-900 font-semibold">Audit: Minimum 20-Day Interval Enforced</p>
                    </div>
                  </div>

                  {/* Right: Attached Medicare Duplicate */}
                  <div className="bg-[#f7faf8] text-slate-700 border-2 border-slate-400 rounded-xl p-4 shadow-md space-y-2 text-[11px] font-mono select-none opacity-85">
                    <div className="border-b border-slate-400 pb-1 flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">ATTACHED MEDICARE DUPLICATE</span>
                      <span className="text-xs">📎 STAPLED</span>
                    </div>
                    <p className="text-[10px]">Patient: <strong>David Miller</strong></p>
                    <p className="text-[10px]">Prescriber: <strong>Dr. Sarah Smith (2938471A)</strong></p>
                    <p className="text-[10px]">Original Issue Date: <strong>10/08/2026</strong></p>
                    <div className="p-2 rounded bg-slate-200 text-[10px] text-slate-800 mt-4">
                      Store Copy of this repeat will be detached and affixed to the previous yellow form for 2-year pharmacy filing.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCRIPT 3: Handwritten Carbon Script */}
          {activeTab === 'handwritten' && (
            <div className="bg-slate-900/90 border border-amber-600/50 p-3 sm:p-4 rounded-2xl shadow-2xl" dir="ltr">
              <div className="bg-[#fefbee] text-slate-900 border-2 border-amber-800/80 rounded-xl p-4 shadow-md space-y-3 font-serif select-none">
                {/* Stamp & Header */}
                <div className="flex items-start justify-between border-b-2 border-amber-900/60 pb-2">
                  <div
                    onClick={() => handleOpenHotspot('hw_clinic_stamp')}
                    className="p-2 rounded-lg border-2 border-dashed border-sky-700 bg-sky-50/80 hover:bg-sky-100 cursor-pointer transition"
                  >
                    <p className="font-bold text-xs text-sky-950 uppercase tracking-wide">Sydney West Locum Medical Service</p>
                    <p className="text-[10px] text-slate-800">Dr. James Wilson (MBBS) | Prov: 4019283B</p>
                    <p className="text-[10px] text-sky-900 font-sans">Tel: (02) 8765 4321 | 45 Railway Pde, Parramatta</p>
                  </div>
                  <span className="text-[10px] font-sans font-bold bg-amber-200 px-2 py-0.5 rounded border border-amber-400">
                    CARBON PAD
                  </span>
                </div>

                {/* Patient & Date */}
                <div className="flex items-center justify-between text-xs font-sans text-slate-800">
                  <p>Patient: <strong>Margaret Taylor</strong> (DOB: 05/11/1954)</p>
                  <p>Date: <strong className="text-amber-950">12/08/2026</strong></p>
                </div>

                {/* Handwritten Item & Strikethrough Alteration Scenario */}
                <div
                  onClick={() => handleOpenHotspot('hw_initialed_alteration')}
                  className="p-3 rounded-lg border-2 border-dashed border-rose-700 bg-rose-50/80 hover:bg-rose-100 cursor-pointer transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-sans font-bold text-rose-900">Rx Handwritten Line:</span>
                    <span className="text-[9px] font-sans bg-rose-200 text-rose-950 px-1.5 py-0.5 rounded font-bold">INITIALED ALTERATION</span>
                  </div>
                  <p className="text-base font-serif italic text-slate-900">
                    Amoxicillin 500mg Capsules
                  </p>
                  <div className="flex items-center gap-2 text-sm font-serif italic text-slate-900">
                    <span>Mitte: </span>
                    <span className="line-through text-rose-800 text-xs">10 caps</span>
                    <strong className="text-emerald-950 text-base font-bold underline">20 (Twenty) caps</strong>
                    <span className="text-xs bg-amber-300 text-slate-950 px-1.5 py-0.2 rounded font-sans font-black border border-amber-600">
                      JW [Initialed]
                    </span>
                  </div>
                </div>

                {/* Handwritten Directions */}
                <div
                  onClick={() => handleOpenHotspot('hw_directions_clarity')}
                  className="p-2.5 rounded-lg border border-dashed border-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 cursor-pointer transition space-y-1 font-sans text-xs"
                >
                  <span className="text-[10px] font-bold text-indigo-900">Directions (Sig):</span>
                  <p className="font-serif italic text-slate-900 text-sm">Take ONE capsule THREE times a day with food until finished.</p>
                </div>

                {/* Signature */}
                <div className="flex items-center justify-between pt-2 border-t border-amber-300 font-sans text-xs">
                  <div>
                    <span className="text-[10px] text-slate-600 block">Prescriber Live Signature:</span>
                    <span className="font-serif italic text-base font-bold text-blue-950">J. Wilson</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    WET-INK OK
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SCRIPT 4: eScript QR Token on Mobile Frame */}
          {activeTab === 'escript' && (
            <div className="bg-slate-900/90 border border-emerald-500/50 p-3 sm:p-4 rounded-2xl shadow-2xl flex justify-center">
              {/* Smartphone mockup */}
              <div className="w-full max-w-sm bg-slate-950 border-4 border-slate-700 rounded-[32px] p-4 shadow-2xl text-slate-100 space-y-3 relative overflow-hidden" dir="ltr">
                {/* Phone Speaker & Notch */}
                <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto" />

                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1 font-bold text-emerald-400">
                    <Smartphone className="w-3.5 h-3.5" />
                    eScript Token
                  </span>
                  <span>9:41 AM</span>
                </div>

                {/* QR Code Hotspot */}
                <div
                  onClick={() => handleOpenHotspot('escript_qr_token')}
                  className="p-3 rounded-2xl border-2 border-dashed border-emerald-500 bg-emerald-950/40 hover:bg-emerald-900/50 cursor-pointer transition text-center space-y-2"
                >
                  <div className="w-32 h-32 bg-white p-2 rounded-xl mx-auto flex items-center justify-center shadow-lg">
                    {/* QR Mockup */}
                    <div className="w-full h-full border-2 border-black grid grid-cols-4 gap-1 p-1 bg-slate-100">
                      <div className="bg-black rounded-sm" />
                      <div className="bg-slate-300" />
                      <div className="bg-black" />
                      <div className="bg-black rounded-sm" />
                      <div className="bg-slate-400" />
                      <div className="bg-black" />
                      <div className="bg-slate-300" />
                      <div className="bg-black" />
                      <div className="bg-black rounded-sm" />
                      <div className="bg-black" />
                      <div className="bg-slate-300" />
                      <div className="bg-black rounded-sm" />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 block">
                    eRx Token: <strong>ERX-9821-4820-1948</strong>
                  </span>
                  <span className="text-[9px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                    CRYPTOGRAPHIC SIGNATURE VALID
                  </span>
                </div>

                {/* Item Details */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
                  <p className="font-bold text-white">Rosuvastatin 10mg Tablet</p>
                  <p className="text-slate-400 text-[11px]">Qty: 30 | Repeats: 5</p>
                  <p className="text-slate-400 text-[11px]">Patient: <strong>David Miller</strong></p>
                  <p className="text-slate-400 text-[11px]">Doctor: <strong>Dr. Sarah Smith (2938471A)</strong></p>
                </div>

                {/* ASL Sync Hotspot */}
                <div
                  onClick={() => handleOpenHotspot('escript_asl_hub')}
                  className="p-2 rounded-xl border border-dashed border-sky-500 bg-sky-950/40 hover:bg-sky-900/50 cursor-pointer transition text-[11px] text-sky-200 text-center"
                >
                  🌐 Active Script List (ASL) Sync Active
                </div>
              </div>
            </div>
          )}

          {/* SCRIPT 5: NSW S8 Controlled Drug Script */}
          {activeTab === 's8_nsw' && (
            <div className="bg-slate-900/90 border-2 border-rose-600/70 p-3 sm:p-4 rounded-2xl shadow-2xl" dir="ltr">
              <div className="bg-[#fffdf5] text-slate-900 border-4 border-rose-800 rounded-xl p-4 shadow-xl space-y-3 font-mono select-none relative overflow-hidden">
                {/* Security Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none text-4xl font-black text-rose-900 rotate-[-25deg]">
                  NSW SCHEDULE 8 CONTROLLED DRUG
                </div>

                <div className="border-b-2 border-rose-800 pb-1 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-xs text-rose-950">NSW HEALTH SCHEDULE 8 PRESCRIPTION</span>
                    <p className="text-[9px] text-rose-800">POISONS & THERAPEUTIC GOODS ACT COMPLIANT</p>
                  </div>
                  <span className="bg-rose-800 text-white font-bold px-2 py-0.5 rounded text-[10px]">S8 CONTROLLED</span>
                </div>

                {/* Prescriber & Patient */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <p className="font-bold text-slate-900">Dr. Robert Kelly (5192847C)</p>
                    <p className="text-slate-700">Sydney Pain Centre, NSW</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">Patient: Johnathan Edwards</p>
                    <p className="text-rose-900 font-bold">DOB: 23/04/1979 (Mandatory)</p>
                  </div>
                </div>

                {/* Hotspot: S8 Figures and Words */}
                <div
                  onClick={() => handleOpenHotspot('s8_figures_and_words')}
                  className="p-3 rounded-lg border-2 border-dashed border-rose-600 bg-rose-50 hover:bg-rose-100 cursor-pointer transition space-y-1"
                >
                  <span className="text-[10px] font-bold text-rose-950 bg-rose-200 px-1.5 py-0.5 rounded">
                    MANDATORY FIGURES & WORDS:
                  </span>
                  <p className="font-bold text-xs text-rose-950">Oxycodone 20mg Prolonged Release Tablets</p>
                  <p className="text-xs text-slate-900 font-bold">
                    Quantity: <strong className="text-rose-950 underline">Twenty (20) Tablets</strong>
                  </p>
                  <p className="text-[10px] text-slate-800">Sig: Take ONE tablet TWICE daily with food.</p>
                </div>

                {/* Hotspot: 6-Month Expiry & Intervals */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => handleOpenHotspot('s8_strict_expiry_rule')}
                    className="p-2 rounded-lg border border-dashed border-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer transition text-[10px]"
                  >
                    <span className="text-slate-600 block">Date of Issue:</span>
                    <strong className="text-amber-950 text-xs">02/08/2026</strong>
                    <span className="text-[9px] text-rose-900 block font-bold">Expires: 6 MONTHS MAX</span>
                  </div>
                  <div
                    onClick={() => handleOpenHotspot('s8_repeat_intervals')}
                    className="p-2 rounded-lg border border-dashed border-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition text-[10px]"
                  >
                    <span className="text-slate-600 block">Repeats Authorised:</span>
                    <strong className="text-indigo-950 text-xs">2 (Two) Repeats</strong>
                    <span className="text-[9px] text-indigo-900 block font-bold">Interval: Every 14 Days</span>
                  </div>
                </div>

                {/* Hotspot: SafeScript RTPM */}
                <div
                  onClick={() => handleOpenHotspot('s8_safescript_audit')}
                  className="p-2 rounded-lg border-2 border-dashed border-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer transition flex items-center justify-between text-[10px]"
                >
                  <span className="font-bold text-emerald-950">SafeScript NSW RTPM Check:</span>
                  <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">
                    GREEN / CLEARED
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SCRIPT 6: NSW ODT & RACF Chart */}
          {activeTab === 'odt_racf' && (
            <div className="bg-slate-900/90 border border-purple-500/50 p-3 sm:p-4 rounded-2xl shadow-2xl space-y-3" dir="ltr">
              {/* ODT Dosing Form */}
              <div className="bg-[#faf5ff] text-slate-900 border-2 border-purple-800 rounded-xl p-4 shadow-md space-y-2 text-[11px] font-mono select-none">
                <div className="border-b-2 border-purple-800 pb-1 flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-950">NSW OPIOID TREATMENT PROGRAM (OTP) DOSING MATRIX</span>
                  <span className="bg-purple-800 text-white font-bold px-2 py-0.5 rounded text-[10px]">ODT / METHADONE</span>
                </div>

                {/* Nominated Pharmacy Hotspot */}
                <div
                  onClick={() => handleOpenHotspot('odt_nominated_pharmacy_check')}
                  className="p-2 rounded-lg border-2 border-dashed border-purple-600 bg-purple-100/70 hover:bg-purple-200 cursor-pointer transition"
                >
                  <p className="font-bold text-purple-950">NOMINATED PHARMACY: Sydney Care Pharmacy, Parramatta</p>
                  <p className="text-[10px] text-slate-700">Patient: Michael Clark (DOB: 11/02/1985)</p>
                </div>

                {/* Supervised vs Takeaway Dosing Matrix Hotspot */}
                <div
                  onClick={() => handleOpenHotspot('odt_supervised_vs_takeaway_check')}
                  className="p-2.5 rounded-lg border-2 border-dashed border-indigo-600 bg-white hover:bg-indigo-50 cursor-pointer transition space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span>DAILY DOSE: <strong className="text-purple-950 text-xs">60mg (Sixty Milligrams) Liquid</strong></span>
                    <span className="text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded">DOSING MATRIX</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold">
                    <div className="p-1 bg-emerald-100 text-emerald-900 rounded border border-emerald-300">Mon (Sup)</div>
                    <div className="p-1 bg-emerald-100 text-emerald-900 rounded border border-emerald-300">Tue (Sup)</div>
                    <div className="p-1 bg-emerald-100 text-emerald-900 rounded border border-emerald-300">Wed (Sup)</div>
                    <div className="p-1 bg-emerald-100 text-emerald-900 rounded border border-emerald-300">Thu (Sup)</div>
                    <div className="p-1 bg-emerald-100 text-emerald-900 rounded border border-emerald-300">Fri (Sup)</div>
                    <div className="p-1 bg-amber-200 text-amber-950 rounded border border-amber-400">Sat (TA)</div>
                    <div className="p-1 bg-amber-200 text-amber-950 rounded border border-amber-400">Sun (TA)</div>
                  </div>
                </div>

                {/* Missed Doses Hotspot */}
                <div
                  onClick={() => handleOpenHotspot('odt_missed_doses_protocol')}
                  className="p-2 rounded-lg border-2 border-dashed border-rose-600 bg-rose-50 hover:bg-rose-100 cursor-pointer transition text-[10px] text-rose-950 space-y-0.5"
                >
                  <p className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    Critical Clinical Protocol: Missed Doses &gt; 3 Days
                  </p>
                  <p className="text-[9px] text-slate-800">If client misses &gt;3 consecutive days, do not administer maintenance dose. Contact prescriber.</p>
                </div>

                {/* RACF Chart Expiry Hotspot */}
                <div
                  onClick={() => handleOpenHotspot('racf_nrmc_chart_rules')}
                  className="p-2 rounded-lg border border-dashed border-teal-600 bg-teal-50 hover:bg-teal-100 cursor-pointer transition text-[10px] text-teal-950"
                >
                  <strong>NRMC / Webster-pak Aged Care Chart:</strong> Valid for maximum 6 months from GP authorization.
                </div>
              </div>
            </div>
          )}

          {/* 3. Concise 2-Line Footer Summary (Filing & Dispensary Workflow) */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-sky-300">{isFa ? 'گردش مدارک و بایگانی داروخانه:' : 'Dispensary Filing:'}</strong>{' '}
              {isFa ? currentScript.filing_summary_fa : currentScript.filing_summary_en}
            </div>
          </div>
        </div>

        {/* Right: Quick Hotspot Inspector Menu (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="app-card border border-indigo-500/40 rounded-2xl p-4 bg-slate-950 text-xs space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-indigo-300 font-bold border-b border-slate-800 pb-2">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              <span>{isFa ? 'فهرست الزامات و قوانین این نسخه' : 'Script Statutory Checklist'}</span>
            </div>

            <p className="text-[11px] text-slate-400">
              {isFa
                ? 'روی هر عنوان کلیک کنید تا جزئیات قانونی، بایدها/نبایدها و هشدارهای بالینی باز شوند:'
                : 'Click any rule to review comprehensive legal guidelines, Dos & Don’ts, and exam tips:'}
            </p>

            <div className="space-y-2">
              {currentScript.hotspots.map((hs) => (
                <button
                  key={hs.id}
                  id={`btn_hotspot_${hs.id}`}
                  onClick={() => setSelectedHotspot(hs)}
                  className="w-full p-2.5 rounded-xl bg-slate-900/90 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 text-left transition flex items-center justify-between group"
                  dir={isFa ? 'rtl' : 'ltr'}
                >
                  <div className="space-y-0.5 pr-2">
                    <p className="font-bold text-slate-200 group-hover:text-indigo-200 text-xs line-clamp-1">
                      {isFa ? hs.title_fa : hs.title_en}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      ID: #{hs.id}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-600/30 text-indigo-300 text-[10px] font-bold shrink-0">
                    {isFa ? 'بررسی' : 'Audit'}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Summary Pill */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-400">
                <span>{isFa ? 'رده دارویی:' : 'Schedule:'}</span>
                <strong className="text-emerald-400">{currentScript.schedule}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>{isFa ? 'اعتبار زمانی:' : 'Legal Expiry:'}</span>
                <strong className="text-amber-400">
                  {currentScript.schedule === 'S8' || currentScript.schedule === 'ODT' ? '6 Months' : '12 Months'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Hotspot Detail Modal Window */}
      <HotspotDetailModal
        hotspot={selectedHotspot}
        language={language}
        onClose={() => setSelectedHotspot(null)}
      />
    </div>
  );
};
