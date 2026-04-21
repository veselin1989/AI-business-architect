/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Plus, 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  Settings, 
  LogOut, 
  User as UserIcon,
  ChevronRight,
  Target,
  BarChart3,
  Calendar,
  Clock,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfWeek } from 'date-fns';
import { bg } from 'date-fns/locale';

import { auth, db, googleProvider, testConnection } from './firebase';
import { cn } from './lib/utils';
import { generateWeeklyAudit, WeeklyAuditData } from './services/geminiService';

// --- Types ---
interface TaskInput {
  description: string;
  hours: number;
}

interface AuditRecord extends WeeklyAuditData {
  id: string;
  userId: string;
  startDate: Timestamp | Date;
  createdAt: Timestamp | Date;
}

// --- Components ---

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white border border-[#E5E5E5] rounded-xl shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'development' | 'operational' | 'strategic' | 'highlight' }) => {
  const styles = {
    default: "bg-[#F3F4F6] text-[#6B7280]",
    development: "bg-[#EEF2FF] text-[#4F46E5]",
    operational: "bg-[#FFF7ED] text-[#EA580C]",
    strategic: "bg-[#F0FDF4] text-[#16A34A]",
    highlight: "bg-[#FDF2F8] text-[#DB2777]"
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider", styles[variant])}>
      {children}
    </span>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskInput[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [view, setView] = useState<'dashboard' | 'new-audit'>('dashboard');

  // Input states
  const [currTask, setCurrTask] = useState("");
  const [currHours, setCurrHours] = useState<number>(1);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, `users/${user.uid}/audits`),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuditRecord));
      setAudits(docs);
    });
    return unsubscribe;
  }, [user]);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = () => signOut(auth);

  const addTask = () => {
    if (!currTask.trim()) return;
    setTasks([...tasks, { description: currTask, hours: currHours }]);
    setCurrTask("");
    setCurrHours(1);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleGenerateAudit = async () => {
    if (!user || tasks.length === 0) return;
    setIsGenerating(true);
    try {
      const data = await generateWeeklyAudit(tasks);
      await addDoc(collection(db, `users/${user.uid}/audits`), {
        ...data,
        userId: user.uid,
        startDate: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      setTasks([]);
      setView('dashboard');
    } catch (error) {
      console.error("Audit generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] font-sans">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB] p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-[#111827]">AI Business Architect</h1>
            <p className="text-[#6B7280] text-lg">Максимизирай ефективността. Ускори монетизацията.</p>
          </div>
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-[#E5E5E5] rounded-xl text-[#374151] font-medium hover:bg-[#F9FAFB] transition-colors shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
            Вход с Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E5E5E5] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <Zap className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">AI Architect</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F3F4F6] rounded-full border border-[#E5E5E5]">
              <div className="w-6 h-6 rounded-full overflow-hidden border border-white">
                <img src={user.photoURL || ""} alt={user.displayName || ""} referrerPolicy="no-referrer" />
              </div>
              <span className="text-sm font-medium text-[#374151]">{user.displayName?.split(' ')[0]}</span>
            </div>
            <button onClick={logout} className="p-2 text-[#6B7280] hover:text-indigo-600 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
        {view === 'dashboard' ? (
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">Седмичен Дашборд</h2>
                <p className="text-[#6B7280]">Твоят прогрес към ИИ мащабиране.</p>
              </div>
              <button 
                onClick={() => setView('new-audit')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Нов Седмичен Одит
              </button>
            </div>

            {audits.length === 0 ? (
              <div className="py-20 text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#EEF2FF] text-indigo-600">
                  <BarChart3 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Все още нямаш одити</h3>
                  <p className="text-[#6B7280] max-w-sm mx-auto">Генерирай първия си одит, за да разбереш къде губиш време и как да монетизираш по-бързо.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-12">
                {audits.map((audit, idx) => (
                  <motion.div
                    key={audit.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="p-0 border-2 border-indigo-50 relative overflow-visible">
                      {idx === 0 && (
                        <div className="absolute -top-4 left-6 px-4 py-1.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
                          Последен Бюлетин
                        </div>
                      )}
                      
                      <div className="p-8 space-y-10">
                        {/* Header Stats */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-8 border-b border-[#F3F4F6]">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[#6B7280] font-medium uppercase text-xs tracking-widest">
                              <Calendar className="w-4 h-4" />
                              Одит за седмицата
                            </div>
                            <h3 className="text-2xl font-black">
                              {format(audit.createdAt instanceof Timestamp ? audit.createdAt.toDate() : new Date(audit.createdAt), 'dd MMMM yyyy', { locale: bg })}
                            </h3>
                          </div>
                          
                          <div className="flex gap-6 items-center">
                            <div className="text-right">
                              <div className="text-xs uppercase tracking-widest text-[#6B7280] font-bold mb-1">Efficiency Score</div>
                              <div className={cn(
                                "text-5xl font-black tabular-nums tracking-tighter",
                                audit.efficiencyScore > 70 ? "text-[#16A34A]" : audit.efficiencyScore > 40 ? "text-[#EA580C]" : "text-[#DC2626]"
                              )}>
                                {audit.efficiencyScore}%
                              </div>
                            </div>
                            <div className="h-12 w-px bg-[#E5E5E5] hidden md:block" />
                            <div className="flex flex-col gap-1">
                              <Badge variant="development">Развойна: {audit.classification.development}%</Badge>
                              <Badge variant="strategic">Стратегическа: {audit.classification.strategic}%</Badge>
                              <Badge variant="operational">Оперативна: {audit.classification.operational}%</Badge>
                            </div>
                          </div>
                        </div>

                        {/* Analysis Sections */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                          <div className="space-y-8">
                            <section className="space-y-4">
                              <div className="flex items-center gap-2 font-bold text-indigo-600 uppercase text-xs tracking-widest">
                                <AlertTriangle className="w-4 h-4" />
                                Bottleneck Identification
                              </div>
                              <div className="space-y-3">
                                {audit.bottlenecks.map((b, i) => (
                                  <div key={i} className="group flex gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#EDF2F7] hover:border-indigo-200 transition-all">
                                    <div className="shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">
                                      {i + 1}
                                    </div>
                                    <p className="text-[#334155] leading-relaxed">{b}</p>
                                  </div>
                                ))}
                              </div>
                            </section>

                            <section className="space-y-4">
                              <div className="flex items-center gap-2 font-bold text-indigo-600 uppercase text-xs tracking-widest">
                                <Lightbulb className="w-4 h-4" />
                                Revenue Roadmap (Top 3)
                              </div>
                              <div className="grid gap-4">
                                {audit.revenueRoadmap.map((r, i) => (
                                  <div key={i} className="p-5 bg-white border border-[#E5E5E5] rounded-xl shadow-sm hover:shadow-md transition-all">
                                    <h4 className="font-bold text-[#111827] mb-1 flex items-center gap-2">
                                      <TrendingUp className="w-4 h-4 text-[#16A34A]" />
                                      {r.title}
                                    </h4>
                                    <p className="text-sm text-[#6B7280]">{r.description}</p>
                                  </div>
                                ))}
                              </div>
                            </section>
                          </div>

                          <div className="space-y-8">
                            <section className="space-y-4">
                              <div className="flex items-center gap-2 font-bold text-[#111827] uppercase text-xs tracking-widest">
                                <Clock className="w-4 h-4" />
                                Одит на задачите (AI Audit)
                              </div>
                              <div className="overflow-hidden border border-[#E5E5E5] rounded-xl">
                                <table className="w-full text-left text-sm">
                                  <thead className="bg-[#F9FAFB] border-b border-[#E5E5E5]">
                                    <tr>
                                      <th className="px-4 py-3 font-semibold text-[#374151]">Задача</th>
                                      <th className="px-4 py-3 font-semibold text-[#374151]">Категория</th>
                                      <th className="px-4 py-3 font-semibold text-[#374151] text-right">Часове</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#F3F4F6]">
                                    {audit.tasks.map((t, i) => (
                                      <tr key={i} className="hover:bg-[#F9FAFB] transition-colors">
                                        <td className="px-4 py-4 font-medium text-[#111827]">{t.description}</td>
                                        <td className="px-4 py-4">
                                          <Badge variant={t.category === 'Развойна' ? 'development' : t.category === 'Стратегическа' ? 'strategic' : 'operational'}>
                                            {t.category}
                                          </Badge>
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono text-[#374151]">{t.hours}ч</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </section>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="max-w-3xl mx-auto space-y-10">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('dashboard')}
                className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-[#E5E5E5]"
              >
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
              <h2 className="text-3xl font-black tracking-tight">Нов Седмичен Одит</h2>
            </div>

            <Card className="p-8">
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-[#6B7280]">Описание на задачата</label>
                    <input 
                      type="text" 
                      value={currTask}
                      onChange={(e) => setCurrTask(e.target.value)}
                      placeholder="Напр. Настройка на RAG система за..."
                      className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E5E5] rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-[#6B7280]">Часове</label>
                    <input 
                      type="number" 
                      min="1"
                      value={currHours}
                      onChange={(e) => setCurrHours(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E5E5] rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <button 
                    onClick={addTask}
                    className="h-[50px] px-6 bg-[#374151] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#111827] transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Добави
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-[#6B7280]">Списък за одит ({tasks.length})</h4>
                  <AnimatePresence mode="popLayout">
                    {tasks.map((t, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#EDF2F7] rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center font-bold text-xs text-[#374151]">
                            {i+1}
                          </div>
                          <div>
                            <p className="font-semibold text-[#111827]">{t.description}</p>
                            <p className="text-xs text-[#6B7280] font-mono">{t.hours} часа инвестирани</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeTask(i)}
                          className="p-2 text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                        >
                          <Zap className="w-4 h-4 rotate-180" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {tasks.length === 0 && (
                    <div className="py-12 border-2 border-dashed border-[#E5E5E5] rounded-2xl flex flex-col items-center justify-center text-[#9CA3AF] gap-2">
                      <Target className="w-8 h-8 opacity-20" />
                      <p className="text-sm font-medium italic">Добави задачите си за седмицата...</p>
                    </div>
                  )}
                </div>

                <div className="pt-6">
                  <button
                    disabled={tasks.length === 0 || isGenerating}
                    onClick={handleGenerateAudit}
                    className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-indigo-600 disabled:bg-[#EEF2FF] disabled:text-indigo-300 disabled:cursor-not-allowed text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-[1.01] active:scale-[0.98]"
                  >
                    {isGenerating ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        AI Архитектът анализира...
                      </>
                    ) : (
                      <>
                        <Settings className="w-6 h-6" />
                        Генерирай Седмичен Одит
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
      
      <footer className="max-w-7xl mx-auto p-10 border-t border-[#E5E5E5] text-center">
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#6B7280]">
          © 2026 AI Business Systems Architect • Built for Speed and Scale
        </p>
      </footer>
    </div>
  );
}
