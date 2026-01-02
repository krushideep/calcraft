
import React from 'react';
import { AppConfig, MonthConfig, CalendarEvent, CalendarFont, LayoutBlock } from '../types';
import { getDaysInMonth, getFirstDayOfMonth } from '../utils/calendarUtils';

interface MonthPageProps {
  config: AppConfig;
  monthConfig: MonthConfig;
  events: CalendarEvent[];
  index: number;
}

const MonthPage: React.FC<MonthPageProps> = ({ config, monthConfig, events, index }) => {
  const daysInMonth = getDaysInMonth(monthConfig.month, monthConfig.year);
  const firstDay = getFirstDayOfMonth(monthConfig.month, monthConfig.year);
  
  const monthName = new Date(monthConfig.year, monthConfig.month).toLocaleString('default', { month: 'long' });
  
  // Helper to compare dates ignoring time and timezone shifts for calendar display
  const isSameDay = (d1: Date, d2Day: number, d2Month: number, d2Year: number) => {
    const localMatch = d1.getFullYear() === d2Year && d1.getMonth() === d2Month && d1.getDate() === d2Day;
    const utcMatch = d1.getUTCFullYear() === d2Year && d1.getUTCMonth() === d2Month && d1.getUTCDate() === d2Day;
    return localMatch || utcMatch;
  };

  const monthEvents = events.filter(e => {
    const d = e.startDate;
    return (d.getFullYear() === monthConfig.year && d.getMonth() === monthConfig.month) ||
           (d.getUTCFullYear() === monthConfig.year && d.getUTCMonth() === monthConfig.month);
  });

  const getFontClass = (font: CalendarFont) => ({
    'sans': 'font-sans',
    'serif-elegant': 'font-serif-elegant',
    'serif-classic': 'font-serif-classic',
    'mono': 'font-mono-tech',
    'modern': 'font-sans-modern',
    'poppins': 'font-poppins',
    'merriweather': 'font-merriweather',
    'roboto': 'font-roboto',
    'georgia': 'font-georgia',
    'courier': 'font-courier',
    'plex-serif': 'font-plex-serif',
    'raleway': 'font-raleway',
    'garamond': 'font-garamond'
  }[font]);

  const getAlignClass = (align: 'left' | 'center' | 'right') => {
    return {
      left: 'text-left justify-start',
      center: 'text-center justify-center',
      right: 'text-right justify-end'
    }[align];
  };

  const themeColor = config.showAccent ? config.primaryColor : '#cbd5e1'; // slate-300
  const headerAccentColor = config.showAccent ? config.primaryColor : 'transparent';

  let widthMm = 210, heightMm = 297;
  if (config.pageSize === 'A5') { widthMm = 148; heightMm = 210; }
  else if (config.pageSize === 'custom') { widthMm = config.customWidth; heightMm = config.customHeight; }

  const getDayLabel = (date: Date, totalCols: number) => {
    if (totalCols > 15) {
      return date.toLocaleString('default', { weekday: 'narrow' });
    } else if (totalCols > 7) {
      return date.toLocaleString('default', { weekday: 'short' });
    } else {
      return date.toLocaleString('default', { weekday: 'long' });
    }
  };

  const renderBlock = (block: LayoutBlock) => {
    switch (block) {
      case 'header':
        if (!config.showTitle && !config.showYear) return null;
        const sameAlign = config.titleAlign === config.yearAlign;
        return (
          <div 
            key="header" 
            className={`flex flex-wrap border-b-2 pb-2 mb-6 shrink-0 items-center ${sameAlign ? getAlignClass(config.titleAlign) : 'justify-between'}`} 
            style={{ 
              borderColor: headerAccentColor,
              height: `${config.headerHeight}px`
            }}
          >
            {config.showTitle && (
              <h2 
                className={`font-bold tracking-tight uppercase ${getFontClass(config.titleFont)} w-auto`} 
                style={{ fontSize: `${config.titleSize}px`, color: config.titleColor, textAlign: config.titleAlign }}
              >
                {monthName}
              </h2>
            )}
            {config.showYear && (
              <span 
                className={`font-light ${getFontClass(config.yearFont)} w-auto`} 
                style={{ fontSize: `${config.yearSize}px`, color: config.yearColor, textAlign: config.yearAlign }}
              >
                {monthConfig.year}
              </span>
            )}
          </div>
        );

      case 'image':
        if (!config.showImages) return null;
        return (
          <div 
            key="image" 
            className="w-full mb-6 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center relative shrink-0 shadow-inner"
            style={{ height: `${config.imageHeight}px` }}
          >
            {monthConfig.image ? (
              <img src={monthConfig.image} alt={monthName} crossOrigin="anonymous" className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-200 italic flex flex-col items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-xs">No image</span></div>
            )}
          </div>
        );

      case 'quote':
        if (!config.showQuotes || !monthConfig.quote) return null;
        return (
          <div 
            key="quote" 
            className={`mb-6 px-6 py-4 shrink-0 border-l-4 rounded-r-lg bg-slate-50/50 flex items-center`} 
            style={{ 
              borderLeftColor: headerAccentColor !== 'transparent' ? themeColor : '#e2e8f0', 
              textAlign: config.quoteAlign,
              height: `${config.quoteHeight}px`,
              justifyContent: config.quoteAlign === 'center' ? 'center' : config.quoteAlign === 'right' ? 'flex-end' : 'flex-start'
            }}
          >
            <span className={`leading-relaxed italic ${getFontClass(config.quoteFont)}`} style={{ fontSize: `${config.quoteSize}px`, color: config.quoteColor }}>
              &ldquo;{monthConfig.quote}&rdquo;
            </span>
          </div>
        );

      case 'grid':
        if (!config.showGrid) return null;

        let columns = 7;
        let cells: { day: number | null; label: string }[] = [];
        
        if (config.gridRows === 0) {
          columns = 7;
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          dayNames.forEach(name => cells.push({ day: null, label: name }));
          for (let i = 0; i < firstDay; i++) cells.push({ day: -1, label: '' });
          for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, label: '' });
        } else {
          columns = Math.ceil(daysInMonth / config.gridRows);
          for (let r = 0; r < config.gridRows; r++) {
            for (let c = 0; c < columns; c++) {
              const dateNum = r * columns + c + 1;
              if (dateNum <= daysInMonth) {
                const date = new Date(monthConfig.year, monthConfig.month, dateNum);
                cells.push({ day: null, label: getDayLabel(date, columns) });
              } else {
                cells.push({ day: -1, label: '' });
              }
            }
            for (let c = 0; c < columns; c++) {
              const dateNum = r * columns + c + 1;
              if (dateNum <= daysInMonth) {
                cells.push({ day: dateNum, label: '' });
              } else {
                cells.push({ day: -1, label: '' });
              }
            }
          }
        }

        const cellBg = config.gridTransparent ? 'transparent' : 'white';
        const labelBg = config.gridTransparent ? 'transparent' : 'rgb(249, 250, 251)';
        const emptyCellBg = config.gridTransparent ? 'transparent' : 'rgba(248, 250, 252, 0.5)';
        const borderColor = config.gridShowLines ? 'rgb(226, 232, 240)' : 'transparent';
        const gridLineColor = config.gridShowLines ? 'rgb(226, 232, 240)' : 'transparent';

        return (
          <div 
            key="grid" 
            className={`mb-6 min-h-0 ${config.gridHeight === 0 ? 'flex-grow' : 'shrink-0'}`}
            style={config.gridHeight !== 0 ? { height: `${config.gridHeight}px` } : {}}
          >
            <div 
              className="grid border overflow-hidden shadow-sm h-full" 
              style={{ 
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: config.gridShowLines ? '1px' : '0',
                backgroundColor: gridLineColor,
                borderColor: borderColor,
                borderRadius: '8px'
              }}
            >
              {cells.map((cell, idx) => {
                const isHeader = cell.day === null && cell.label !== '';
                const isEmpty = cell.day === -1;
                
                if (isHeader) {
                  return (
                    <div 
                      key={idx} 
                      className={`py-1 text-center font-black uppercase tracking-[0.05em] flex items-center justify-center ${getFontClass(config.dayFont)}`} 
                      style={{ 
                        fontSize: `${config.daySize}px`, 
                        color: config.dayColor,
                        backgroundColor: labelBg 
                      }}
                    >
                      {cell.label}
                    </div>
                  );
                }

                if (isEmpty) {
                  return <div key={idx} style={{ backgroundColor: emptyCellBg }} />;
                }

                const dayEvents = cell.day ? monthEvents.filter(e => isSameDay(e.startDate, cell.day!, monthConfig.month, monthConfig.year)) : [];
                
                return (
                  <div 
                    key={idx} 
                    className={`p-1 flex flex-col min-h-[40px] transition-colors`} 
                    style={{ 
                      backgroundColor: cellBg
                    }}
                  >
                    <div 
                      className={`font-bold mb-0.5 leading-none ${getFontClass(config.gridFont)}`} 
                      style={{ 
                        fontSize: `${config.gridSize}px`, 
                        color: config.gridColor,
                        textAlign: config.gridAlign
                      }}
                    >
                      {cell.day}
                    </div>
                    <div className={`overflow-hidden flex-grow ${getFontClass(config.eventFont)}`}>
                      {config.showEvents && dayEvents.slice(0, 2).map((event, eIdx) => {
                        const eventColor = (event as any).calendarColor || config.primaryColor;
                        return (
                          <div key={eIdx} className="leading-tight p-0.5 mb-0.5 rounded truncate border-l-2 font-medium" style={{ backgroundColor: config.showAccent ? `${eventColor}10` : '#f1f5f9', borderLeftColor: config.showAccent ? eventColor : '#cbd5e1', fontSize: `${config.eventSize}px`, color: config.eventColor }}>{event.title}</div>
                        );
                      })}
                      {dayEvents.length > 2 && <div className="text-[7px] text-slate-400 text-center font-bold">+{dayEvents.length - 2}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="pdf-page-container html2pdf__page-break flex flex-col bg-white calendar-page-shadow p-4 sm:p-6 md:p-12" style={{ width: `${widthMm}mm`, height: `${heightMm}mm`, padding: 'clamp(1rem, 3vw, 3rem)', boxSizing: 'border-box' }}>
      {config.layoutOrder.map(block => renderBlock(block))}
      <div className={`mt-auto pt-4 text-center text-[7px] text-slate-300 uppercase tracking-[0.3em] border-t shrink-0 ${getFontClass(config.yearFont)}`}>
        {monthName} {monthConfig.year} &bull; Crafted by CalCraft Studio
      </div>
    </div>
  );
};

export default MonthPage;
