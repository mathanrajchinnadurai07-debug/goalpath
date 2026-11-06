"use client";

import React, { useEffect, useState } from "react";
import {
  Heart,
  Plus,
  Send,
  MessageCircle,
  Mail,
  Copy,
  Calendar,
  Sparkles,
  Users,
  Check,
  ExternalLink,
  X,
  Share2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useApp } from "@/context/AppContext";

export default function GratitudePage() {
  const { user, t } = useApp();

  const [activeTab, setActiveTab] = useState<"directory" | "journal" | "wall">("directory");
  const [supportPeople, setSupportPeople] = useState<any[]>([]);
  const [myEntries, setMyEntries] = useState<any[]>([]);
  const [publicEntries, setPublicEntries] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Support Person Modal
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [personName, setPersonName] = useState("");
  const [relationship, setRelationship] = useState("Mentor");
  const [goalId, setGoalId] = useState("");
  const [howTheyHelped, setHowTheyHelped] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Thank You Generator Modal
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [generatedUrls, setGeneratedUrls] = useState<{ whatsAppUrl?: string; mailtoUrl?: string } | null>(null);

  // Daily Journal Input
  const [journalContent, setJournalContent] = useState("");
  const [isPublicJournal, setIsPublicJournal] = useState(false);

  const fetchAll = async () => {
    try {
      const [peopleRes, journalRes, publicRes, goalsRes] = await Promise.all([
        fetch("/api/v1/gratitude/support-people"),
        fetch("/api/v1/gratitude?filter=my"),
        fetch("/api/v1/gratitude?filter=public"),
        fetch("/api/v1/goals"),
      ]);

      const peopleData = await peopleRes.json();
      const journalData = await journalRes.json();
      const publicData = await publicRes.json();
      const goalsData = await goalsRes.json();

      if (peopleData.people) setSupportPeople(peopleData.people);
      if (journalData.entries) setMyEntries(journalData.entries);
      if (publicData.entries) setPublicEntries(publicData.entries);
      if (goalsData.goals) setGoals(goalsData.goals);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || !howTheyHelped.trim()) return;

    const res = await fetch("/api/v1/gratitude/support-people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: personName.trim(),
        relationship,
        goalId: goalId || null,
        howTheyHelped: howTheyHelped.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      }),
    });

    if (res.ok) {
      setIsPersonModalOpen(false);
      setPersonName("");
      setHowTheyHelped("");
      setPhone("");
      setEmail("");
      fetchAll();
    }
  };

  const openThankYouGenerator = (person: any) => {
    setSelectedPerson(person);
    const template = `Hi ${person.name}, I was reflecting on my progress today and wanted to say a heartfelt thank you. Your guidance regarding ${person.howTheyHelped} made an incredible difference in my journey. Truly grateful for your support!`;
    setThankYouMessage(template);
    setGeneratedUrls(null);
  };

  const handleSendThankYou = async (channel: "WHATSAPP" | "EMAIL" | "MANUAL") => {
    if (!selectedPerson || !thankYouMessage.trim()) return;

    const res = await fetch("/api/v1/gratitude/thank-you-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supportPersonId: selectedPerson.id,
        message: thankYouMessage.trim(),
        channel,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setGeneratedUrls(data);
      confetti({ particleCount: 50, spread: 60 });
      fetchAll();
    }
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalContent.trim()) return;

    const res = await fetch("/api/v1/gratitude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: journalContent.trim(),
        isPublic: isPublicJournal,
      }),
    });

    if (res.ok) {
      setJournalContent("");
      setIsPublicJournal(false);
      confetti({ particleCount: 40, spread: 50 });
      fetchAll();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t.gratitude.title}</h1>
          <p className="text-sm text-muted-foreground">{t.gratitude.subtitle}</p>
        </div>

        <button
          onClick={() => setIsPersonModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.gratitude.addPerson}</span>
        </button>
      </div>

      {/* Monthly Reminder Banner */}
      <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-xs text-foreground flex items-center gap-3">
        <Heart className="w-4 h-4 text-pink-500 fill-pink-500 shrink-0" />
        <span className="font-medium">{t.gratitude.monthlyReminder}</span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("directory")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === "directory" ? "bg-pink-500 text-white shadow-sm" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t.gratitude.supportDirectory} ({supportPeople.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("journal")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === "journal" ? "bg-pink-500 text-white shadow-sm" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>{t.gratitude.dailyJournal} ({myEntries.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("wall")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === "wall" ? "bg-pink-500 text-white shadow-sm" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t.gratitude.gratitudeWall} ({publicEntries.length})</span>
        </button>
      </div>

      {/* Tab: WHO HELPED ME (Support Directory) */}
      {activeTab === "directory" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {supportPeople.map((person) => {
            const hasThanked = !!person.lastThankedAt;
            return (
              <div
                key={person.id}
                className="p-5 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-4 hover:border-pink-500/40 transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500">
                      {person.relationship}
                    </span>
                    {hasThanked && (
                      <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Thanked
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-foreground">{person.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{person.howTheyHelped}</p>

                  {person.goal && (
                    <div className="text-[11px] text-primary font-semibold">Linked: {person.goal.title}</div>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {person.lastThankedAt
                      ? `Thanked ${new Date(person.lastThankedAt).toLocaleDateString()}`
                      : "Not thanked yet"}
                  </span>
                  <button
                    onClick={() => openThankYouGenerator(person)}
                    className="px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500 hover:text-white text-pink-500 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Say Thanks</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: DAILY GRATITUDE JOURNAL */}
      {activeTab === "journal" && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Write Gratitude Entry Card */}
          <form onSubmit={handleSaveJournal} className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-base text-foreground">{t.gratitude.todayPrompt}</h3>
            <textarea
              rows={3}
              required
              value={journalContent}
              onChange={(e) => setJournalContent(e.target.value)}
              placeholder="e.g. Grateful for Alex's architectural guidance that saved days of engineering churn..."
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-input bg-background text-foreground"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublicJournal}
                  onChange={(e) => setIsPublicJournal(e.target.checked)}
                  className="rounded text-pink-500"
                />
                <span>Share anonymously to community Gratitude Wall</span>
              </label>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition"
              >
                Save Entry
              </button>
            </div>
          </form>

          {/* Past entries */}
          <div className="space-y-3">
            {myEntries.map((entry) => (
              <div key={entry.id} className="p-4 rounded-2xl bg-card border border-border text-xs space-y-1">
                <p className="text-foreground leading-relaxed">&ldquo;{entry.content}&rdquo;</p>
                <div className="text-[10px] text-muted-foreground pt-1">
                  {new Date(entry.createdAt).toLocaleDateString()}
                  {entry.isPublic && " • Public on Wall"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: GRATITUDE WALL (Public Feed) */}
      {activeTab === "wall" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {publicEntries.map((entry) => (
            <div key={entry.id} className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center font-bold text-xs uppercase">
                  {entry.user?.name?.slice(0, 2) || "GP"}
                </div>
                <div className="text-xs font-semibold text-foreground">{entry.user?.name || "Community Member"}</div>
              </div>
              <p className="text-xs text-foreground italic leading-relaxed">&ldquo;{entry.content}&rdquo;</p>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border">
                <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1 text-pink-500 font-bold">
                  <Heart className="w-3 h-3 fill-pink-500" /> {entry.likes || 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Thank You Note Generator Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-card p-6 md:p-8 rounded-3xl border border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Thank-You Note for {selectedPerson.name}
                </h3>
                <p className="text-xs text-muted-foreground">Appreciation for {selectedPerson.howTheyHelped}</p>
              </div>
              <button onClick={() => setSelectedPerson(null)} className="p-1 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={4}
              value={thankYouMessage}
              onChange={(e) => setThankYouMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-input bg-background text-foreground"
            />

            {/* Direct Send Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSendThankYou("WHATSAPP")}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendThankYou("EMAIL")}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(thankYouMessage);
                  setCopied(true);
                  handleSendThankYou("MANUAL");
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="py-2.5 px-3 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>{copied ? "Copied!" : "Copy Note"}</span>
              </button>
            </div>

            {/* External Links preview if generated */}
            {generatedUrls && (
              <div className="p-3 bg-secondary/60 rounded-xl space-y-2 text-xs">
                <div className="font-semibold text-foreground flex items-center gap-1 text-emerald-500">
                  <Check className="w-3.5 h-3.5" /> Note recorded! Click below to send immediately:
                </div>
                <div className="flex gap-2">
                  {generatedUrls.whatsAppUrl && (
                    <a
                      href={generatedUrls.whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Open WhatsApp Web</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {generatedUrls.mailtoUrl && (
                    <a
                      href={generatedUrls.mailtoUrl}
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Open Mail Client</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Support Person Modal */}
      {isPersonModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card p-6 rounded-3xl border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Add to Support Network</h3>
              <button onClick={() => setIsPersonModalOpen(false)} className="p-1 rounded hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPerson} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Person Name</label>
                <input
                  type="text"
                  required
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Relationship</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-input bg-background"
                  >
                    <option value="Mentor">Mentor</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Friend">Friend</option>
                    <option value="Family">Family</option>
                    <option value="Coach">Coach</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Linked Goal</label>
                  <select
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-input bg-background"
                  >
                    <option value="">None</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">How did they help you?</label>
                <textarea
                  rows={2}
                  required
                  value={howTheyHelped}
                  onChange={(e) => setHowTheyHelped(e.target.value)}
                  placeholder="e.g. Reviewed architecture and gave invaluable feedback on scaling..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Phone (for WhatsApp)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1-415-555-0199"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@mentor.io"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-input bg-background"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPersonModalOpen(false)}
                  className="w-1/3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold"
                >
                  Save Person
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
