
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

  const currentWidth = config.pageSize === 'A4' ? 210 : config.pageSize === 'A5' ? 148 : (config.dimensionUnit === 'in' ? config.customWidth * 25.4 : config.customWidth);
  const currentHeight = config.pageSize === 'A4' ? 297 : config.pageSize === 'A5' ? 210 : (config.dimensionUnit === 'in' ? config.customHeight * 25.4 : config.customHeight);
  const pageScale = currentWidth / 210;

  let containerStyle: React.CSSProperties = {
    width: `${currentWidth}mm`,
    height: `${currentHeight}mm`,
    padding: `${12 * pageScale}mm`,
    boxSizing: 'border-box',
  };

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
              height: `${config.headerHeight * pageScale}px`,
              marginBottom: `${24 * pageScale}px`,
              borderBottomWidth: `${2 * pageScale}px`,
              paddingBottom: `${8 * pageScale}px`
            }}
          >
            {config.showTitle && (
              <h2
                className={`font-bold tracking-tight uppercase ${getFontClass(config.titleFont)} w-auto`}
                style={{ fontSize: `${config.titleSize * pageScale}px`, color: config.titleColor, textAlign: config.titleAlign }}
              >
                {monthName}
              </h2>
            )}
            {config.showYear && (
              <span
                className={`font-light ${getFontClass(config.yearFont)} w-auto`}
                style={{ fontSize: `${config.yearSize * pageScale}px`, color: config.yearColor, textAlign: config.yearAlign }}
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
            style={{
              height: `${config.imageHeight * pageScale}px`,
              marginBottom: `${24 * pageScale}px`,
              borderRadius: `${12 * pageScale}px`
            }}
          >
            {monthConfig.image ? (
              <img src={monthConfig.image} alt={monthName} crossOrigin="anonymous" className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-200 italic flex flex-col items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: `${32 * pageScale}px`, height: `${32 * pageScale}px` }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span style={{ fontSize: `${12 * pageScale}px` }}>No image</span></div>
            )}
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
            style={{
              ...(config.gridHeight !== 0 ? { height: `${config.gridHeight * pageScale}px` } : {}),
              marginBottom: `${24 * pageScale}px`
            }}
          >
            <div
              className="grid border overflow-hidden shadow-sm h-full"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: config.gridShowLines ? '1px' : '0',
                backgroundColor: gridLineColor,
                borderColor: borderColor,
                borderRadius: `${8 * pageScale}px`
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
                        fontSize: `${config.daySize * pageScale}px`,
                        color: config.dayColor,
                        backgroundColor: labelBg,
                        paddingTop: `${4 * pageScale}px`,
                        paddingBottom: `${4 * pageScale}px`
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
                    className={`flex flex-col transition-colors overflow-hidden`}
                    style={{
                      backgroundColor: cellBg,
                      padding: `${4 * pageScale}px`,
                      minHeight: `${40 * pageScale}px`
                    }}
                  >
                    <div
                      className={`font-bold mb-0.5 leading-none ${getFontClass(config.gridFont)}`}
                      style={{
                        fontSize: `${config.gridSize * pageScale}px`,
                        color: config.gridColor,
                        textAlign: config.gridAlign,
                        marginBottom: `${2 * pageScale}px`
                      }}
                    >
                      {cell.day}
                    </div>
                    <div className={`overflow-hidden flex-grow ${getFontClass(config.eventFont)}`} style={{ height: '0', minHeight: '100%' }}>
                      {config.showEvents && dayEvents.slice(0, 2).map((event, eIdx) => {
                        const eventColor = (event as any).calendarColor || config.primaryColor;
                        return (
                          <div key={eIdx} className="leading-tight mb-0.5 rounded whitespace-normal break-words border-l-2 font-medium" style={{ backgroundColor: config.showAccent ? `${eventColor}10` : '#f1f5f9', borderLeftColor: config.showAccent ? eventColor : '#cbd5e1', fontSize: `${config.eventSize * pageScale}px`, color: config.eventColor, padding: `${2 * pageScale}px`, borderLeftWidth: `${2 * pageScale}px` }}>{event.title}</div>
                        );
                      })}
                      {dayEvents.length > 2 && <div className="text-slate-400 text-center font-bold" style={{ fontSize: `${7 * pageScale}px` }}>+{dayEvents.length - 2}</div>}
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
    <div
      className="pdf-page-container flex flex-col bg-white calendar-page-shadow"
      style={containerStyle}
    >
      {config.layoutOrder.map(block => renderBlock(block))}
      <div
        className={`mt-auto text-center uppercase tracking-[0.3em] border-t shrink-0 ${getFontClass(config.yearFont)}`}
        style={{
          fontSize: `${7 * pageScale}px`,
          color: '#cbd5e1',
          paddingTop: `${16 * pageScale}px`,
          borderTopWidth: `${1 * pageScale}px`
        }}
      >
        {monthName} {monthConfig.year} &bull; Crafted by CalCraft Studio
      </div>
    </div>
  );
};

export default MonthPage;
