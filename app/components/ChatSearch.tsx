'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Users, 
  TrendingUp, 
  Brain,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Zap,
  Search,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { chatSearchCandidates, compareCandidates } from '../lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  query_type?: string;
  candidates?: any[];
  comparison?: any;
  insights?: string[];
  suggestions?: string[];
  follow_up_questions?: string[];
  total_found?: number;
  filters_applied?: any;
  market_data?: any;
}

interface ChatSearchProps {
  onCandidatesFound?: (candidates: any[]) => void;
  onComparisonGenerated?: (comparison: any) => void;
}

export default function ChatSearch({ onCandidatesFound, onComparisonGenerated }: ChatSearchProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Hi! I'm your AI recruitment assistant. I can help you:

• **Find candidates**: "Show me Python developers with 3+ years"
• **Compare candidates**: "Compare my top 3 candidates" 
• **Market analysis**: "What skills are most in demand?"
• **Get insights**: "Analyze the React developer market"

Just ask me naturally - what would you like to know?`,
      timestamp: new Date(),
      suggestions: [
        "Find Python developers with 3+ years",
        "Compare my top candidates",
        "What skills are most common?",
        "Show me senior React engineers"
      ],
      follow_up_questions: [
        "What type of role are you hiring for?",
        "Do you have specific skill requirements?",
        "Would you like to see all available candidates?"
      ]
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Chat search mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const context = {
        conversation_id: 'chat-session-' + Date.now(),
        timestamp: new Date().toISOString()
      };

      return await chatSearchCandidates(message, conversationHistory, context);
    },
    onSuccess: (response) => {
      const aiResponse: ChatMessage = {
        id: 'msg-' + Date.now(),
        role: 'assistant',
        content: response.ai_response || 'I processed your request successfully.',
        timestamp: new Date(),
        query_type: response.query_type,
        candidates: response.candidates || [],
        comparison: response.comparison,
        insights: response.insights || [],
        suggestions: response.suggestions || [],
        follow_up_questions: response.follow_up_questions || [],
        total_found: response.total_found,
        filters_applied: response.filters_applied,
        market_data: response.market_data
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);

      // Trigger callbacks
      if (response.candidates && response.candidates.length > 0) {
        onCandidatesFound?.(response.candidates);
      }
      if (response.comparison) {
        onComparisonGenerated?.(response.comparison);
      }
    },
    onError: (error: any) => {
      console.error('Chat search error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorContent = 'I apologize, but I encountered an error processing your request. ';
      
      if (error.response?.status === 413) {
        errorContent += 'The response was too large. Try asking for fewer candidates or a more specific query.';
      } else if (error.response?.status === 500) {
        errorContent += 'There was a server error. Please try again in a moment.';
      } else if (error.response?.status === 429) {
        errorContent += 'Too many requests. Please wait a moment before trying again.';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorContent += 'Please check your internet connection and try again.';
      } else {
        errorContent += 'Please try rephrasing your question or contact support if the issue persists.';
      }
      
      const errorMessage: ChatMessage = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  });

  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim() || chatMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Send to AI
    chatMutation.mutate(inputMessage.trim());
  }, [inputMessage, chatMutation]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputMessage(suggestion);
    setTimeout(() => {
      const userMessage: ChatMessage = {
        id: 'user-' + Date.now(),
        role: 'user',
        content: suggestion,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
      chatMutation.mutate(suggestion);
    }, 100);
  }, [chatMutation]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const regenerateResponse = useCallback((messageContent: string) => {
    setIsTyping(true);
    chatMutation.mutate(messageContent);
  }, [chatMutation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Brain className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              AI Recruitment Assistant
            </h2>
            <p className="text-sm text-gray-600">Ask me anything about your candidates</p>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-4xl ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              {/* Message Bubble */}
              <div className={`flex items-start space-x-3 ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-purple-100 text-purple-600'
                }`}>
                  {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Content */}
                <div className={`rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>

                  {/* Message Actions */}
                  {message.role === 'assistant' && (
                    <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                      <button
                        onClick={() => regenerateResponse(messages[messages.indexOf(message) - 1]?.content || '')}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced Information Cards */}
              {message.role === 'assistant' && (
                <div className="mt-3 space-y-3">
                  {/* Candidates Found */}
                  {message.candidates && message.candidates.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-blue-900">
                          Found {message.total_found || message.candidates.length} Candidates
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {message.candidates.slice(0, 3).map((candidate, idx) => (
                          <div key={idx} className="bg-white rounded p-3 border border-blue-100">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {candidate.name || candidate.filename}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {candidate.experience_years || 0} years experience
                                </p>
                                {candidate.top_skills && candidate.top_skills.length > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Skills: {candidate.top_skills.join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-blue-600">
                                  Score: {Math.round(candidate.total_score || 0)}
                                </div>
                                <div className={`text-xs px-2 py-1 rounded ${
                                  candidate.risk_level === 'low' ? 'bg-green-100 text-green-800' :
                                  candidate.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {candidate.risk_level || 'unknown'} risk
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {message.candidates.length > 3 && (
                        <p className="text-sm text-blue-600 mt-2">
                          + {message.candidates.length - 3} more candidates
                        </p>
                      )}
                    </div>
                  )}

                  {/* Comparison Results */}
                  {message.comparison && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-900">Candidate Comparison</span>
                      </div>
                      {message.comparison.ranking && (
                        <div className="space-y-2">
                          {message.comparison.ranking.slice(0, 3).map((candidate: any, idx: number) => (
                            <div key={idx} className="bg-white rounded p-3 border border-green-100">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-medium text-gray-900">
                                    #{candidate.rank} {candidate.candidate_name}
                                  </span>
                                  <p className="text-sm text-gray-600">
                                    {candidate.recommendation}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-green-600">
                                    {candidate.overall_score}/100
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Market Data */}
                  {message.market_data && (
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-purple-900">Market Analysis</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-sm font-medium text-purple-900 mb-2">Top Skills</h5>
                          <div className="space-y-1">
                            {Object.entries(message.market_data.skill_distribution || {}).slice(0, 3).map(([skill, count]: [string, any]) => (
                              <div key={skill} className="flex justify-between text-sm">
                                <span className="text-gray-700">{skill}</span>
                                <span className="text-purple-600">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-purple-900 mb-2">Experience Levels</h5>
                          <div className="space-y-1">
                            {Object.entries(message.market_data.experience_distribution || {}).map(([level, count]: [string, any]) => (
                              <div key={level} className="flex justify-between text-sm">
                                <span className="text-gray-700">{level}</span>
                                <span className="text-purple-600">{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Insights */}
                  {message.insights && message.insights.length > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-yellow-600" />
                        <span className="font-medium text-yellow-900">Key Insights</span>
                      </div>
                      <ul className="space-y-1">
                        {message.insights.map((insight, idx) => (
                          <li key={idx} className="text-sm text-yellow-800 flex items-start gap-2">
                            <span className="text-yellow-600 mt-1">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick Actions/Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Follow-up Questions */}
                  {message.follow_up_questions && message.follow_up_questions.length > 0 && (
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-sm text-gray-600 mb-2">You might also ask:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.follow_up_questions.map((question, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(question)}
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm rounded-full transition-colors border border-blue-200"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className={`text-xs text-gray-500 mt-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about candidates... (e.g., 'Find Python developers' or 'Compare my top 3 candidates')"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
              disabled={chatMutation.isPending}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Sparkles className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || chatMutation.isPending}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {chatMutation.isPending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </button>
        </div>

        {/* Quick Start Suggestions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Quick start:
          </span>
          {[
            "Find Python developers",
            "Compare top candidates", 
            "What skills are common?",
            "Show me senior engineers"
          ].map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs rounded transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 