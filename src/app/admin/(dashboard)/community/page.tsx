import PromptEditor from "@/components/PromptEditor";
import { getAdminCommunityData } from "@/lib/admin-data";
import { Hash, MessageCircle, MessagesSquare, Shield } from "lucide-react";
import MessageModeration from "./MessageModeration";

async function getCommunityData() {
  return getAdminCommunityData();
}

export default async function CommunityPage() {
  const { rooms, recentMessages, totalMessages } = await getCommunityData();
  const todayMessages = recentMessages.filter((m) => {
    if (!m.created_at) return false;
    const d = new Date(m.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Community
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Monitor conversations and moderate content across all rooms
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">
                Total Messages
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                {totalMessages}
              </p>
            </div>
            <div className="p-2 bg-blue-900/30 rounded-lg">
              <MessagesSquare size={18} className="text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Active Rooms</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {rooms.filter((r) => r.messageCount > 0).length}
              </p>
            </div>
            <div className="p-2 bg-green-900/30 rounded-lg">
              <Hash size={18} className="text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Today</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">
                {todayMessages}
              </p>
            </div>
            <div className="p-2 bg-purple-900/30 rounded-lg">
              <MessageCircle size={18} className="text-purple-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Rooms</p>
              <p className="text-2xl font-bold text-orange-400 mt-1">
                {rooms.length}
              </p>
            </div>
            <div className="p-2 bg-orange-900/30 rounded-lg">
              <Shield size={18} className="text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Rooms Overview */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-white mb-3">
          Rooms Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5 hover:border-gray-700 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${room.messageCount > 0 ? "bg-green-400" : "bg-gray-600"}`}
                  />
                  <h3 className="text-sm sm:text-base font-semibold text-white">
                    {room.name}
                  </h3>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    room.type === "global"
                      ? "bg-blue-900/30 text-blue-400 border border-blue-800/50"
                      : "bg-purple-900/30 text-purple-400 border border-purple-800/50"
                  }`}
                >
                  {room.type}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">
                    {room.messageCount}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">messages</p>
                </div>
                {room.daily_prompt && (
                  <div className="text-right max-w-[60%]">
                    <p className="text-[10px] text-gray-500 mb-0.5">
                      Current prompt
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {room.daily_prompt}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
          {rooms.length === 0 && (
            <div className="col-span-full bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
              No forums found. Run the forum seed migration first.
            </div>
          )}
        </div>
      </div>

      {/* Daily Chat Prompt Editors */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
          Daily Chat Prompts
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Set today&apos;s conversation prompt for each room. Changes reflect in
          the app in real time. Maximum 280 characters per prompt.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <PromptEditor
              key={room.id}
              roomId={room.room_id}
              roomName={room.name}
              roomType={room.type}
              currentPrompt={room.daily_prompt}
              currentAuthor={room.daily_prompt_author}
              currentUpdatedAt={room.daily_prompt_updated_at}
            />
          ))}
          {rooms.length === 0 && (
            <div className="col-span-full bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
              No forums found. Run the forum seed migration first.
            </div>
          )}
        </div>
      </div>

      {/* Recent Messages with Moderation */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">
              Recent Messages
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Click any message to moderate — delete, ban from chat, or ban from
              platform
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-gray-800 text-gray-400 rounded-full">
            {recentMessages.length} shown
          </span>
        </div>
        <MessageModeration messages={recentMessages} />
      </div>
    </div>
  );
}
