import React, { useState, useEffect, useRef } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { currentForecastProvider } from '../../services/forecast';
import { HourlyForecast, ActionType, PlannedAction } from '../../types';
import { findBestAndWorstWindows } from '../../lib/aqi';
import { askAssistant } from '../../services/gemini';
import { computeActionImpact, ActionImpactResult, makePm25Lookup } from '../../lib/impact';

interface RecommendedActionDisplay {
  id: string;
  type: ActionType;
  title: string;
  start: string;
  end: string;
  memberId: string | null;
  impact: ActionImpactResult;
  added?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  recommendedAction?: RecommendedActionDisplay;
}

export const AssistantPage: React.FC = () => {
  const { profile, setProfile } = useProfile();
  const [forecast, setForecast] = useState<HourlyForecast | null>(null);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text: profile.language === 'hi'
        ? `नमस्ते! मैं आपका स्वच्छ वायु सहायक हूँ। ${profile.location.name} के आज के वायु पूर्वानुमान के आधार पर मैं आपकी कैसे मदद कर सकता हूँ?`
        : `Hello! I am your clean air assistant. Based on today's forecast for ${profile.location.name}, how can I help protect your household?`,
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

  const suggestedQuestions = profile.language === 'hi'
    ? [
        'आज खिड़कियाँ खोलने का सबसे अच्छा समय कब है?',
        child ? `क्या ${child.name} को स्कूल के लिए N95 मास्क पहनना चाहिए?` : 'मुझे बाहर N95 मास्क कब पहनना चाहिए?',
        elderly ? `क्या आज ${elderly.name} के लिए बाहर टहलना सुरक्षित है?` : 'घर के अंदर रहकर कितना प्रदूषण बचाया जा सकता है?',
        'कार के बजाय मेट्रो लेने का क्या प्रभाव है?',
      ]
    : [
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
      const reply = await askAssistant(
        textToSend,
        profile,
        forecast,
        windowsResult,
        [] // current plan items
      );

      if (reply) {
        let actionWithImpact: RecommendedActionDisplay | undefined = undefined;
        if (reply.recommendedAction) {
          const getHourlyPm25 = forecast ? makePm25Lookup(forecast.points) : () => null;
          const recAct = reply.recommendedAction;
          const actId = `chat_rec_${Date.now()}`;

          const planned: PlannedAction = {
            id: actId,
            type: recAct.type,
            memberId: recAct.memberId,
            start: recAct.start,
            end: recAct.end,
            title: recAct.title,
            reason: '',
            params: {},
          };

          const impact = computeActionImpact(planned, profile, getHourlyPm25);

          actionWithImpact = {
            id: actId,
            type: recAct.type,
            title: recAct.title,
            start: recAct.start,
            end: recAct.end,
            memberId: recAct.memberId,
            impact,
            added: false,
          };
        }

        const botMsg: ChatMessage = {
          id: `a_${Date.now()}`,
          sender: 'assistant',
          text: reply.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          recommendedAction: actionWithImpact,
        };

        setMessages((prev) => [...prev, botMsg]);
        return;
      }
    } catch (err) {
      console.warn('Gemini chat error, falling back to deterministic response:', err);
    } finally {
      setIsSending(false);
    }

    // Intelligent deterministic fallback response (strictly no invented numbers)
    const currentAqi = forecast?.points[0]?.us_aqi;
    let fallbackText = currentAqi != null
      ? (profile.language === 'hi'
          ? `आज ${profile.location.name} में US AQI लगभग ${currentAqi} है। `
          : `Today in ${profile.location.name}, current US AQI is around ${currentAqi}. `)
      : (profile.language === 'hi' ? `आज ${profile.location.name} में: ` : `Today in ${profile.location.name}: `);

    if (textToSend.toLowerCase().includes('ventilate') || textToSend.toLowerCase().includes('window') || textToSend.includes('खिड़की')) {
      fallbackText += windowsResult.canVentilateToday && windowsResult.bestWindow
        ? (profile.language === 'hi'
            ? `हवादार करने का सबसे सुरक्षित समय ${windowsResult.bestWindow.startTime} से ${windowsResult.bestWindow.endTime} के बीच है।`
            : `The safest ventilation window is between ${windowsResult.bestWindow.startTime} and ${windowsResult.bestWindow.endTime}.`)
        : (profile.language === 'hi'
            ? `बाहरी हवा अत्यधिक प्रदूषित है, इसलिए खिड़कियाँ बंद रखना सुरक्षित है।`
            : `Outdoor air quality remains heavily polluted, so it is safer to keep windows sealed.`);
    } else if (textToSend.toLowerCase().includes('mask') || textToSend.includes('मास्क')) {
      fallbackText += profile.language === 'hi'
        ? `बाहरी यात्रा के दौरान N95 मास्क पहनने से श्वसन सुरक्षा मिलती है।`
        : `Wearing an N95 respirator significantly reduces inhaled particulate exposure during outdoor transit.`;
    } else if (textToSend.toLowerCase().includes('metro') || textToSend.toLowerCase().includes('commute') || textToSend.includes('मेट्रो')) {
      fallbackText += profile.language === 'hi'
        ? `निजी वाहन के बजाय मेट्रो से यात्रा करने से उत्सर्जन कम होता है और स्वच्छ हवा मिलती है।`
        : `Switching from solo driving to Metro rail avoids tailpipe emissions and reduces in-cabin particulate exposure.`;
    } else {
      fallbackText += profile.language === 'hi'
        ? `घर के अंदर वायु निस्पंदन का उपयोग करने और सुबह के व्यस्त समय में बाहरी व्यायाम से बचने की सलाह दी जाती है।`
        : `I recommend prioritizing indoor air filtration and shifting outdoor exercise away from morning peak traffic.`;
    }

    const botMsg: ChatMessage = {
      id: `a_${Date.now()}`,
      sender: 'assistant',
      text: fallbackText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, botMsg]);
  };

  const handleAddToPlan = (msgId: string, action: RecommendedActionDisplay) => {
    // Add to today's plan in localStorage
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const listKey = `saafdin_custom_plan_actions_${dateStr}`;
      const existing = JSON.parse(localStorage.getItem(listKey) || '[]');
      existing.push({
        id: action.id,
        type: action.type,
        title: action.title,
        start: action.start,
        end: action.end,
        memberId: action.memberId,
        impact: action.impact,
      });
      localStorage.setItem(listKey, JSON.stringify(existing));
    } catch (e) {
      console.warn('Failed to add action to plan:', e);
    }

    // Update message state
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId && msg.recommendedAction) {
          return {
            ...msg,
            recommendedAction: {
              ...msg.recommendedAction,
              added: true,
            },
          };
        }
        return msg;
      })
    );
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
              {profile.language === 'hi' ? 'वायु सहायक' : 'Air Assistant'}
            </h1>
            <span className="font-body-sm text-[12px] text-on-surface-variant">
              {profile.language === 'hi'
                ? 'आपके परिवार और वायु पूर्वानुमान पर आधारित व्यक्तिगत मार्गदर्शन'
                : 'Personalized guidance grounded in your family profile & forecast'}
            </span>
          </div>
        </div>

        {/* Right side controls: Location & Language Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProfile({ ...profile, language: profile.language === 'en' ? 'hi' : 'en' })}
            className="px-2.5 py-1 rounded-lg border border-surface-container bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-[11px] font-bold transition-colors cursor-pointer"
            title="Toggle Language"
          >
            {profile.language === 'en' ? 'हिन्दी' : 'English'}
          </button>

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
            className="shrink-0 px-3 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-[12px] font-medium border border-surface-container/60 cursor-pointer"
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
                <div className="mt-2.5 pt-2.5 border-t border-surface-container flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-[10px] text-secondary font-bold uppercase tracking-wider">
                      Recommended Routine Action
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      {msg.recommendedAction.start} – {msg.recommendedAction.end}
                    </span>
                  </div>

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

                  {/* Add to Plan Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={msg.recommendedAction.added}
                      onClick={() => handleAddToPlan(msg.id, msg.recommendedAction!)}
                      className={`px-3 py-1 rounded-lg font-label-sm text-[11px] font-bold flex items-center gap-1 transition-all ${
                        msg.recommendedAction.added
                          ? 'bg-secondary/10 text-secondary cursor-default'
                          : 'bg-primary text-on-primary hover:bg-primary-container cursor-pointer'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {msg.recommendedAction.added ? 'check' : 'add'}
                      </span>
                      <span>
                        {msg.recommendedAction.added
                          ? (profile.language === 'hi' ? 'दैनिक योजना में जोड़ा गया ✓' : 'Added to plan ✓')
                          : (profile.language === 'hi' ? 'मेरी योजना में जोड़ें' : 'Add to my plan')}
                      </span>
                    </button>
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
          placeholder={
            profile.language === 'hi'
              ? 'आज की वायु गुणवत्ता, आवागमन या परिवार की दिनचर्या के बारे में पूछें…'
              : "Ask a question about today's air quality, commute, or family routines…"
          }
          className="flex-1 px-4 py-3 rounded-2xl bg-surface-container-lowest border border-surface-container text-on-surface font-body-md text-body-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        <button
          type="submit"
          disabled={!inputQuery.trim() || isSending}
          className="px-5 py-3 rounded-2xl bg-primary text-on-primary font-label-md text-label-md font-bold hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <span>{profile.language === 'hi' ? 'भेजें' : 'Send'}</span>
          <span className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>

      {/* Non-Medical Disclaimer */}
      <div className="flex items-center justify-center gap-1.5 text-outline text-[11px] text-center">
        <span className="material-symbols-outlined text-[14px]">verified_user</span>
        <span>
          {profile.language === 'hi'
            ? 'साफदिन वायुमंडलीय जोखिम मूल्यांकन प्रदान करता है। नैदानिक मार्गदर्शन के लिए चिकित्सक से परामर्श लें।'
            : 'SaafDin provides atmospheric exposure screening. For clinical guidance or medical advice, consult a physician.'}
        </span>
      </div>
    </div>
  );
};
