-- Add Idealista-specific fields to conversaciones table
ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS agente_asignado TEXT;
ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS referencia TEXT;
ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS codigo_anuncio TEXT;
ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS idealista_url TEXT;
ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS precio TEXT;
ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS canal TEXT DEFAULT 'whatsapp';

-- Add sent_by to mensajes table
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS sent_by TEXT;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS wa_message_id TEXT;
