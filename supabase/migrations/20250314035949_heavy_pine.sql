/*
  # Add message type enum and constraints

  1. Changes
    - Create enum type for message types
    - Add type column with proper constraints
    - Set default type for existing messages
    - Add check constraint for valid types

  2. Security
    - Maintain existing RLS policies
*/

-- Create enum type for message types
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'message_type'
  ) THEN
    CREATE TYPE message_type AS ENUM ('message', 'welcome', 'quick_question');
  END IF;
END $$;

-- Add type column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'type'
  ) THEN
    -- Add column with temporary text type
    ALTER TABLE messages ADD COLUMN type text;
    
    -- Set default type for existing messages
    UPDATE messages SET type = 'message' WHERE type IS NULL;
    
    -- Make column NOT NULL
    ALTER TABLE messages ALTER COLUMN type SET NOT NULL;
    
    -- Convert column to enum type
    ALTER TABLE messages 
    ALTER COLUMN type TYPE message_type 
    USING type::message_type;
    
    -- Set default for new messages
    ALTER TABLE messages 
    ALTER COLUMN type SET DEFAULT 'message'::message_type;
  END IF;
END $$;