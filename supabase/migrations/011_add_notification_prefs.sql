ALTER TABLE profiles ADD COLUMN phone TEXT;
ALTER TABLE profiles ADD COLUMN telegram_chat_id TEXT;
ALTER TABLE profiles ADD COLUMN notify_email BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN notify_telegram BOOLEAN DEFAULT false;
