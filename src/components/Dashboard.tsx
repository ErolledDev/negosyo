import React from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Settings, MessageSquare } from 'lucide-react';
import WidgetSettings from './WidgetSettings';
import LiveChat from './LiveChat';

const Dashboard = () => {
  const location = useLocation();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <nav className="w-full md:w-64 bg-white rounded-lg shadow-sm p-2 h-fit">
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              `flex items-center space-x-2 p-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Widget Settings</span>
          </NavLink>
          <NavLink
            to="/dashboard/chat"
            className={({ isActive }) =>
              `flex items-center space-x-2 p-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">Live Chat</span>
          </NavLink>
        </nav>

        <main className="flex-1 min-h-[calc(100vh-12rem)]">
          <Routes>
            <Route path="settings" element={<WidgetSettings key="settings" />} />
            <Route path="chat" element={<LiveChat key="chat" />} />
            <Route path="/" element={<WidgetSettings key="default" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;