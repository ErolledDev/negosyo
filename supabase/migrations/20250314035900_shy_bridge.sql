/*
  # Add message type column

  1. Changes
    - Add `type` column to messages table with default value 'message'
    - Valid types: 'message', 'welcome', 'quick_question'
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'type'
  ) THEN
    ALTER TABLE messages ADD COLUMN type text NOT NULL DEFAULT 'message';
  END IF;
END $$;