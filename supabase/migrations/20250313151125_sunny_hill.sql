/*
  # Initial Schema Setup for Business Chat Widget

  1. New Tables
    - `widget_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `business_name` (text)
      - `primary_color` (text)
      - `welcome_message` (text)
      - `fallback_message` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `quick_questions`
      - `id` (uuid, primary key)
      - `widget_id` (uuid, references widget_settings)
      - `question` (text)
      - `question_order` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `conversations`
      - `id` (uuid, primary key)
      - `widget_id` (uuid, references widget_settings)
      - `visitor_name` (text)
      - `pinned` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `content` (text)
      - `is_from_visitor` (boolean)
      - `read` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create widget_settings table
CREATE TABLE widget_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  business_name text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '#3B82F6',
  welcome_message text NOT NULL DEFAULT 'Welcome! How can we help you today?',
  fallback_message text NOT NULL DEFAULT 'We''re currently away but will respond as soon as possible.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create quick_questions table
CREATE TABLE quick_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id uuid REFERENCES widget_settings ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  question_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create conversations table
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id uuid REFERENCES widget_settings ON DELETE CASCADE NOT NULL,
  visitor_name text NOT NULL DEFAULT 'Visitor',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_from_visitor boolean NOT NULL DEFAULT true,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for widget_settings
CREATE POLICY "Users can manage their own widget settings"
  ON widget_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for quick_questions
CREATE POLICY "Users can manage their own quick questions"
  ON quick_questions
  USING (
    widget_id IN (
      SELECT id FROM widget_settings WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    widget_id IN (
      SELECT id FROM widget_settings WHERE user_id = auth.uid()
    )
  );

-- Create policies for conversations
CREATE POLICY "Users can manage conversations for their widgets"
  ON conversations
  USING (
    widget_id IN (
      SELECT id FROM widget_settings WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    widget_id IN (
      SELECT id FROM widget_settings WHERE user_id = auth.uid()
    )
  );

-- Create policies for messages
CREATE POLICY "Users can manage messages in their conversations"
  ON messages
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN widget_settings w ON c.widget_id = w.id
      WHERE w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN widget_settings w ON c.widget_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_widget_settings_updated_at
  BEFORE UPDATE ON widget_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quick_questions_updated_at
  BEFORE UPDATE ON quick_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();