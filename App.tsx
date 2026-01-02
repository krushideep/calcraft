
import React, { useState, useEffect, useRef } from 'react';
import posthog from 'posthog-js';
import { CalendarEvent, AppConfig, MonthConfig, CalendarFont, PageSize, LayoutBlock, Alignment, CalendarSource } from './types';
import { parseICS } from './utils/calendarUtils';
import MonthPage from './components/MonthPage';
import HelpModal from './components/HelpModal';

declare var html2canvas: any;
declare var html2pdf: any;

const DEFAULT_CONFIG: AppConfig = {
  showImages: true,
  showEvents: true,
  showQuotes: true,
  showTitle: true,
  showYear: true,
  showGrid: true,
  showAccent: true,
  
  titleFont: 'serif-elegant',
  titleSize: 42,
  titleColor: '#1e293b',
  titleAlign: 'left',
  
  yearFont: 'sans',
  yearSize: 24,
  yearColor: '#94a3b8',
  yearAlign: 'right',
  
  gridFont: 'modern',
  gridSize: 14,
  gridColor: '#64748b',
  gridAlign: 'right',
  gridShowLines: true,
  gridTransparent: false,
  gridRows: 0, // Standard 7-column layout
  
  dayFont: 'sans',
  daySize: 9,
  dayColor: '#94a3b8',

  eventFont: 'sans',
  eventSize: 10,
  eventColor: '#1e293b',
  
  quoteFont: 'serif-classic',
  quoteSize: 18,
  quoteColor: '#1e293b',
  quoteAlign: 'center',

  year: new Date().getFullYear(),
  primaryColor: '#6366f1',
  pageSize: 'A4',
  customWidth: 210,
  customHeight: 297,
  layoutOrder: ['header', 'image', 'quote', 'grid'],

  headerHeight: 80,
  imageHeight: 350,
  quoteHeight: 80,
  gridHeight: 0, // Auto
};

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [monthConfigs, setMonthConfigs] = useState<MonthConfig[]>([]);
  const [calendars, setCalendars] = useState<CalendarSource[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportType, setExportType] = useState<'PDF' | 'PNG' | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    design: true,
    typography: false,
    layout: false,
    calendars: false,
    images: false,
    exports: false,
    tools: false,
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialMonths: MonthConfig[] = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      year: config.year,
      image: `https://picsum.photos/seed/calcraft-${i}-${config.year}/1200/800`,
      quote: '',
    }));
    setMonthConfigs(initialMonths);
  }, [config.year]);

  const activeEvents = calendars
    .filter(cal => cal.active)
    .flatMap(cal => cal.events);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const parsed = parseICS(content);
      // Expand recurring events into instances for the currently selected year
      // so yearly birthdays and other recurring items appear in the calendar.
      // This keeps the calendar events scoped to the displayed year.
      const expanded = await (async () => {
        try {
          const mod = await import('./utils/calendarUtils');
          return mod.expandRecurringForYear(parsed, config.year);
        } catch (e) {
          return parsed;
        }
      })();

      const newCalendar: CalendarSource = {
        id: crypto.randomUUID(),
        name: file.name.replace('.ics', ''),
        events: expanded,
        active: true,
        color: config.primaryColor
      };

      setCalendars(prev => [...prev, newCalendar]);
      posthog.capture('calendar_imported', {
        calendar_name: file.name,
        event_count: parsed.length
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const toggleCalendar = (id: string) => {
    setCalendars(prev => {
      const updated = prev.map(cal => cal.id === id ? { ...cal, active: !cal.active } : cal);
      const calendar = updated.find(c => c.id === id);
      posthog.capture('calendar_toggled', {
        calendar_name: calendar?.name,
        now_active: calendar?.active
      });
      return updated;
    });
  };

  const deleteCalendar = (id: string) => {
    const calendar = calendars.find(c => c.id === id);
    setCalendars(prev => prev.filter(cal => cal.id !== id));
    posthog.capture('calendar_deleted', {
      calendar_name: calendar?.name
    });
  };

  const handleImageUpload = (monthIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newConfigs = [...monthConfigs];
      newConfigs[monthIndex].image = base64;
      setMonthConfigs(newConfigs);
      posthog.capture('month_image_updated', {
        month: monthIndex,
        file_size: file.size
      });
    };
    reader.readAsDataURL(file);
  };

  const handleQuoteChange = (monthIndex: number, text: string) => {
    const newConfigs = [...monthConfigs];
    newConfigs[monthIndex].quote = text;
    setMonthConfigs(newConfigs);
    posthog.capture('month_quote_updated', {
      month: monthIndex,
      quote_length: text.length
    });
  };

  const handleExportPDF = async () => {
    if (!calendarRef.current) return;
    setExportLoading(true);
    setExportType('PDF');
    posthog.capture('pdf_export_started', {
      year: config.year,
      page_size: config.pageSize
    });
    
    const originalGap = calendarRef.current.className;
    calendarRef.current.className = "mx-auto flex flex-col items-center gap-0";

    const opt = {
      margin: 0,
      filename: `CalCraft-${config.year}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { 
        unit: 'mm', 
        format: config.pageSize === 'custom' ? [config.customWidth, config.customHeight] : config.pageSize.toLowerCase(), 
        orientation: 'portrait' 
      }
    };

    try {
      await html2pdf().set(opt).from(calendarRef.current).save();
      posthog.capture('pdf_export_completed', {
        year: config.year
      });
      // Track the actual PDF download as an individual download event
      posthog.capture('calendar_downloaded', {
        filename: opt.filename,
        year: config.year,
        export_type: 'PDF'
      });
    } catch (error) {
      console.error("PDF Export failed", error);
      alert("PDF export failed.");
      posthog.capture('pdf_export_failed', {
        year: config.year,
        error: String(error)
      });
    } finally {
      calendarRef.current.className = originalGap;
      setExportLoading(false);
      setExportType(null);
    }
  };

  const handleExportImages = async () => {
    if (!calendarRef.current) return;
    setExportLoading(true);
    setExportType('PNG');
    setExportProgress(0);
    posthog.capture('image_export_started', {
      year: config.year
    });

    const monthElements = calendarRef.current.querySelectorAll('.pdf-page-container');
    
    try {
      for (let i = 0; i < monthElements.length; i++) {
        setExportProgress(i + 1);
        const element = monthElements[i] as HTMLElement;
        
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true
        });

        const monthName = new Date(config.year, i).toLocaleString('default', { month: 'long' });
        const dataUrl = canvas.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `CalCraft-${config.year}-${monthName}.png`;
        link.href = dataUrl;
        link.click();
        // Track each image file download individually
        posthog.capture('calendar_downloaded', {
          filename: `CalCraft-${config.year}-${monthName}.png`,
          month: i,
          year: config.year,
          export_type: 'PNG'
        });

        await new Promise(resolve => setTimeout(resolve, 600));
      }
      posthog.capture('image_export_completed', {
        year: config.year,
        months_exported: monthElements.length
      });
    } catch (error) {
      console.error("Image Export failed", error);
      alert("Image export failed.");
      posthog.capture('image_export_failed', {
        year: config.year,
        error: String(error)
      });
    } finally {
      setExportLoading(false);
      setExportProgress(0);
      setExportType(null);
    }
  };

  const updateConfig = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    posthog.capture('config_updated', {
      setting: key,
      value: typeof value === 'object' ? JSON.stringify(value) : value
    });
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...config.layoutOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      updateConfig('layoutOrder', newOrder);
    }
  };

  const StyleControl = ({ 
    label, 
    fontKey, 
    sizeKey, 
    colorKey,
    visibilityKey,
    alignKey
  }: { 
    label: string, 
    fontKey: keyof AppConfig, 
    sizeKey: keyof AppConfig, 
    colorKey: keyof AppConfig,
    visibilityKey: keyof AppConfig,
    alignKey?: keyof AppConfig
  }) => (
    <div className={`space-y-2 p-3 bg-white/50 rounded-xl border border-slate-100 transition-opacity ${!config[visibilityKey] ? 'opacity-40' : 'opacity-100'}`}>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        <button
          onClick={() => updateConfig(visibilityKey, !config[visibilityKey])}
          className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${
            config[visibilityKey] 
              ? 'bg-indigo-600 text-white' 
              : 'bg-slate-200 text-slate-600'
          }`}
        >
          {config[visibilityKey] ? 'ON' : 'OFF'}
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          <select 
            disabled={!config[visibilityKey]}
            value={config[fontKey] as string}
            onChange={(e) => updateConfig(fontKey, e.target.value as any)}
            className="flex-grow px-2 py-1 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-[10px] font-bold"
          >
            <option value="serif-elegant">Playfair</option>
            <option value="serif-classic">Lora</option>
            <option value="sans">Inter</option>
            <option value="modern">Montserrat</option>
            <option value="mono">Space</option>
          </select>
          <input 
            disabled={!config[visibilityKey]}
            type="number" 
            value={config[sizeKey] as number}
            onChange={(e) => updateConfig(sizeKey, parseInt(e.target.value))}
            className="w-12 px-1 py-1 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-[10px] font-bold text-center"
            title="Font Size (px)"
          />
          <input 
            disabled={!config[visibilityKey]}
            type="color" 
            value={config[colorKey] as string}
            onChange={(e) => updateConfig(colorKey, e.target.value)}
            className="w-8 h-8 rounded-lg border-none bg-slate-50 p-1 cursor-pointer"
          />
        </div>
        {alignKey && (
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
            {(['left', 'center', 'right'] as Alignment[]).map((alignment) => (
              <button
                key={alignment}
                disabled={!config[visibilityKey]}
                onClick={() => updateConfig(alignKey as any, alignment)}
                className={`flex-1 py-1 text-[8px] font-black uppercase rounded transition-all ${
                  config[alignKey] === alignment 
                    ? 'bg-white shadow-sm text-indigo-600' 
                    : 'text-slate-400 hover:bg-white/50'
                }`}
              >
                {alignment}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 font-sans">
      <aside className="no-print w-full md:w-64 h-auto md:h-screen md:sticky top-0 bg-white border-r border-slate-200 shadow-xl z-20 flex flex-col">
        <div className="p-4 border-b bg-indigo-50/30">
          <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1 rounded-lg text-sm">CC</span>
            <span className="text-lg">CalCraft</span>
          </h1>
        </div>

        <div className="flex-grow overflow-y-auto space-y-0">
          {/* Design Section */}
          <div className="border-b border-slate-100">
            <button
              onClick={() => toggleSection('design')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                 <span className="text-sm font-black text-slate-700">Design</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.design ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </button>
            {expandedSections.design && (
              <div className="px-4 py-4 space-y-4 bg-slate-50/50">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Year</label>
                  <input 
                    type="number" 
                    value={config.year} 
                    onChange={(e) => updateConfig('year', parseInt(e.target.value))}
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Page Size</label>
                  <select 
                    value={config.pageSize}
                    onChange={(e) => updateConfig('pageSize', e.target.value as PageSize)}
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                  >
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Theme Accent</label>
                    <button
                      onClick={() => updateConfig('showAccent', !config.showAccent)}
                      className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${
                        config.showAccent 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {config.showAccent ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  {config.showAccent && (
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        value={config.primaryColor} 
                        onChange={(e) => updateConfig('primaryColor', e.target.value)} 
                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer" 
                      />
                      <input 
                        type="text" 
                        value={config.primaryColor.toUpperCase()} 
                        onChange={(e) => updateConfig('primaryColor', e.target.value)} 
                        className="flex-grow px-2 py-1 text-xs font-mono border border-slate-200 rounded" 
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Typography Section */}
          <div className="border-b border-slate-100">
            <button
              onClick={() => toggleSection('typography')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-700">Typography</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.typography ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </button>
            {expandedSections.typography && (
              <div className="px-4 py-4 space-y-3 bg-slate-50/50">
                <StyleControl label="Month Title" fontKey="titleFont" sizeKey="titleSize" colorKey="titleColor" visibilityKey="showTitle" alignKey="titleAlign" />
                <StyleControl label="Year Label" fontKey="yearFont" sizeKey="yearSize" colorKey="yearColor" visibilityKey="showYear" alignKey="yearAlign" />
                <StyleControl label="Grid Numbers" fontKey="gridFont" sizeKey="gridSize" colorKey="gridColor" visibilityKey="showGrid" alignKey="gridAlign" />
                <StyleControl label="Events" fontKey="eventFont" sizeKey="eventSize" colorKey="eventColor" visibilityKey="showEvents" />
                <StyleControl label="Quote" fontKey="quoteFont" sizeKey="quoteSize" colorKey="quoteColor" visibilityKey="showQuotes" />
              </div>
            )}
          </div>

          {/* Layout Section */}
          <div className="border-b border-slate-100">
            <button
              onClick={() => toggleSection('layout')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-700">Layout</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.layout ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </button>
            {expandedSections.layout && (
              <div className="px-4 py-4 space-y-3 bg-slate-50/50">
                {config.layoutOrder.map((block, idx) => {
                  const heightKey = `${block}Height` as keyof AppConfig;
                  return (
                    <div key={block} className="space-y-2 p-2 bg-white rounded border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-slate-600">
                          {block === 'header' ? 'Title & Year' : block === 'grid' ? 'Calendar Grid' : block.charAt(0).toUpperCase() + block.slice(1)}
                        </span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => moveBlock(idx, 'up')}
                            disabled={idx === 0}
                            className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                          </button>
                          <button 
                            onClick={() => moveBlock(idx, 'down')}
                            disabled={idx === config.layoutOrder.length - 1}
                            className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                        </div>
                      </div>
                      <input 
                        type="range" 
                        min={block === 'grid' ? 0 : 20} 
                        max={800} 
                        step={10}
                        value={config[heightKey] as number}
                        onChange={(e) => updateConfig(heightKey, parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <span className="text-[8px] font-bold text-indigo-600">{config[heightKey] === 0 ? 'Auto' : `${config[heightKey]}px`}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Calendars Section */}
          <div className="border-b border-slate-100">
            <button
              onClick={() => toggleSection('calendars')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-700">Calendars</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.calendars ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </button>
            {expandedSections.calendars && (
              <div className="px-4 py-4 space-y-3 bg-slate-50/50">
                <div className="p-2 border-2 border-dashed border-slate-200 rounded bg-white hover:border-indigo-200 transition-all cursor-pointer relative">
                  <input type="file" accept=".ics" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <p className="text-center text-[9px] font-black text-slate-400 uppercase">Import .ics</p>
                </div>
                <div className="space-y-2">
                  {calendars.map(cal => (
                    <div key={cal.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-100">
                      <button
                        onClick={() => toggleCalendar(cal.id)}
                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${
                          cal.active
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {cal.active ? 'ON' : 'OFF'}
                      </button>
                      <span className="text-[9px] font-bold text-slate-700 flex-grow truncate px-2">{cal.name}</span>
                      <button onClick={() => deleteCalendar(cal.id)} className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Images Section */}
          <div className="border-b border-slate-100">
            <button
              onClick={() => toggleSection('images')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-700">Images</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.images ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </button>
            {expandedSections.images && (
              <div className="px-4 py-4 space-y-3 bg-slate-50/50">
                <div className="grid grid-cols-3 gap-2">
                  {monthConfigs.map((m, idx) => (
                    <label key={idx} className="relative aspect-square rounded border border-slate-200 bg-white overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(idx, e)} />
                      {m.image && <img src={m.image} crossOrigin="anonymous" className="w-full h-full object-cover opacity-80" />}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 hover:opacity-100 transition-opacity"><span className="text-[7px] font-black text-white">{new Date(m.year, m.month).toLocaleString('default', { month: 'short' })}</span></div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Exports Section */}
          <div className="border-b border-slate-100">
            <button
              onClick={() => toggleSection('exports')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-700">Exports</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.exports ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </button>
            {expandedSections.exports && (
              <div className="px-4 py-4 space-y-2 bg-slate-50/50">
                <button 
                  onClick={handleExportPDF} 
                  disabled={exportLoading} 
                  className="w-full px-3 py-2 bg-slate-900 text-white text-xs font-black rounded hover:bg-indigo-600 disabled:opacity-50 transition-all"
                >
                  Export PDF
                </button>
                <button 
                  onClick={handleExportImages} 
                  disabled={exportLoading} 
                  className="w-full px-3 py-2 bg-slate-100 text-slate-800 text-xs font-black rounded hover:bg-indigo-50 disabled:opacity-50 transition-all"
                >
                  Export PNGs
                </button>
              </div>
            )}
          </div>

          {/* Tools Section */}
          <div className="border-b border-slate-100">
            <button
              onClick={() => toggleSection('tools')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-700">Help</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 transition-transform ${expandedSections.tools ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </button>
            {expandedSections.tools && (
              <div className="px-4 py-4 bg-slate-50/50">
                <button
                  onClick={() => {
                    setShowHelp(true);
                    posthog.capture('help_opened');
                  }}
                  className="w-full px-3 py-2 bg-indigo-50 text-indigo-700 text-xs font-black rounded hover:bg-indigo-100 transition-all"
                >
                  Open Help
                </button>
              </div>
            )}
          </div>
        </div>

      </aside>

      <main className="flex-grow h-screen overflow-y-auto p-1 sm:p-2 md:p-8 scroll-smooth bg-slate-100">
        <div id="calendar-container" ref={calendarRef} className="mx-auto flex flex-col items-center gap-1 sm:gap-2 md:gap-6 pb-12 sm:pb-16 md:pb-24 w-full max-w-full md:max-w-6xl">
          {monthConfigs.map((mc, idx) => (
            <div key={`${mc.year}-${mc.month}`} className="w-full max-w-full overflow-x-auto flex justify-center">
              <MonthPage index={idx} config={config} monthConfig={mc} events={activeEvents} />
            </div>
          ))}
        </div>
      </main>
      {/* Help modal */}
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};

export default App;

// Help modal
function HelpModalWrapper({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <HelpModal open={open} onClose={onClose} />;
}
