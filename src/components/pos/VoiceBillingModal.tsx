'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  Edit3,
  Undo2,
  Sparkles,
  ShoppingBag,
  CheckSquare,
  Square,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
} from 'lucide-react';
import { Product, ProductAlias, CartItem, BillingMode, VoiceMatchResult } from '@/types';
import { SpeechRecognitionService, SpeechLanguage } from '@/lib/voice/speechRecognitionService';
import { parseMultiVoiceTranscript, parseVoiceTranscript } from '@/lib/voice/languageParser';
import {
  matchProductForVoiceCommand,
  matchMultiVoiceCommands,
  interpretVoiceBillingTranscript,
} from '@/lib/voice/productMatcher';
import { formatINR } from '@/lib/calculations';
import { getProductImageUrl } from '@/lib/db';

interface VoiceBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  aliases: ProductAlias[];
  cart: CartItem[];
  billingMode: BillingMode;
  onApplyVoiceCommand: (result: VoiceMatchResult | VoiceMatchResult[]) => void;
  onUndoLastVoiceAction: () => void;
  canUndo: boolean;
  lastVoiceActionLabel?: string | null;
}

export default function VoiceBillingModal({
  isOpen,
  onClose,
  products,
  aliases,
  cart,
  billingMode,
  onApplyVoiceCommand,
  onUndoLastVoiceAction,
  canUndo,
  lastVoiceActionLabel,
}: VoiceBillingModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<SpeechLanguage>('ta-IN');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [matchResults, setMatchResults] = useState<VoiceMatchResult[]>([]);

  const speechServiceRef = useRef<SpeechRecognitionService | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastProcessedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  // Initialize Speech Service
  useEffect(() => {
    speechServiceRef.current = new SpeechRecognitionService();
    return () => {
      speechServiceRef.current?.abortListening();
    };
  }, []);

  // When modal opens, clear previous state and start continuous listening automatically
  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setInterimText('');
      setErrorMessage(null);
      setMatchResults([]);
      setIsPermissionDenied(false);
      setIsEditingTranscript(false);
      lastProcessedRef.current = { text: '', time: 0 };

      const timer = setTimeout(() => {
        handleStartListening();
      }, 200);
      return () => clearTimeout(timer);
    } else {
      handleStopListening();
    }
  }, [isOpen]);

  const handleStartListening = async () => {
    setErrorMessage(null);
    setIsPermissionDenied(false);

    if (!speechServiceRef.current) return;

    try {
      await speechServiceRef.current.startListening({
        language: selectedLanguage,
        continuous: true, // Keep listening so cashiers can speak multiple products consecutively!
        interimResults: true,
        onInterim: (text) => {
          setInterimText(text);
        },
        onFinal: (finalText) => {
          setTranscript(finalText);
          setInterimText('');

          // Prevent processing duplicate events of identical text within 2 seconds
          const clean = finalText.trim().toLowerCase();
          if (
            clean &&
            clean === lastProcessedRef.current.text &&
            Date.now() - lastProcessedRef.current.time < 2000
          ) {
            return;
          }
          lastProcessedRef.current = { text: clean, time: Date.now() };

          // Parse and match all products by SNO or description
          processSpokenText(finalText);
        },
        onError: (err, isPerm) => {
          setIsListening(false);
          setErrorMessage(err);
          if (isPerm) setIsPermissionDenied(true);
        },
        onStateChange: (state) => {
          setIsListening(state === 'LISTENING');
          setIsProcessing(state === 'PROCESSING');
        },
      });
    } catch (err: any) {
      setErrorMessage('Could not initialize microphone.');
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    speechServiceRef.current?.stopListening();
    setIsListening(false);
  };

  const processSpokenText = (rawText: string) => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Primary: Interprets Tamil S.No. & Quantity pairs (e.g. "ஒன்னு பத்து", "ரெண்டு அஞ்சு")
      // or falls back to multi-product descriptive keywords
      const results = interpretVoiceBillingTranscript(
        rawText,
        products,
        aliases,
        cart,
        billingMode
      );
      setMatchResults(results);
    } catch (err: any) {
      console.error('Error processing voice command:', err);
      setErrorMessage('Failed to interpret speech command.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-run interpretation after manual editing
  const handleManualTranscriptSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (transcript.trim()) {
      setIsEditingTranscript(false);
      processSpokenText(transcript.trim());
    }
  };

  // Toggle selection for an item in multi-product review
  const toggleItemSelection = (id?: string) => {
    if (!id) return;
    setMatchResults((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Remove an item from the pending review list
  const handleRemovePendingItem = (id?: string) => {
    if (!id) return;
    setMatchResults((prev) => prev.filter((item) => item.id !== id));
  };

  // Select a candidate for an ambiguous item
  const handleSelectCandidateForItem = (index: number, candidateProd: Product) => {
    setMatchResults((prev) => {
      const updated = [...prev];
      const target = updated[index];
      const resolved = matchProductForVoiceCommand(
        { ...target.command, productNameQuery: candidateProd.name },
        products,
        aliases,
        cart,
        billingMode
      );
      updated[index] = {
        ...resolved,
        id: target.id,
        selected: true,
      };
      return updated;
    });
  };

  // Filter selected valid matches
  const validSelectedItems = useMemo(() => {
    return matchResults.filter(
      (r) => r.selected !== false && r.status === 'EXACT_MATCH' && r.matchedProduct
    );
  }, [matchResults]);

  // Total calculated line amounts of all selected items
  const totalEstimatedAmount = useMemo(() => {
    return validSelectedItems.reduce((sum, item) => sum + (item.calculatedLineTotal || 0), 0);
  }, [validSelectedItems]);

  const handleConfirmAll = () => {
    if (validSelectedItems.length === 0) {
      // Check if any is an undo request
      const undoItem = matchResults.find((r) => r.status === 'UNDO_REQUEST');
      if (undoItem) {
        onUndoLastVoiceAction();
        onClose();
        return;
      }
      setErrorMessage('Please select or resolve at least one matched product.');
      return;
    }
    onApplyVoiceCommand(validSelectedItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                <span>Voice Billing</span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                  MULTI-PRODUCT
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-300 truncate">
                Continuous speech in English, தமிழ், or Tanglish
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* Language Selector Bar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
            <span className="text-slate-500 text-[10px] sm:text-[11px] px-1.5 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Language:
            </span>
            <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedLanguage('ta-IN');
                  if (isListening) handleStopListening();
                }}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-lg transition text-center ${
                  selectedLanguage === 'ta-IN'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                தமிழ் / Tanglish
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedLanguage('en-IN');
                  if (isListening) handleStopListening();
                }}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 rounded-lg transition text-center ${
                  selectedLanguage === 'en-IN'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Voice Listening Control & Active State */}
          <div className="flex flex-col items-center justify-center p-4 bg-[#F5F6F8] rounded-2xl border border-slate-200 text-center relative overflow-hidden">
            {/* Pulsing ring animation when active */}
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-24 h-24 rounded-full bg-amber-400/20 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-amber-500/30 animate-pulse" />
              </div>
            )}

            <button
              type="button"
              onClick={isListening ? handleStopListening : handleStartListening}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md relative z-10 ${
                isListening
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-rose-300'
                  : isProcessing
                  ? 'bg-amber-500 text-slate-950 animate-spin shadow-amber-200'
                  : 'bg-[#F59E0B] hover:bg-amber-400 text-slate-950 hover:scale-105 shadow-amber-200'
              }`}
            >
              {isListening ? (
                <MicOff className="w-7 h-7" />
              ) : isProcessing ? (
                <RefreshCw className="w-7 h-7" />
              ) : (
                <Mic className="w-7 h-7" />
              )}
            </button>

            <div className="mt-3 text-xs font-bold text-slate-800">
              {isListening ? (
                <span className="text-amber-800 flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Listening actively... Speak multiple products (e.g. &ldquo;10 bijili and 5 flower pots&rdquo;)
                </span>
              ) : isProcessing ? (
                <span className="text-slate-600">Matching fireworks catalogue...</span>
              ) : matchResults.length > 0 ? (
                <span className="text-emerald-700 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {matchResults.length} product(s) recognized. Click mic to speak more.
                </span>
              ) : (
                <span className="text-slate-600">Click microphone to speak</span>
              )}
            </div>

            {/* Real-time interim speech preview */}
            {isListening && interimText && (
              <div className="mt-2 text-xs font-medium text-slate-600 italic bg-white/80 px-3 py-1 rounded-full border border-slate-200 max-w-full truncate">
                &ldquo;{interimText}&rdquo;
              </div>
            )}
          </div>

          {/* Transcript Preview & Manual Edit Box */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-amber-600" /> Recognized Speech Transcript:
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsEditingTranscript(!isEditingTranscript);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isEditingTranscript ? 'Done Editing' : 'Edit Text'}
              </button>
            </div>

            {isEditingTranscript ? (
              <form onSubmit={handleManualTranscriptSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="e.g. 10 packets red bijili and 5 boxes flower pot"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400"
                >
                  Match
                </button>
              </form>
            ) : (
              <div
                onClick={() => setIsEditingTranscript(true)}
                className="text-xs text-slate-800 font-semibold p-2 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:border-amber-200 transition min-h-[34px] flex items-center justify-between"
              >
                <span className="truncate">
                  {transcript || interimText || 'No speech captured yet. Speak one or more products above.'}
                </span>
                {transcript && <Edit3 className="w-3 h-3 text-slate-400 shrink-0 ml-2" />}
              </div>
            )}
          </div>

          {/* Errors or Permission Warnings */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <div className="font-bold">{errorMessage}</div>
                {isPermissionDenied && (
                  <p className="mt-1 text-[11px] text-rose-700">
                    To use voice billing, click the camera/mic icon in your browser address bar and choose &ldquo;Always allow&rdquo;. You can also continue using the manual search bar.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Multi-Product Review Panel */}
          {matchResults.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-black text-slate-800">
                    Recognized Products ({validSelectedItems.length}/{matchResults.length} Selected)
                  </span>
                </div>
                <div className="text-xs font-black text-slate-900">
                  Total: <span className="text-amber-700">{formatINR(totalEstimatedAmount)}</span>
                </div>
              </div>

              {/* Product Cards List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {matchResults.map((item, idx) => {
                  const isSelected = item.selected !== false;

                  if (item.status === 'EXACT_MATCH' && item.matchedProduct) {
                    const prod = item.matchedProduct;
                    return (
                      <div
                        key={item.id || idx}
                        className={`p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                            : 'bg-slate-50/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Selection Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleItemSelection(item.id)}
                            className="mt-1 text-amber-600 hover:text-amber-700"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          {/* Product Image */}
                          <img
                            src={prod.imageUrl || getProductImageUrl(prod)}
                            alt={prod.name}
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0 bg-white"
                          />

                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                  item.command.action === 'ADD'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.command.action === 'REMOVE'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {item.command.action}
                              </span>
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {prod.name}
                              </span>
                            </div>

                            {prod.tamilName && (
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {prod.tamilName}
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                  item.command.action === 'ADD'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.command.action === 'REMOVE'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {item.command.action}
                              </span>
                              {prod.sno && (
                                <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                  S.No. #{prod.sno}
                                </span>
                              )}
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {prod.name}
                              </span>
                            </div>

                            {prod.tamilName && (
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                {prod.tamilName}
                              </div>
                            )}

                            <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                              <span className="font-bold text-slate-800">
                                Qty: {item.command.quantity} {item.command.unit || prod.uom}
                              </span>
                              <span>Rate: {formatINR(prod.sellingPrice)}</span>
                              <span className="font-bold text-slate-900">
                                Line Total: {formatINR(item.calculatedLineTotal || 0)}
                              </span>
                            </div>

                            {item.errorMessage && (
                              <div className="text-[10px] text-amber-700 font-semibold mt-1">
                                ⚠ {item.errorMessage}
                              </div>
                            )}
                          </div>

                          {/* Right Controls: Stock status & Delete */}
                          <div className="text-right flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                prod.currentStock <= 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : prod.currentStock < item.command.quantity
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              Stock: {prod.currentStock}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePendingItem(item.id)}
                              className="text-slate-400 hover:text-rose-600 transition p-1"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (item.status === 'AMBIGUOUS') {
                    return (
                      <div
                        key={item.id || idx}
                        className="p-3 bg-amber-50/70 rounded-xl border border-amber-300 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                              {item.errorMessage || `Select matching product for "${item.command.productNameQuery}":`}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemovePendingItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {item.candidates && item.candidates.length > 0 && (
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {item.candidates.map((cand) => (
                              <div
                                key={cand.product.id}
                                onClick={() => handleSelectCandidateForItem(idx, cand.product)}
                                className="p-1.5 bg-white rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 cursor-pointer flex items-center justify-between text-xs transition"
                              >
                                <div className="truncate pr-2">
                                  {cand.product.sno && (
                                    <span className="font-mono text-[9px] font-black px-1 py-0.5 rounded bg-amber-100 text-amber-900 mr-1.5">
                                      #{cand.product.sno}
                                    </span>
                                  )}
                                  <span className="font-bold text-slate-800">{cand.product.name}</span>
                                  <span className="text-[10px] text-slate-500 ml-1.5">
                                    ({cand.product.tamilName || cand.product.sku})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-bold text-slate-900">
                                    {formatINR(cand.product.sellingPrice)}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold">
                                    Select
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (item.status === 'NO_MATCH') {
                    return (
                      <div
                        key={item.id || idx}
                        className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-200 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="text-rose-800 font-bold">
                            {item.errorMessage || `No product found for "${item.command.productNameQuery}"`}
                          </div>
                          <div className="text-[10px] text-rose-600 mt-0.5">
                            Speak both S.No. and quantity clearly (e.g. &ldquo;ஒன்னு பத்து&rdquo;) or search manually.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePendingItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          )}

          {/* Spoken Examples Helper */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Tamil S.No. &amp; Quantity Voice Billing (ஒன்னு பத்து):</span>
              </span>
              <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
                1 to {products.length || 206} Available
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
              <div className="p-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                <span>&bull; &ldquo;<strong>ஒன்னு பத்து</strong>&rdquo;</span>
                <span className="font-mono text-amber-800 font-bold">→ S.No. 1, Qty 10</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                <span>&bull; &ldquo;<strong>ரெண்டு அஞ்சு</strong>&rdquo;</span>
                <span className="font-mono text-amber-800 font-bold">→ S.No. 2, Qty 5</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                <span>&bull; &ldquo;<strong>மூணு இருபது</strong>&rdquo;</span>
                <span className="font-mono text-amber-800 font-bold">→ S.No. 3, Qty 20</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                <span>&bull; &ldquo;<strong>ஒன்னு பத்து ரெண்டு அஞ்சு</strong>&rdquo;</span>
                <span className="font-mono text-amber-800 font-bold">→ Multi: S.No 1 (10) &amp; 2 (5)</span>
              </div>
            </div>
            <div className="text-[9px] text-slate-400 italic">
              Also supports English numbers (&ldquo;1 10 2 5&rdquo;), Tanglish (&ldquo;onnu pathu&rdquo;), and product names (&ldquo;10 red bijili&rdquo;).
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Left: Undo last voice action */}
          <div className="w-full sm:w-auto text-center sm:text-left">
            {canUndo ? (
              <button
                type="button"
                onClick={onUndoLastVoiceAction}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Undo Last Voice Action</span>
              </button>
            ) : (
              <div className="text-[10px] text-slate-400 flex items-center justify-center sm:justify-start gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Continuous speech enabled • Confirm before cart update</span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition text-center"
            >
              Cancel
            </button>

            {validSelectedItems.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmAll}
                className="flex-2 sm:flex-initial px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow transition active:scale-[0.99]"
              >
                <Check className="w-4 h-4" />
                <span>
                  Confirm & Add {validSelectedItems.length > 1 ? `(${validSelectedItems.length})` : ''} • {formatINR(totalEstimatedAmount)}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
