import React, { useEffect, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { MessageSquare, Copy, Check, Trash } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface WidgetSettings {
  id: string;
  business_name: string;
  primary_color: string;
  welcome_message: string;
  fallback_message: string;
}

interface QuickQuestion {
  id: string;
  question: string;
  question_order: number;
}

const WidgetSettings = () => {
  const { session } = useAuth();
  const [settings, setSettings] = useState<WidgetSettings>({
    id: '',
    business_name: 'Your Business',
    primary_color: '#3B82F6',
    welcome_message: 'Welcome! How can we help you today?',
    fallback_message: "We're currently away but will respond as soon as possible.",
  });
  const [quickQuestions, setQuickQuestions] = useState<QuickQuestion[]>([]);
  const [isSaving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (session?.user) {
      loadSettings();
      loadQuickQuestions();
    }
  }, [session]);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('widget_settings')
      .select('*')
      .eq('user_id', session?.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading settings:', error);
      return;
    }

    if (data) {
      setSettings(data);
    } else {
      // Create initial settings
      const { data: newSettings, error: createError } = await supabase
        .from('widget_settings')
        .insert([
          {
            user_id: session?.user.id,
            business_name: 'Your Business',
            primary_color: '#3B82F6',
            welcome_message: 'Welcome! How can we help you today?',
            fallback_message: "We're currently away but will respond as soon as possible.",
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error('Error creating settings:', createError);
        return;
      }

      if (newSettings) {
        setSettings(newSettings);
      }
    }
  };

  const loadQuickQuestions = async () => {
    const { data, error } = await supabase
      .from('quick_questions')
      .select('*')
      .order('question_order');

    if (error) {
      console.error('Error loading quick questions:', error);
      return;
    }

    setQuickQuestions(data || []);
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaveStatus('Saving...');

    const { error } = await supabase
      .from('widget_settings')
      .upsert({
        ...settings,
        user_id: session?.user.id,
      });

    if (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('Error saving settings');
    } else {
      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    }

    setSaving(false);
  };

  const handleQuickQuestionChange = async (index: number, value: string) => {
    const updatedQuestions = [...quickQuestions];
    
    if (index >= updatedQuestions.length) {
      // Add new question
      const { error } = await supabase
        .from('quick_questions')
        .insert({
          widget_id: settings.id,
          question: value,
          question_order: index,
        });

      if (error) {
        console.error('Error adding quick question:', error);
        return;
      }
    } else {
      // Update existing question
      const question = updatedQuestions[index];
      const { error } = await supabase
        .from('quick_questions')
        .update({ question: value })
        .eq('id', question.id);

      if (error) {
        console.error('Error updating quick question:', error);
        return;
      }
    }

    loadQuickQuestions();
  };

  const deleteQuickQuestion = async (id: string) => {
    const { error } = await supabase
      .from('quick_questions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting quick question:', error);
      return;
    }

    loadQuickQuestions();
  };

  const copyInstallCode = () => {
    const code = `<script src="https://business-live-chat.netlify.app/chat.js"></script>
<script>
  new BusinessChatPlugin({
    uid: "${settings.id}"
  });
</script>`;
    
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Widget Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <HexColorPicker
                    color={settings.primary_color}
                    onChange={(color) => setSettings({ ...settings, primary_color: color })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={settings.business_name}
                    onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Messages</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Welcome Message
                  </label>
                  <textarea
                    value={settings.welcome_message}
                    onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fallback Message
                  </label>
                  <textarea
                    value={settings.fallback_message}
                    onChange={(e) => setSettings({ ...settings, fallback_message: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Action Questions</h3>
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={quickQuestions[index]?.question || ''}
                      onChange={(e) => handleQuickQuestionChange(index, e.target.value)}
                      placeholder={`Question ${index + 1}`}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                    {quickQuestions[index]?.id && (
                      <button
                        onClick={() => deleteQuickQuestion(quickQuestions[index].id)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={saveSettings}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
              {saveStatus && (
                <span className="text-sm text-gray-600">{saveStatus}</span>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Widget Preview</h3>
              <div
                className="border rounded-lg p-4 shadow-lg"
                style={{ backgroundColor: settings.primary_color }}
              >
                <div className="flex items-center space-x-2 text-white mb-4">
                  <MessageSquare className="h-6 w-6" />
                  <span className="font-medium">{settings.business_name}</span>
                </div>
                <div className="bg-white rounded-lg p-4 space-y-4">
                  <p className="text-gray-800">{settings.welcome_message}</p>
                  <div className="space-y-2">
                    {quickQuestions
                      .filter((q) => q.question.trim() !== '')
                      .map((question, index) => (
                        <button
                          key={index}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          {question.question}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Installation Code</h3>
                <button
                  onClick={copyInstallCode}
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-500"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <pre className="text-sm text-white overflow-x-auto whitespace-pre-wrap">
                  {`<script src="https://business-live-chat.netlify.app/chat.js"></script>
<script>
  new BusinessChatPlugin({
    uid: "${settings.id}"
  });
</script>`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetSettings;