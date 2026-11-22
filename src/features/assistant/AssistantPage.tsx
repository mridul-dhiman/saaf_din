import React, { useState, useEffect, useRef } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { currentForecastProvider } from '../../services/forecast';
import { HourlyForecast, ActionType } from '../../types';
import { findBestAndWorstWindows } from '../../lib/aqi';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { app } from '../../services/firebase';
import { computeActionImpact, ActionImpactResult } from '../../lib/impact';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  recommendedAction?: {
    type: ActionType;
    title: string;
    start: string;
    end: string;
    memberId: string | null;
    impact: ActionImpactResult;
  };
}

export const AssistantPage: React.FC = () => {
  const { profile } = useProfile();
  const [forecast, setForecast] = useState<HourlyForecast | null>(null);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your clean air assistant. Based on today's forecast for ${profile.location.name}, how can I help protect your household?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentForecastProvider.getHourly(profile.location.lat, profile.location.lon)
      .then((f) => setForecast(f))
      .catch((e) => console.warn(e));
  }, [profile.location.lat, profile.location.lon]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const windowsResult = forecast
    ? findBestAndWorstWindows(forecast.points)
    : { bestWindow: null, worstWindow: null, canVentilateToday: false, advisory: '' };

  // Profile-grounded suggested queries
  const child = profile.members.find((m) => m.ageGroup === 'child');
  const elderly = profile.members.find((m) => m.ageGroup === 'elderly');

  const suggestedQuestions = [
    'When is the best window to ventilate today?',
    child ? `Should ${child.name} wear an N95 mask to school?` : 'When should I wear an N95 mask outdoors?',
    elderly ? `Is it safe for ${elderly.name} to walk outside today?` : 'How much exposure do I avoid by staying indoors?',
    'What is the impact of taking the Metro instead of driving?',
  ];

  const handleSend = async (userText: string) => {
    const textToSend = userText.trim();
    if (!textToSend || isSending) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsSending(true);

    try {
      const ai = getAI(app, { backend: new GoogleAIBackend() });
      const model = getGenerativeModel(ai, {
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
        systemInstruction: `You are SaafDin, a helpful air quality assistant for Indian households.
Answer questions grounded in the user's profile and today's atmospheric forecast.
HARD RULES:
1. Keep answers concise (2 to 3 sentences max).
2. DO NOT invent fake sensor readings, vitals, or clinical diagnoses. Refer only to general sensitivities (child, elderly, asthma).
3. If recommending an action that matches an ActionType (wear_mask, ventilate, keep_closed, run_purifier, move_activity_indoors, change_commute_mode), populate recommendedAction.
Output JSON format:
{
  "replyText": "your concise answer in plain language",
  "recommendedAction": {
    "type": "ActionType or null",
    "title": "short imperative title or null",
    "start": "HH:00 or null",
    "end": "HH:00 or null",
    "memberId": "member ID from profile or null"
  }
}`,
      });

      const contextPayload = {
        query: textToSend,
        profile: {
          location: profile.location.name,
          members: profile.members,
          commute: profile.commute,
          hasPurifier: profile.hasPurifier,
        },
        forecast: {
          currentAqi: forecast?.points[0]?.us_aqi,
          currentPm25: forecast?.points[0]?.pm2_5,
          bestWindow: windowsResult.bestWindow,
          worstWindow: windowsResult.worstWindow,
        },
      };

      const response = await model.generateContent(JSON.stringify(contextPayload));
      const resText = response.response.text();
      const parsed = JSON.parse(resText);

      let actionWithImpact = undefined;
      if (parsed.recommendedAction && parsed.recommendedAction.type) {
        const getHourlyPm25 = (hour: number) => {
          const pt = forecast?.points.find((p) => p.hour === hour);
          return pt ? pt.pm2_5 : 120;
        };

        const impact = computeActionImpact(
          {
            id: `chat_rec_${Date.now()}`,
            type: parsed.recommendedAction.type,
            memberId: parsed.recommendedAction.memberId || null,
            start: parsed.recommendedAction.start || '10:00',
            end: parsed.recommendedAction.end || '12:00',
            title: parsed.recommendedAction.title || 'Recommended Action',
            reason: '',
            params: {},
          },
          profile,
          getHourlyPm25
        );

        actionWithImpact = {
          type: parsed.recommendedAction.type,
          title: parsed.recommendedAction.title,
          start: parsed.recommendedAction.start || '10:00',
          end: parsed.recommendedAction.end || '12:00',
          memberId: parsed.recommendedAction.memberId || null,
          impact,
        };
      }

      const botMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        sender: 'assistant',
        text: parsed.replyText || 'I recommend following our daily action plan based on today’s forecast.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedAction: actionWithImpact,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.warn('Gemini chat error, falling back to rule-based response:', err);

      // Intelligent deterministic fallback response
      let fallbackText = `Today in ${profile.location.name}, current US AQI is around ${forecast?.points[0]?.us_aqi || 220}. `;
      if (textToSend.toLowerCase().includes('ventilate') || textToSend.toLowerCase().includes('window')) {
        fallbackText += windowsResult.canVentilateToday
          ? `The safest ventilation window is between ${windowsResult.bestWindow?.startTime} and ${windowsResult.bestWindow?.endTime}.`
          : `Air quality remains above 150 µg/m³ all day, so it is safer to keep windows sealed.`;
      } else if (textToSend.toLowerCase().includes('mask')) {
        fallbackText += `Wearing an N95 respirator reduces inhaled particulate exposure by approximately 70% during outdoor transit.`;
      } else if (textToSend.toLowerCase().includes('metro') || textToSend.toLowerCase().includes('commute')) {
        fallbackText += `Switching from solo driving to Metro rail saves approximately 2.5 kg of direct CO₂ per trip and substantially cuts cabin exposure.`;
      } else {
        fallbackText += `I recommend prioritizing indoor air filtration and shifting outdoor exercise away from morning peak traffic.`;
      }

      const botMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        sender: 'assistant',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-space-md w-full max-w-4xl mx-auto h-[calc(100vh-140px)] min-h-[500px]">
      {/* Header */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[24px]">forum</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold leading-tight">
              Air Assistant
            </h1>
            <span className="font-body-sm text-[12px] text-on-surface-variant">
              Personalized guidance grounded in your family profile &amp; forecast
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-label-sm text-[11px] px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-semibold">
            {profile.location.name}
          </span>
        </div>
      </div>

      {/* Suggested Questions Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {suggestedQuestions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSend(q)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-[12px] font-medium border border-surface-container/60"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Message History Area */}
      <div className="flex-1 overflow-y-auto bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container flex flex-col gap-space-md">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
              msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
            }`}
          >
            <div
              className={`p-3.5 rounded-2xl text-[14px] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-primary text-on-primary rounded-br-xs font-medium'
                  : 'bg-surface-container-low text-on-surface rounded-bl-xs border border-surface-container'
              }`}
            >
              <p>{msg.text}</p>

              {/* Recommended Action Pill with Real Receipt */}
              {msg.recommendedAction && (
                <div className="mt-2.5 pt-2 border-t border-surface-container flex flex-col gap-1.5">
                  <span className="font-label-sm text-[10px] text-secondary font-bold uppercase tracking-wider">
                    Recommended Routine Action
                  </span>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-on-surface text-[13px]">
                      {msg.recommendedAction.title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {msg.recommendedAction.impact.exposureAvoidedUg !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[11px]">
                          Avoids {msg.recommendedAction.impact.exposureAvoidedUg} µg PM2.5
                        </span>
                      )}
                      {msg.recommendedAction.impact.co2SavedKg !== null && (
                        <span className="px-2 py-0.5 rounded-md bg-secondary/15 text-secondary font-bold text-[11px]">
                          Saves {msg.recommendedAction.impact.co2SavedKg} kg CO₂
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <span className="text-[10px] text-outline mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {isSending && (
          <div className="self-start flex items-center gap-2 p-3 rounded-2xl bg-surface-container-low border border-surface-container text-on-surface-variant text-[13px]">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span>Evaluating atmospheric exposure model…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputQuery);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask a question about today's air quality, commute, or family routines…"
          className="flex-1 px-4 py-3 rounded-2xl bg-surface-container-lowest border border-surface-container text-on-surface font-body-md text-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        <button
          type="submit"
          disabled={!inputQuery.trim() || isSending}
          className="px-5 py-3 rounded-2xl bg-primary text-on-primary font-label-md text-label-md font-bold hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          <span>Send</span>
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>

      {/* Non-Medical Disclaimer */}
      <div className="flex items-center justify-center gap-1.5 text-outline text-[11px] text-center">
        <span className="material-symbols-outlined text-[14px]">verified_user</span>
        <span>
          SaafDin provides atmospheric exposure screening. For clinical guidance or medical advice, consult a physician.
        </span>
      </div>
    </div>
  );
};
