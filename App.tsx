
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
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseICS(content);
      
      const newCalendar: CalendarSource = {
        id: crypto.randomUUID(),
        name: file.name.replace('.ics', ''),
        events: parsed,
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
        <input 
          type="checkbox" 
          checked={config[visibilityKey] as boolean}
          onChange={(e) => updateConfig(visibilityKey, e.target.checked)}
          className="w-3 h-3 rounded text-indigo-600 cursor-pointer"
        />
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 font-sans">
      <aside className="no-print w-full md:w-80 h-auto md:h-screen md:sticky top-0 bg-white border-r border-slate-200 shadow-xl z-20 flex flex-col">
        <div className="p-6 border-b bg-indigo-50/30">
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1 rounded-lg">CC</span>
            CalCraft
          </h1>
        </div>

        <div className="flex-grow overflow-y-auto p-6 space-y-8">
          <section>
            <h3 className="text-[11px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Layout Architecture</h3>
            <div className="space-y-3">
              {config.layoutOrder.map((block, idx) => {
                const heightKey = `${block}Height` as keyof AppConfig;
                return (
                  <div key={block} className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                        {block === 'header' ? 'Title & Year' : block === 'grid' ? 'Calendar Grid' : block.charAt(0).toUpperCase() + block.slice(1)}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => moveBlock(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 hover:bg-white rounded shadow-sm disabled:opacity-30"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button 
                          onClick={() => moveBlock(idx, 'down')}
                          disabled={idx === config.layoutOrder.length - 1}
                          className="p-1 hover:bg-white rounded shadow-sm disabled:opacity-30"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase w-10">Height</span>
                      <input 
                        type="range" 
                        min={block === 'grid' ? 0 : 20} 
                        max={800} 
                        step={10}
                        value={config[heightKey] as number}
                        onChange={(e) => updateConfig(heightKey, parseInt(e.target.value))}
                        className="flex-grow h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <span className="text-[8px] font-black text-indigo-600 w-8 text-right">
                        {config[heightKey] === 0 ? 'Auto' : `${config[heightKey]}px`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Typography Styles</h3>
            <div className="space-y-3">
              <StyleControl label="Month Title" fontKey="titleFont" sizeKey="titleSize" colorKey="titleColor" visibilityKey="showTitle" alignKey="titleAlign" />
              <StyleControl label="Year Label" fontKey="yearFont" sizeKey="yearSize" colorKey="yearColor" visibilityKey="showYear" alignKey="yearAlign" />
              <StyleControl label="Grid Numbers" fontKey="gridFont" sizeKey="gridSize" colorKey="gridColor" visibilityKey="showGrid" alignKey="gridAlign" />
              
              {config.showGrid && (
                <div className="px-3 py-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                   <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Grid Advanced</p>
                   <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={config.gridShowLines} onChange={(e) => updateConfig('gridShowLines', e.target.checked)} className="w-3 h-3 rounded" />
                        <span className="text-[9px] font-bold uppercase text-slate-500">Lines</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={config.gridTransparent} onChange={(e) => updateConfig('gridTransparent', e.target.checked)} className="w-3 h-3 rounded" />
                        <span className="text-[9px] font-bold uppercase text-slate-500">Clear BG</span>
                      </label>
                   </div>
                   <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold uppercase text-slate-500">Layout Rows</span>
                        <span className="text-[10px] font-black text-indigo-600">{config.gridRows === 0 ? 'AUTO (7 Col)' : config.gridRows === 1 ? 'LINEAR (1 Row)' : `${config.gridRows} Rows`}</span>
                      </div>
                      <input 
                        type="range" min="0" max="6" step="1" 
                        value={config.gridRows} 
                        onChange={(e) => updateConfig('gridRows', parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <p className="text-[8px] text-slate-400 italic">0 = Standard calendar. 1 = Single strip.</p>
                   </div>
                </div>
              )}

              <StyleControl label="Day" fontKey="dayFont" sizeKey="daySize" colorKey="dayColor" visibilityKey="showGrid" />
              <StyleControl label="Event Details" fontKey="eventFont" sizeKey="eventSize" colorKey="eventColor" visibilityKey="showEvents" />
              <StyleControl label="Inspiration Text" fontKey="quoteFont" sizeKey="quoteSize" colorKey="quoteColor" visibilityKey="showQuotes" alignKey="quoteAlign" />
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Format & Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Year</label>
                  <input 
                    type="number" 
                    value={config.year} 
                    onChange={(e) => updateConfig('year', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Size</label>
                  <select 
                    value={config.pageSize}
                    onChange={(e) => updateConfig('pageSize', e.target.value as PageSize)}
                    className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold"
                  >
                    <option value="A4">A4</option>
                    <option value="A5">A5</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className={`space-y-2 p-3 bg-white/50 rounded-xl border border-slate-100 transition-opacity ${!config.showAccent ? 'opacity-40' : 'opacity-100'}`}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Theme Accent</label>
                  <input 
                    type="checkbox" 
                    checked={config.showAccent}
                    onChange={(e) => updateConfig('showAccent', e.target.checked)}
                    className="w-3 h-3 rounded text-indigo-600 cursor-pointer"
                  />
                </div>
                <div className="flex gap-2">
                  <input 
                    disabled={!config.showAccent}
                    type="color" 
                    value={config.primaryColor} 
                    onChange={(e) => updateConfig('primaryColor', e.target.value)} 
                    className="w-10 h-10 border-none rounded-xl cursor-pointer bg-slate-50 p-1" 
                  />
                  <input 
                    disabled={!config.showAccent}
                    type="text" 
                    value={config.primaryColor.toUpperCase()} 
                    onChange={(e) => updateConfig('primaryColor', e.target.value)} 
                    className="flex-grow px-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-mono font-bold" 
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Calendars & Events</h3>
            <div className="p-4 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-100 transition-all cursor-pointer relative mb-4">
              <input type="file" accept=".ics" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Import .ics</p>
            </div>
            
            <div className="space-y-2 mb-6">
              {calendars.map(cal => (
                <div key={cal.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={cal.active} 
                      onChange={() => toggleCalendar(cal.id)}
                      className="w-3 h-3 rounded text-indigo-600 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px]">
                      {cal.name}
                    </span>
                  </div>
                  <button 
                    onClick={() => deleteCalendar(cal.id)}
                    className="p-1 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {calendars.length === 0 && (
                <p className="text-[9px] text-slate-400 text-center italic py-2">No calendars imported</p>
              )}
            </div>

            <h4 className="text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest">Custom Content</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {monthConfigs.map((m, idx) => (
                  <label key={idx} className="relative aspect-square rounded-lg bg-slate-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(idx, e)} />
                    {m.image && <img src={m.image} crossOrigin="anonymous" className="w-full h-full object-cover opacity-80" />}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 hover:opacity-100"><span className="text-[8px] font-black text-white">{new Date(m.year, m.month).toLocaleString('default', { month: 'short' })}</span></div>
                  </label>
                ))}
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Quotes</label>
                <select 
                  className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    const promptText = prompt(`Enter quote for ${new Date(config.year, idx).toLocaleString('default', { month: 'long' })}`, monthConfigs[idx].quote || "");
                    if (promptText !== null) handleQuoteChange(idx, promptText);
                  }}
                  value=""
                >
                  <option value="" disabled>Select Month to Edit...</option>
                  {monthConfigs.map((m, idx) => (
                    <option key={idx} value={idx}>{new Date(config.year, m.month).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 bg-white border-t mt-auto shadow-xl space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={handleExportPDF} 
              disabled={exportLoading} 
              className="flex flex-col items-center justify-center gap-1 bg-slate-900 text-white py-3 rounded-2xl font-black uppercase tracking-[0.1em] text-[10px] hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50"
            >
              {exportLoading && exportType === 'PDF' ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  PDF
                </>
              )}
            </button>
            <button 
              onClick={handleExportImages} 
              disabled={exportLoading} 
              className="flex flex-col items-center justify-center gap-1 bg-slate-100 text-slate-800 py-3 rounded-2xl font-black uppercase tracking-[0.1em] text-[10px] hover:bg-indigo-50 transition-all shadow-sm border border-slate-200 disabled:opacity-50"
            >
              {exportLoading && exportType === 'PNG' ? (
                 <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  PNGs
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowHelp(true);
                posthog.capture('help_opened');
              }}
              className="flex flex-col items-center justify-center gap-1 bg-indigo-50 text-indigo-800 py-3 rounded-2xl font-black uppercase tracking-[0.1em] text-[10px] hover:bg-indigo-100 transition-all shadow-sm border border-indigo-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 18h.01M16 10h.01M12 2v2m0 16v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
              Help
            </button>
          </div>
          
          {exportLoading && exportType === 'PNG' && (
            <div className="px-1">
              <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase mb-1">
                <span>Exporting ZIP...</span>
                <span>{exportProgress}/12</span>
              </div>
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${(exportProgress / 12) * 100}%` }}></div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-grow h-screen overflow-y-auto p-4 md:p-12 scroll-smooth bg-slate-100">
        <div id="calendar-container" ref={calendarRef} className="mx-auto flex flex-col items-center gap-16 pb-32">
          {monthConfigs.map((mc, idx) => (
            <MonthPage key={`${mc.year}-${mc.month}`} index={idx} config={config} monthConfig={mc} events={activeEvents} />
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
