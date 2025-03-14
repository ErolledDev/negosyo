/*
  # Chat Functionality Improvements

  1. Changes
    - Add indexes for better query performance
    - Add trigger for conversation updates
    - Add function to handle message notifications
    - Add column for message status tracking

  2. Security
    - Maintain existing RLS policies
*/

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at 
  ON messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_conversations_widget_created_at 
  ON conversations(widget_id, created_at);

-- Add status column to messages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'status'
  ) THEN
    ALTER TABLE messages ADD COLUMN status text NOT NULL DEFAULT 'sent';
  END IF;
END $$;

-- Create function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for conversation updates
DROP TRIGGER IF EXISTS update_conversation_on_message ON messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Add function to handle unread messages count
CREATE OR REPLACE FUNCTION get_unread_count(conversation_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM messages
    WHERE conversation_id = conversation_uuid
    AND is_from_visitor = true
    AND read = false
  );
END;
$$ LANGUAGE plpgsql;