import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  MessageSquare, 
  ArrowLeft, 
  Play, 
  Award,
  LogOut,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percent: number;
  unlocked: boolean;
  order_index: number;
  last_position: number;
}

interface LessonSection {
  id: string;
  title: string;
  body: string;
  coach_prompt_text: string;
}

interface PopQuiz {
  id: string;
  question: string;
  answer_options: string[];
  correct_answer: string;
  explanation: string;
}

interface LSATQuestion {
  id: string;
  prompt: string;
  answer_options: string[];
  correct_answer: string;
  explanation: string;
}

// --- Context ---
const AuthContext = createContext<{
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
} | null>(null);

// --- Components ---

const Button = ({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-lg'
  };
  return <button className={cn(variants[variant], className)} {...props} />;
};

const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('premium-card p-6', className)} {...props} />
);

// --- Pages ---

const WelcomeScreen = () => {
  const auth = useContext(AuthContext);
  const [email, setEmail] = useState('student@example.com');

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-white to-slate-100">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 text-center"
      >
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-primary text-white mb-4 shadow-xl">
            <BookOpen size={32} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-brand-primary">Abstraction</h1>
          <p className="text-brand-muted">Premium LSAT Bootcamp for Joshua's Students</p>
        </div>

        <Card className="text-left space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Student Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-accent outline-none transition-all"
              placeholder="Enter your student email"
            />
          </div>
          <Button 
            onClick={() => auth?.login(email)}
            className="w-full py-3 text-lg"
          >
            Enter Bootcamp
          </Button>
        </Card>

        <p className="text-xs text-slate-400">
          By entering, you agree to the terms of Joshua's LSAT Tutoring Program.
        </p>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ onSelectModule }: { onSelectModule: (m: Module) => void }) => {
  const auth = useContext(AuthContext);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/bootcamps/bootcamp_1/modules', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      setModules(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-12 text-center">Loading your path...</div>;

  const completedCount = modules.filter(m => m.status === 'completed').length;
  const progressPercent = Math.round((completedCount / modules.length) * 100);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-12 pb-24">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold">Welcome back, {auth?.user?.name}</h2>
          <p className="text-brand-muted">You've completed {completedCount} of {modules.length} modules.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{auth?.user?.name}</p>
            <p className="text-xs text-brand-muted">Premium Student</p>
          </div>
          <Button variant="ghost" onClick={auth?.logout} className="p-2">
            <LogOut size={20} />
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 flex flex-col justify-between bg-brand-primary text-white border-none">
          <div className="space-y-4">
            <div className="inline-flex p-2 bg-white/10 rounded-lg">
              <Award className="text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold">Current Progress</h3>
            <div className="space-y-2">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-full bg-brand-accent"
                />
              </div>
              <p className="text-sm text-white/60">{progressPercent}% overall completion</p>
            </div>
          </div>
          <Button 
            onClick={() => {
              const nextModule = modules.find(m => m.status !== 'completed' && m.unlocked) || modules[0];
              if (nextModule) onSelectModule(nextModule);
            }}
            className="mt-8 bg-white text-brand-primary hover:bg-white/90 w-fit"
          >
            Resume Learning
          </Button>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-brand-accent">
            <MessageSquare size={32} />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold">Tutor Support</h4>
            <p className="text-sm text-brand-muted">Questions about a lesson? Message Joshua directly.</p>
          </div>
          <Button variant="secondary" className="w-full">Message Tutor</Button>
        </Card>
      </section>

      <section className="space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Play size={20} className="text-brand-accent" />
          Learning Path
        </h3>
        <div className="space-y-4">
          {modules.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <button
                disabled={!m.unlocked}
                onClick={() => onSelectModule(m)}
                className={cn(
                  "w-full text-left premium-card p-6 flex items-center justify-between group transition-all",
                  !m.unlocked && "opacity-50 cursor-not-allowed grayscale",
                  m.unlocked && "hover:border-brand-accent"
                )}
              >
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
                    m.status === 'completed' ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-400"
                  )}>
                    {m.status === 'completed' ? <CheckCircle2 /> : m.order_index}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg group-hover:text-brand-accent transition-colors">{m.title}</h4>
                    <p className="text-sm text-brand-muted">{m.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {!m.unlocked ? (
                    <Lock size={20} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={24} className="text-slate-300 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
                  )}
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

const ModuleReader = ({ module, onBack }: { module: Module, onBack: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showLSAT, setShowLSAT] = useState(false);
  const [coachResponse, setCoachResponse] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    fetch(`/api/modules/${module.id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      setData(data);
      if (data.last_position && data.status !== 'completed') {
        setCurrentSectionIdx(data.last_position);
      }
    });
  }, [module.id]);

  useEffect(() => {
    const handleUnload = () => {
      if (data && !showQuiz && !showLSAT) {
        const status = 'in_progress';
        const progress = Math.round(((currentSectionIdx + 1) / data.sections.length) * 100);
        
        fetch('/api/progress/update', {
          method: 'POST',
          keepalive: true,
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
          },
          body: JSON.stringify({ 
            module_id: module.id, 
            status, 
            progress_percent: progress,
            last_position: currentSectionIdx
          })
        });
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [data, currentSectionIdx, module.id, showQuiz, showLSAT]);

  const saveProgress = (idx: number, isCompleted = false) => {
    const status = isCompleted ? 'completed' : 'in_progress';
    const progress = isCompleted ? 100 : Math.round(((idx + 1) / data.sections.length) * 100);
    
    fetch('/api/progress/update', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({ 
        module_id: module.id, 
        status, 
        progress_percent: progress,
        last_position: idx
      })
    });
  };

  const handleNext = () => {
    if (currentSectionIdx < data.sections.length - 1) {
      const nextIdx = currentSectionIdx + 1;
      setCurrentSectionIdx(nextIdx);
      setCoachResponse(null);
      saveProgress(nextIdx);
    } else if (!showQuiz && data.quizzes.length > 0) {
      setShowQuiz(true);
    } else if (!showLSAT && data.lsatQuestions.length > 0) {
      setShowLSAT(true);
    } else {
      // Complete module
      saveProgress(currentSectionIdx, true);
      onBack();
    }
  };

  const askCoach = async (msg: string) => {
    setIsTyping(true);
    try {
      const prompt = `
        You are "Abstraction Coach", a premium, focused, and encouraging LSAT tutor for Joshua's students.
        Your tone is professional, crisp, and high-end SaaS-like.
        
        CONTEXT:
        Current Lesson: ${data.sections[currentSectionIdx].title}
        Current Content: ${data.sections[currentSectionIdx].body}
        
        RULES:
        1. Stay strictly within the provided lesson content.
        2. Do not invent outside frameworks.
        3. Be concise and motivating.
        4. If the student asks something outside the scope, politely redirect them back to the lesson.
        
        STUDENT MESSAGE: ${msg}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setCoachResponse(response.text || "I'm sorry, I couldn't process that. Let's focus on the lesson content.");
    } catch (error) {
      console.error("AI Coach Error:", error);
      setCoachResponse("I'm having a bit of trouble connecting right now. Let's keep moving through the lesson!");
    }
    setIsTyping(false);
  };

  if (!data) return <div className="p-12 text-center">Preparing your lesson...</div>;

  const currentSection = data.sections[currentSectionIdx];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <nav className="border-bottom border-slate-100 p-4 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-sm z-10">
        <Button variant="ghost" onClick={() => {
          saveProgress(currentSectionIdx);
          onBack();
        }} className="flex items-center gap-2">
          <ArrowLeft size={18} />
          Back to Dashboard
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-muted">Module {module.order_index}</span>
          <span className="font-semibold">{module.title}</span>
        </div>
        <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-brand-accent transition-all duration-500" 
            style={{ width: `${((currentSectionIdx + 1) / data.sections.length) * 100}%` }}
          />
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8 p-6 lg:p-12">
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            {!showQuiz && !showLSAT ? (
              <motion.div
                key={`section-${currentSectionIdx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <h1 className="text-4xl font-bold tracking-tight text-brand-primary leading-tight">
                  {currentSection.title}
                </h1>
                <div className="prose prose-slate lg:prose-lg max-w-none font-serif text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {currentSection.body}
                </div>
              </motion.div>
            ) : showQuiz ? (
              <motion.div
                key="quiz-section"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-brand-accent text-xs font-bold uppercase tracking-wider">
                  Checkpoint Quiz
                </div>
                <h2 className="text-3xl font-bold">{data.quizzes[0].question}</h2>
                <div className="grid gap-3">
                  {JSON.parse(data.quizzes[0].answer_options).map((opt: string) => (
                    <button 
                      key={opt}
                      className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-brand-accent hover:bg-blue-50/50 transition-all font-medium"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="lsat-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold uppercase tracking-wider">
                  LSAT Practice
                </div>
                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 font-serif text-lg leading-relaxed italic">
                  {data.lsatQuestions[0].prompt}
                </div>
                <div className="grid gap-3">
                  {JSON.parse(data.lsatQuestions[0].answer_options).map((opt: string) => (
                    <button 
                      key={opt}
                      className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-brand-accent transition-all"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-12 flex justify-end">
            <Button onClick={handleNext} className="flex items-center gap-2 px-8 py-4 text-lg">
              {currentSectionIdx < data.sections.length - 1 ? 'Continue' : showQuiz ? 'Submit Quiz' : showLSAT ? 'Finish Module' : 'Start Quiz'}
              <ChevronRight size={20} />
            </Button>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="glass-panel p-6 space-y-4 sticky top-24">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white">
                <Sparkles size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm">AI Coach</h4>
                <p className="text-[10px] uppercase tracking-widest text-brand-muted">Always Active</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed border border-slate-100 italic">
              "{coachResponse || currentSection.coach_prompt_text}"
              {isTyping && <span className="animate-pulse ml-1">...</span>}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">Ask the coach about this section:</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Type a question..."
                  className="flex-1 text-xs p-2 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-brand-accent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      askCoach((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password' })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentModule(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <AnimatePresence mode="wait">
        {!user ? (
          <WelcomeScreen key="welcome" />
        ) : currentModule ? (
          <div key="reader">
            <ModuleReader 
              module={currentModule} 
              onBack={() => setCurrentModule(null)} 
            />
          </div>
        ) : (
          <div key="dashboard">
            <Dashboard 
              onSelectModule={setCurrentModule} 
            />
          </div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}
