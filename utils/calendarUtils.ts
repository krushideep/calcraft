
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
        case 'RRULE':
          // store raw RRULE for later expansion
          (currentEvent as any).rrule = value;
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

// Expand recurring events into instances within a single target year.
export const expandRecurringForYear = (events: CalendarEvent[], targetYear: number): CalendarEvent[] => {
  const expanded: CalendarEvent[] = [];

  for (const ev of events) {
    const anyEv = ev as any;
    if (anyEv.rrule && /FREQ=YEARLY/i.test(anyEv.rrule)) {
      // create an instance for the target year preserving time and all-day nature
      const sd = ev.startDate;
      const ed = ev.endDate;

      // Check if this is an all-day event
      const isAllDay = 
        sd.getUTCHours() === 0 && sd.getUTCMinutes() === 0 && sd.getUTCSeconds() === 0 &&
        (!ed || (ed.getUTCHours() === 0 && ed.getUTCMinutes() === 0 && ed.getUTCSeconds() === 0));

      const newStart = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate(), sd.getUTCHours(), sd.getUTCMinutes(), sd.getUTCSeconds()));
      newStart.setUTCFullYear(targetYear);

      let newEnd: Date | undefined = undefined;
      if (ed && isAllDay) {
        // For all-day events, DTEND is exclusive. If it's exactly one day after DTSTART, don't include it.
        const startDay = new Date(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate()));
        const endDay = new Date(Date.UTC(ed.getUTCFullYear(), ed.getUTCMonth(), ed.getUTCDate()));
        const diffDays = (endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24);
        
        if (diffDays > 1) {
          // Multi-day event: set DTEND to the new year
          newEnd = new Date(Date.UTC(ed.getUTCFullYear(), ed.getUTCMonth(), ed.getUTCDate(), ed.getUTCHours(), ed.getUTCMinutes(), ed.getUTCSeconds()));
          newEnd.setUTCFullYear(targetYear);
        }
        // If diffDays === 1, DTEND is exclusive and represents end-of-day for the same day, so no DTEND needed
      } else if (ed && !isAllDay) {
        // Timed event: preserve DTEND as-is
        newEnd = new Date(Date.UTC(ed.getUTCFullYear(), ed.getUTCMonth(), ed.getUTCDate(), ed.getUTCHours(), ed.getUTCMinutes(), ed.getUTCSeconds()));
        newEnd.setUTCFullYear(targetYear);
      }

      expanded.push({
        title: ev.title,
        startDate: newStart,
        endDate: newEnd,
        description: ev.description
      });
    } else {
      // Non-recurring: keep if it falls in the target year
      if (ev.startDate.getUTCFullYear() === targetYear) expanded.push(ev);
    }
  }

  return expanded;
};

const parseICSDate = (icsDate: string): Date => {
  // Matches YYYYMMDDTHHMMSSZ or YYYYMMDD
  const match = icsDate.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  
  if (!match) {
    // Fallback for cases where value might be wrapped or unusual
    const fallbackMatch = icsDate.match(/(\d{4})(\d{2})(\d{2})/);
    if (fallbackMatch) {
      const year = parseInt(fallbackMatch[1]);
      const month = parseInt(fallbackMatch[2]) - 1;
      const day = parseInt(fallbackMatch[3]);
      // Use UTC for all-day events to avoid timezone shift
      return new Date(Date.UTC(year, month, day));
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
  
  // All-day event (YYYYMMDD) - use UTC to avoid timezone shift
  return new Date(Date.UTC(year, month, day));
};
