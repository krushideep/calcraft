
import { CalendarEvent } from '../types';

export const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (month: number, year: number) => {
  return new Date(year, month, 1).getDay();
};

export const parseICS = (data: string): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  
  // 1. Unfold lines: ICS lines starting with a space or tab are continuations of the previous line
  const unfolded = data.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  
  let currentEvent: Partial<CalendarEvent> | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Split property name (and params) from value
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const propPart = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1);
    
    // Extract base key (e.g., DTSTART from DTSTART;VALUE=DATE)
    const key = propPart.split(';')[0].toUpperCase();

    if (key === 'BEGIN' && value.toUpperCase() === 'VEVENT') {
      currentEvent = {};
    } else if (key === 'END' && value.toUpperCase() === 'VEVENT') {
      if (currentEvent && currentEvent.title && currentEvent.startDate) {
        events.push(currentEvent as CalendarEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      switch (key) {
        case 'SUMMARY':
          currentEvent.title = value.replace(/\\,/g, ',').replace(/\\n/g, '\n');
          break;
        case 'DTSTART':
          currentEvent.startDate = parseICSDate(value);
          break;
        case 'DTEND':
          currentEvent.endDate = parseICSDate(value);
          break;
        case 'DESCRIPTION':
          currentEvent.description = value.replace(/\\,/g, ',').replace(/\\n/g, '\n');
          break;
      }
    }
  }
  return events;
};

const parseICSDate = (icsDate: string): Date => {
  // Matches YYYYMMDDTHHMMSSZ or YYYYMMDD
  const match = icsDate.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  
  if (!match) {
    // Fallback for cases where value might be wrapped or unusual
    const fallbackMatch = icsDate.match(/(\d{4})(\d{2})(\d{2})/);
    if (fallbackMatch) {
      return new Date(
        parseInt(fallbackMatch[1]),
        parseInt(fallbackMatch[2]) - 1,
        parseInt(fallbackMatch[3])
      );
    }
    return new Date();
  }

  const [, y, m, d, hh, mm, ss, z] = match;
  const year = parseInt(y);
  const month = parseInt(m) - 1;
  const day = parseInt(d);

  if (hh && mm && ss) {
    if (z) {
      // UTC format: Treat as UTC but calendar usually wants "intended wall clock" day
      // Using UTC constructor ensures we get the exact numbers from the string
      return new Date(Date.UTC(year, month, day, parseInt(hh), parseInt(mm), parseInt(ss)));
    } else {
      // Local floating time
      return new Date(year, month, day, parseInt(hh), parseInt(mm), parseInt(ss));
    }
  }
  
  // All-day event (YYYYMMDD)
  return new Date(year, month, day);
};
