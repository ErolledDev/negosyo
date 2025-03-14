import React, { useEffect, useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { MessageSquare, Copy, Check, Trash, Plus, Loader2, AlertCircle } from 'lucide-react';
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
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!session?.user) return;

    try {
      const { data: existingSettings, error: fetchError } = await supabase
        .from('widget_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingSettings) {
        setSettings(existingSettings);
      } else {
        const { data: newSettings, error: createError } = await supabase
          .from('widget_settings')
          .insert([
            {
              user_id: session.user.id,
              business_name: 'Your Business',
              primary_color: '#3B82F6',
              welcome_message: 'Welcome! How can we help you today?',
              fallback_message: "We're currently away but will respond as soon as possible.",
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        if (newSettings) setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setSaveStatus({
        type: 'error',
        message: 'Failed to load settings. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const loadQuickQuestions = useCallback(async () => {
    if (!settings.id) return;

    try {
      const { data, error } = await supabase
        .from('quick_questions')
        .select('*')
        .eq('widget_id', settings.id)
        .order('question_order');

      if (error) throw error;
      setQuickQuestions(data || []);
    } catch (error) {
      console.error('Error loading quick questions:', error);
      setSaveStatus({
        type: 'error',
        message: 'Failed to load quick questions. Please try again.',
      });
    }
  }, [settings.id]);

  useEffect(() => {
    if (session?.user) {
      loadSettings();
    }
  }, [session, loadSettings]);

  useEffect(() => {
    if (settings.id) {
      loadQuickQuestions();
    }
  }, [settings.id, loadQuickQuestions]);

  const saveSettings = async () => {
    setSaving(true);
    setSaveStatus({ type: '', message: '' });

    try {
      const { error } = await supabase
        .from('widget_settings')
        .upsert({
          ...settings,
          user_id: session?.user.id,
        });

      if (error) throw error;

      setSaveStatus({
        type: 'success',
        message: 'Settings saved successfully!',
      });

      // Reload settings to ensure we have the latest data
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus({
        type: 'error',
        message: 'Failed to save settings. Please try again.',
      });
    } finally {
      setSaving(false);
      setTimeout(() => {
        setSaveStatus({ type: '', message: '' });
      }, 3000);
    }
  };

  const handleQuickQuestionChange = async (index: number, value: string) => {
    const updatedQuestions = [...quickQuestions];
    
    try {
      if (index >= updatedQuestions.length) {
        const { error } = await supabase
          .from('quick_questions')
          .insert({
            widget_id: settings.id,
            question: value,
            question_order: index,
          });

        if (error) throw error;
      } else {
        const question = updatedQuestions[index];
        const { error } = await supabase
          .from('quick_questions')
          .update({ question: value })
          .eq('id', question.id);

        if (error) throw error;
      }

      await loadQuickQuestions();
      setSaveStatus({
        type: 'success',
        message: 'Quick question saved successfully!',
      });
    } catch (error) {
      console.error('Error updating quick question:', error);
      setSaveStatus({
        type: 'error',
        message: 'Failed to save quick question. Please try again.',
      });
    }
  };

  const addQuickQuestion = () => {
    setQuickQuestions([...quickQuestions, { id: '', question: '', question_order: quickQuestions.length }]);
  };

  const deleteQuickQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quick_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadQuickQuestions();
      setSaveStatus({
        type: 'success',
        message: 'Quick question deleted successfully!',
      });
    } catch (error) {
      console.error('Error deleting quick question:', error);
      setSaveStatus({
        type: 'error',
        message: 'Failed to delete quick question. Please try again.',
      });
    }
  };

  const copyInstallCode = () => {
    const code = `<script src="https://business-live-chat.netlify.app/chat.js"></script>
<script>
  window.businessChatConfig = {
    uid: "${settings.id}"
  };
</script>`;
    
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

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
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="w-full h-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      style={{ backgroundColor: settings.primary_color }}
                    />
                    {showColorPicker && (
                      <div className="absolute z-10 mt-2">
                        <div
                          className="fixed inset-0"
                          onClick={() => setShowColorPicker(false)}
                        />
                        <HexColorPicker
                          color={settings.primary_color}
                          onChange={(color) => {
                            setSettings({ ...settings, primary_color: color });
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={settings.business_name}
                    onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-shadow"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-shadow"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-shadow"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Quick Action Questions</h3>
                <button
                  onClick={addQuickQuestion}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-500 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Question</span>
                </button>
              </div>
              <div className="space-y-3">
                {quickQuestions.map((question, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={question.question}
                      onChange={(e) => handleQuickQuestionChange(index, e.target.value)}
                      placeholder={`Question ${index + 1}`}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-shadow"
                    />
                    {question.id && (
                      <button
                        onClick={() => deleteQuickQuestion(question.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
              {saveStatus.message && (
                <div className={`flex items-center space-x-2 text-sm ${
                  saveStatus.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {saveStatus.type === 'error' ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{saveStatus.message}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Widget Preview</h3>
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div
                  className="p-4"
                  style={{ backgroundColor: settings.primary_color }}
                >
                  <div className="flex items-center space-x-2 text-white">
                    <MessageSquare className="h-6 w-6" />
                    <span className="font-medium">{settings.business_name}</span>
                  </div>
                </div>
                <div className="bg-white p-4 space-y-4">
                  <div className="bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100">
                    {settings.welcome_message}
                  </div>
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
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-500 transition-colors"
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
  window.businessChatConfig = {
    uid: "${settings.id}"
  };
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