
export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
  // Optional raw RRULE string (e.g. "FREQ=YEARLY;...")
  rrule?: string;
}

export interface CalendarSource {
  id: string;
  name: string;
  events: CalendarEvent[];
  active: boolean;
  color: string;
}

export type CalendarFont = 'sans' | 'serif-elegant' | 'serif-classic' | 'mono' | 'modern' | 'poppins' | 'merriweather' | 'roboto' | 'georgia' | 'courier' | 'plex-serif' | 'raleway' | 'garamond';
export type PageSize = 'A4' | 'A5' | 'custom';
export type LayoutBlock = 'header' | 'image' | 'grid' | 'quote';
export type Alignment = 'left' | 'center' | 'right';

export interface MonthConfig {
  month: number; // 0-11
  year: number;
  image?: string;
  quote?: string;
}

export interface AppConfig {
  showImages: boolean;
  showEvents: boolean;
  showQuotes: boolean;
  showTitle: boolean;
  showYear: boolean;
  showGrid: boolean;
  showAccent: boolean;
  
  titleFont: CalendarFont;
  titleSize: number;
  titleColor: string;
  titleAlign: Alignment;
  
  yearFont: CalendarFont;
  yearSize: number;
  yearColor: string;
  yearAlign: Alignment;
  
  gridFont: CalendarFont;
  gridSize: number;
  gridColor: string;
  gridAlign: Alignment;
  gridShowLines: boolean;
  gridTransparent: boolean;
  gridRows: number; // 0 for standard (7 cols), 1 for linear (1 row), N for forced N rows

  dayFont: CalendarFont;
  daySize: number;
  dayColor: string;

  eventFont: CalendarFont;
  eventSize: number;
  eventColor: string;
  
  quoteFont: CalendarFont;
  quoteSize: number;
  quoteColor: string;
  quoteAlign: Alignment;

  year: number;
  primaryColor: string;
  pageSize: PageSize;
  customWidth: number;
  customHeight: number;
  layoutOrder: LayoutBlock[];

  // Block Sizing
  headerHeight: number;
  imageHeight: number;
  quoteHeight: number;
  gridHeight: number; // 0 means auto/flex-grow
}
