import React, { useEffect, useState, useMemo } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { Target, TrendingUp, Brain, Award, Activity, AlertCircle, PlayCircle, Loader2 } from 'lucide-react';

const API_BASE_URL = "http://localhost:8000";

interface AnalyticsData {
  metrics: {
    accuracy: number;
    exams_completed: number;
    questions_solved: number;
    streak: number;
    strongest: string;
    weakest: string;
  };
  topic_data: any[];
  trend_data: any[];
  recommendation: {
    title: string;
    message: string;
    suggestions: string[];
  } | null;
  personality: {
    strength: string;
    struggle: string;
  };
}

export function AnalyticsDashboard({ onStartRevision }: { onStartRevision: (topic: string) => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/analytics/1`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      await fetch(`${API_BASE_URL}/api/analytics/seed`, { method: "POST" });
      await fetchAnalytics();
    } finally {
      setSeeding(false);
    }
  };

  // Memoize chart datasets as requested for performance
  const memoizedTopicData = useMemo(() => data?.topic_data || [], [data]);
  const memoizedTrendData = useMemo(() => data?.trend_data || [], [data]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-amber-500">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center">
        <Brain size={48} className="text-gray-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-300">No Learning Data Found</h2>
        <p className="text-gray-500 mt-2 mb-6">Take some exams or chat with the AI to generate analytics.</p>
        <button 
          onClick={handleSeed}
          disabled={seeding}
          className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-6 py-2 rounded-lg hover:bg-amber-500/30 flex items-center gap-2"
        >
          {seeding ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
          Seed Mock Data (Hackathon)
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Educational Performance</h1>
            <p className="text-gray-400">Track your mastery, identify weak gaps, and adapt your learning.</p>
          </div>
          <button 
            onClick={handleSeed}
            disabled={seeding}
            className="text-xs bg-[#1a1a1a] border border-[#333] text-gray-400 px-3 py-1.5 rounded hover:text-white"
          >
            {seeding ? 'Seeding...' : 'Seed Data'}
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#121212] border border-[#222] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target size={48} className="text-green-500" />
            </div>
            <p className="text-gray-400 text-sm font-medium">Overall Accuracy</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">{data.metrics.accuracy}%</span>
            </div>
          </div>

          <div className="bg-[#121212] border border-[#222] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp size={48} className="text-blue-500" />
            </div>
            <p className="text-gray-400 text-sm font-medium">Current Streak</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">{data.metrics.streak}</span>
              <span className="text-sm text-gray-500">Days</span>
            </div>
          </div>

          <div className="bg-[#121212] border border-[#222] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Award size={48} className="text-amber-500" />
            </div>
            <p className="text-gray-400 text-sm font-medium">Strongest Topic</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-amber-400 truncate max-w-full">{data.metrics.strongest}</span>
            </div>
          </div>

          <div className="bg-[#121212] border border-red-500/20 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <p className="text-red-400/80 text-sm font-medium">Weakest Topic</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xl font-bold text-red-400 truncate pr-2">{data.metrics.weakest}</span>
              {data.metrics.weakest !== "N/A" && (
                <button 
                  onClick={() => onStartRevision(data.metrics.weakest)}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-300 p-1.5 rounded-full transition-colors flex-shrink-0"
                  title="Practice this weak topic"
                >
                  <PlayCircle size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Radar Chart (Intelligent Chapter Breakdown) */}
          <div className="bg-[#121212] border border-[#222] rounded-xl p-6 lg:col-span-1 flex flex-col">
            <h3 className="text-lg font-bold text-gray-200 mb-1">Subject Mastery</h3>
            <p className="text-xs text-gray-500 mb-6">AI-calculated chapter proficiency</p>
            
            <div className="flex-1 w-full min-h-[250px] relative">
              {memoizedTopicData.length > 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={memoizedTopicData}>
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Accuracy"
                      dataKey="A"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.4}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                      itemStyle={{ color: '#f59e0b' }}
                      formatter={(val: number) => [`${val}%`, 'Accuracy']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 text-center px-4">
                  Not enough topic data to map mastery radar. Complete more exams.
                </div>
              )}
            </div>
          </div>

          {/* Area Chart (Historical Trend) */}
          <div className="bg-[#121212] border border-[#222] rounded-xl p-6 lg:col-span-2 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-200 mb-1">Performance Trend</h3>
                <p className="text-xs text-gray-500">Historical accuracy over last 50 exams</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{data.metrics.exams_completed}</p>
                <p className="text-xs text-gray-500">Exams Completed</p>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[250px]">
              {memoizedTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={memoizedTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="name" stroke="#555" tick={{fill: '#777', fontSize: 11}} axisLine={false} tickLine={false} />
                    <YAxis stroke="#555" tick={{fill: '#777', fontSize: 11}} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                      formatter={(val: number) => [`${val}%`, 'Score']}
                    />
                    <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  No historical trend data available.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Row: AI Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Recommendation Card */}
          {data.recommendation ? (
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="text-indigo-400" size={24} />
                <h3 className="text-lg font-bold text-indigo-300">AI Recommendation</h3>
              </div>
              <p className="text-gray-300 font-medium mb-2">{data.recommendation.title}</p>
              <p className="text-gray-400 text-sm mb-5">{data.recommendation.message}</p>
              
              <p className="text-xs text-indigo-400/80 uppercase tracking-wider font-bold mb-3">Suggested Interventions:</p>
              <ul className="space-y-2">
                {data.recommendation.suggestions.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300 bg-[#121212]/50 p-2 rounded-lg border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-[#121212] border border-[#222] rounded-xl p-6 flex items-center justify-center text-center">
              <div>
                <Brain className="text-gray-600 mx-auto mb-3" size={32} />
                <p className="text-gray-400 text-sm">Not enough recent data to form an AI Recommendation.</p>
              </div>
            </div>
          )}

          {/* Learning Personality */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-amber-400" size={24} />
              <h3 className="text-lg font-bold text-amber-300">Learning Personality</h3>
            </div>
            
            <div className="space-y-5">
              <div>
                <p className="text-xs text-green-400/80 uppercase tracking-wider font-bold mb-2">You perform better in:</p>
                <p className="text-gray-300 text-sm bg-green-500/5 p-3 rounded-lg border border-green-500/10">
                  {data.personality.strength}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-red-400/80 uppercase tracking-wider font-bold mb-2">You struggle more with:</p>
                <p className="text-gray-300 text-sm bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                  {data.personality.struggle}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
