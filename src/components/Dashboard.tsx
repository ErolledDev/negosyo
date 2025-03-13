import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Settings, MessageSquare } from 'lucide-react';
import WidgetSettings from './WidgetSettings';
import LiveChat from './LiveChat';

const Dashboard = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <nav className="w-full md:w-64 space-y-2">
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              `flex items-center space-x-2 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <Settings className="h-5 w-5" />
            <span>Widget Settings</span>
          </NavLink>
          <NavLink
            to="/dashboard/chat"
            className={({ isActive }) =>
              `flex items-center space-x-2 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <MessageSquare className="h-5 w-5" />
            <span>Live Chat</span>
          </NavLink>
        </nav>

        <main className="flex-1">
          <Routes>
            <Route path="settings" element={<WidgetSettings />} />
            <Route path="chat" element={<LiveChat />} />
            <Route path="/" element={<WidgetSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;