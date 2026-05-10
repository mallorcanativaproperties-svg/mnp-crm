-- Mallorca Nativa Properties CRM - Database Schema
-- Run this in Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nombre TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agente',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default users
INSERT INTO users (username, password, nombre, role) VALUES
('director', 'mnp2026', 'Silvia Lopez', 'director'),
('carlos', 'carlos2026', 'Carlos M.', 'agente'),
('ana', 'ana2026', 'Ana R.', 'agente'),
('suren', 'suren2026', 'Suren', 'agente'),
('anabel', 'anabel2026', 'Anabel', 'agente'),
('jaime', 'jaime2026', 'Jaime', 'agente'),
('guim', 'guim2026', 'Guim', 'agente');

-- Properties table
CREATE TABLE IF NOT EXISTS propiedades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref TEXT UNIQUE,
  tipo TEXT,
  op TEXT DEFAULT 'Compraventa',
  titulo TEXT,
  dir TEXT,
  num TEXT,
  cp TEXT,
  municipio TEXT,
  zona TEXT,
  orient TEXT,
  dist_playa TEXT,
  vis_dir TEXT DEFAULT 'Direccion exacta',
  precio_venta NUMERIC,
  precio_prop NUMERIC,
  precio_ant NUMERIC,
  precio_traspaso NUMERIC,
  honorarios_tipo TEXT DEFAULT 'porcentaje',
  honorarios NUMERIC,
  iva_hon NUMERIC DEFAULT 21,
  cert_energ TEXT,
  conserv TEXT,
  ano_construc TEXT,
  m_util NUMERIC,
  m_const NUMERIC,
  m_parcela NUMERIC,
  m_terraza NUMERIC,
  m_balcon NUMERIC,
  m_porche NUMERIC,
  hab_dobles INTEGER DEFAULT 0,
  hab_simples INTEGER DEFAULT 0,
  banos INTEGER DEFAULT 0,
  aseos INTEGER DEFAULT 0,
  planta TEXT,
  parking TEXT,
  n_plazas INTEGER DEFAULT 0,
  suelos TEXT,
  carp_ext TEXT,
  carp_int TEXT,
  persianas_tipo TEXT,
  persianas_mat TEXT,
  clima TEXT,
  agua_cal TEXT,
  suministros TEXT[],
  drenaje TEXT,
  elec_reformada BOOLEAN DEFAULT false,
  font_reformada BOOLEAN DEFAULT false,
  venta_mobiliario BOOLEAN DEFAULT false,
  iee TEXT,
  calidades TEXT[],
  ibi NUMERIC,
  basuras NUMERIC,
  comunidad NUMERIC,
  extra_comunidad NUMERIC,
  otros_gastos TEXT,
  desc_texto TEXT,
  notas_priv TEXT,
  prop_nombre TEXT,
  prop_tel TEXT,
  prop_email TEXT,
  agente TEXT,
  estado TEXT DEFAULT 'captada',
  destinos TEXT[],
  fotos INTEGER DEFAULT 0,
  videos INTEGER DEFAULT 0,
  tour360 BOOLEAN DEFAULT false,
  planos INTEGER DEFAULT 0,
  fecha_cap TEXT,
  visitas INTEGER DEFAULT 0,
  cual_pos TEXT[],
  cual_neg TEXT[],
  cual_mejoras TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Buyers table
CREATE TABLE IF NOT EXISTS compradores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT,
  telefono TEXT,
  email TEXT,
  presupuesto NUMERIC,
  zona_deseada TEXT[],
  zona_excluida TEXT[],
  habitaciones TEXT,
  finalidad TEXT,
  financiacion TEXT,
  altura_max TEXT,
  requisitos TEXT,
  origen TEXT,
  estado TEXT DEFAULT 'nuevo',
  scoring INTEGER DEFAULT 0,
  notas TEXT,
  agente_asignado TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations table (for AI agents)
CREATE TABLE IF NOT EXISTS conversaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agente TEXT NOT NULL, -- 'ana' or 'claudia'
  contacto TEXT,
  telefono TEXT,
  estructura TEXT,
  estado TEXT DEFAULT 'en_curso',
  interes TEXT DEFAULT 'tibio',
  objetivo TEXT,
  personalidad TEXT,
  propiedad TEXT,
  enlace TEXT,
  seguimiento DATE,
  alertas TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS mensajes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversacion_id UUID REFERENCES conversaciones(id),
  from_who TEXT NOT NULL,
  texto TEXT NOT NULL,
  timestamp TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Social media posts table
CREATE TABLE IF NOT EXISTS posts_rrss (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT,
  tipo TEXT,
  texto TEXT,
  hashtags TEXT,
  primer_comentario TEXT,
  redes TEXT[],
  estado TEXT DEFAULT 'borrador',
  fecha DATE,
  hora TEXT,
  agente TEXT,
  prop_ref TEXT,
  archivos INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comentarios INTEGER DEFAULT 0,
  compartidos INTEGER DEFAULT 0,
  alcance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activity log
CREATE TABLE IF NOT EXISTS actividad (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT,
  texto TEXT,
  agente TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
