// Mallorca Nativa Properties — Design Tokens
// Fuente única de verdad para colores, tipografías y espaciados del CRM
// Basado en Brand Guide v3

// ─── COLORES ───────────────────────────────────────────────
export const GOLD        = "#AC8A54";
export const GOLD_L      = "#C8A97E";
export const GOLD_XL     = "#E7D5B8";
export const GOLD_DARK   = "#8C6E3F";
export const NAVY        = "#16294A";
export const NAVY_MID    = "#172040";
export const CREAM       = "#F8F6F1";
export const CREAM_2     = "#F0EBE3";
export const CREAM_3     = "#F4EEE0";
export const CREAM_4     = "#E7E1D4";
export const WHITE       = "#FFFFFF";
export const TEXT        = "#2A2926";
export const TEXT_BROWN  = "#5C4A2A";
export const MUTED       = "#9A968A";
export const BORDER      = "#E7E1D4";
export const CREAM_THUMB = "#F0EDE8";

// Sección grande (bloques colapsables de visita)
export const CREAM_SECTION   = "#F0EAE0";
export const CREAM_SECTION_B = "#E0D9CE";
export const CREAM_NOTE_B    = "#E7D9C0";
export const GOLD_DOC        = "#B4A070";

// Semánticos
export const SUCCESS = "#2C6E52";
export const DANGER  = "#A23A3A";
export const BLUE    = "#185FA5";
export const AMBER   = "#9C6E1B";
export const ORANGE  = "#B05D00";

// ─── TIPOGRAFÍAS ───────────────────────────────────────────
export const FONT_SERIF  = "'Cormorant Garamond', 'Playfair Display', Georgia, serif";
export const FONT_SANS   = "'Inter', system-ui, sans-serif";

// ─── COLORES SEMÁNTICOS DE SECCIÓN ─────────────────────────
// Usados en los bloques de fases dentro de una visita
export const SECTION_BG         = CREAM_SECTION;       // fondo del header de sección
export const SECTION_BORDER     = CREAM_SECTION_B;     // borde exterior de sección
export const SECTION_ACCENT     = GOLD;                // borde izquierdo dorado (3px)
export const SECTION_BODY_BG    = CREAM;               // fondo del cuerpo de sección
export const SECTION_TITLE_COL  = TEXT_BROWN;          // color del título de sección
export const SECTION_ICON_COL   = GOLD;                // color del icono en sección

// ─── TARJETAS ──────────────────────────────────────────────
export const CARD_BG            = WHITE;
export const CARD_BORDER        = BORDER;
export const CARD_RADIUS        = "12px";              // tarjetas de visita (redondeadas)
export const CARD_RADIUS_PROP   = "0px";               // tarjetas de propiedad (editorial)
export const CARD_HOVER_BORDER  = GOLD;
export const CARD_HOVER_BG      = `${GOLD}0A`;       // gold 4% opacity

// ─── AVATAR ────────────────────────────────────────────────
export const AVATAR_BG = `linear-gradient(135deg, ${GOLD}, ${GOLD_L})`;
export const AVATAR_SHADOW = `0 2px 8px ${GOLD}70`;
