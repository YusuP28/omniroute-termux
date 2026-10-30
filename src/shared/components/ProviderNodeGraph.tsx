"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

interface ComboModelEntry {
  model: string;
  weight?: number;
}

interface ComboFromAPI {
  id: string;
  name: string;
  model?: string;
  models: ComboModelEntry[];
  strategy: string;
  isActive: boolean;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  healthCheckEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ComboHealthMetric {
  comboId: string;
  comboName: string;
  strategy: string;
  models: string[];
  quotaHealth: any;
  usageSkew: any;
  performance: {
    avgLatencyMs: number;
    successRate: number;
    totalRequests: number;
  };
}

interface ProviderDisplayInfo {
  id: string;
  name: string;
  textIcon: string;
  color: string;
  emoji: string;
}

interface ProcessedNode {
  provider: string;
  providerName: string;
  textIcon: string;
  emoji: string;
  color: string;
  priority: number;
  weight: number;
  modelName: string;
  modelFullName: string;
  isPrimary: boolean;
}

const PROVIDER_ICONS: Record<string, ProviderDisplayInfo> = {
  openrouter: { id: "openrouter", name: "OpenRouter", textIcon: "OR", color: "#F97316", emoji: "🔀" },
  groq: { id: "groq", name: "Groq", textIcon: "GQ", color: "#F55036", emoji: "⚡" },
  nvidia: { id: "nvidia", name: "NVIDIA NIM", textIcon: "NV", color: "#76B900", emoji: "🟢" },
  anthropic: { id: "anthropic", name: "Anthropic", textIcon: "AN", color: "#D97757", emoji: "🤖" },
  gemini: { id: "gemini", name: "Gemini", textIcon: "GE", color: "#4285F4", emoji: "💎" },
  openai: { id: "openai", name: "OpenAI", textIcon: "OA", color: "#10A37F", emoji: "🧠" },
  deepseek: { id: "deepseek", name: "DeepSeek", textIcon: "DS", color: "#4D6BFE", emoji: "🔍" },
  mistral: { id: "mistral", name: "Mistral", textIcon: "MI", color: "#FF7000", emoji: "🌬️" },
  perplexity: { id: "perplexity", name: "Perplexity", textIcon: "PP", color: "#20808D", emoji: "🔎" },
  together: { id: "together", name: "Together AI", textIcon: "TG", color: "#0F6FFF", emoji: "🤝" },
  fireworks: { id: "fireworks", name: "Fireworks AI", textIcon: "FW", color: "#7B2EF2", emoji: "🎆" },
  cerebras: { id: "cerebras", name: "Cerebras", textIcon: "CB", color: "#FF4F00", emoji: "🧠" },
  cohere: { id: "cohere", name: "Cohere", textIcon: "CO", color: "#39594D", emoji: "🔗" },
  xai: { id: "xai", name: "xAI", textIcon: "XA", color: "#1DA1F2", emoji: "✨" },
  nebius: { id: "nebius", name: "Nebius", textIcon: "NB", color: "#6C5CE7", emoji: "☁️" },
  siliconflow: { id: "siliconflow", name: "SiliconFlow", textIcon: "SF", color: "#00C896", emoji: "⚙️" },
  hyperbolic: { id: "hyperbolic", name: "Hyperbolic", textIcon: "HB", color: "#FF6B35", emoji: "📐" },
  cloudflare: { id: "cloudflare", name: "Cloudflare AI", textIcon: "CF", color: "#F38020", emoji: "☁️" },
  scaleway: { id: "scaleway", name: "Scaleway", textIcon: "SC", color: "#F97316", emoji: "🔧" },
  aimlapi: { id: "aimlapi", name: "AI/ML API", textIcon: "AI", color: "#8B5CF6", emoji: "🤖" },
  pollinations: { id: "pollinations", name: "Pollinations", textIcon: "PN", color: "#EC4899", emoji: "🌸" },
  puter: { id: "puter", name: "Puter", textIcon: "PT", color: "#06B6D4", emoji: "💻" },
  longcat: { id: "longcat", name: "Longcat", textIcon: "LC", color: "#F59E0B", emoji: "🐱" },
  alicode: { id: "alicode", name: "Alibaba", textIcon: "AL", color: "#FF6A00", emoji: "☁️" },
  kimi: { id: "kimi", name: "Kimi", textIcon: "KM", color: "#1E3A8A", emoji: "🌙" },
  minimax: { id: "minimax", name: "Minimax", textIcon: "MM", color: "#7C3AED", emoji: "📏" },
  blackbox: { id: "blackbox", name: "Blackbox AI", textIcon: "BB", color: "#1A1A2E", emoji: "📦" },
  synthetic: { id: "synthetic", name: "Synthetic", textIcon: "SY", color: "#84CC16", emoji: "🧪" },
  kilo: { id: "kilo", name: "Kilo Gateway", textIcon: "KG", color: "#3B82F6", emoji: "⚖️" },
  zai: { id: "zai", name: "Z.AI", textIcon: "ZAI", color: "#10B981", emoji: "🎯" },
  glm: { id: "glm", name: "GLM", textIcon: "GL", color: "#2563EB", emoji: "📝" },
  deepgram: { id: "deepgram", name: "Deepgram", textIcon: "DG", color: "#8B5CF6", emoji: "🎙️" },
  assemblyai: { id: "assemblyai", name: "AssemblyAI", textIcon: "AA", color: "#F97316", emoji: "📝" },
  elevenlabs: { id: "elevenlabs", name: "ElevenLabs", textIcon: "EL", color: "#FFFFFF", emoji: "🗣️" },
  cartesia: { id: "cartesia", name: "Cartesia", textIcon: "CA", color: "#000000", emoji: "🎵" },
  playht: { id: "playht", name: "PlayHT", textIcon: "PH", color: "#FF6B35", emoji: "🔊" },
  inworld: { id: "inworld", name: "Inworld", textIcon: "IW", color: "#6366F1", emoji: "🎭" },
  nanobanana: { id: "nanobanana", name: "NanoBanana", textIcon: "NB", color: "#F59E0B", emoji: "🍌" },
  sdwebui: { id: "sdwebui", name: "SD WebUI", textIcon: "SD", color: "#EC4899", emoji: "🎨" },
  comfyui: { id: "comfyui", name: "ComfyUI", textIcon: "CU", color: "#8B5CF6", emoji: "🎨" },
  ollama: { id: "ollama", name: "Ollama Cloud", textIcon: "OL", color: "#000000", emoji: "🦙" },
  perplexity_search: { id: "perplexity_search", name: "Perplexity Search", textIcon: "PS", color: "#20808D", emoji: "🔍" },
  serper: { id: "serper", name: "Serper", textIcon: "SR", color: "#10B981", emoji: "🔍" },
  brave: { id: "brave", name: "Brave Search", textIcon: "BV", color: "#F59E0B", emoji: "🦁" },
  exa: { id: "exa", name: "Exa", textIcon: "EX", color: "#6366F1", emoji: "🔍" },
  tavily: { id: "tavily", name: "Tavily", textIcon: "TV", color: "#14B8A6", emoji: "🔍" },
  opencode: { id: "opencode", name: "OpenCode", textIcon: "OC", color: "#000000", emoji: "💻" },
  bailian: { id: "bailian", name: "Bailian", textIcon: "BL", color: "#FF6A00", emoji: "☁️" },
  claude: { id: "claude", name: "Claude Code", textIcon: "CC", color: "#D97757", emoji: "🤖" },
  antigravity: { id: "antigravity", name: "Antigravity", textIcon: "AG", color: "#F59E0B", emoji: "🚀" },
  codex: { id: "codex", name: "Codex", textIcon: "CX", color: "#3B82F6", emoji: "📝" },
  github: { id: "github", name: "GitHub Copilot", textIcon: "GH", color: "#333333", emoji: "🐙" },
  cursor: { id: "cursor", name: "Cursor", textIcon: "CU", color: "#00D4AA", emoji: "✏️" },
  kilocode: { id: "kilocode", name: "Kilo Code", textIcon: "KC", color: "#FF6B35", emoji: "⚖️" },
  cline: { id: "cline", name: "Cline", textIcon: "CL", color: "#5B9BD5", emoji: "📝" },
  qoder: { id: "qoder", name: "Qoder AI", textIcon: "QD", color: "#6366F1", emoji: "💧" },
  qwen: { id: "qwen", name: "Qwen Code", textIcon: "QW", color: "#10B981", emoji: "🧠" },
  kiro: { id: "kiro", name: "Kiro AI", textIcon: "KR", color: "#FF6B35", emoji: "🤖" },
  "gemini-cli": { id: "gemini-cli", name: "Gemini CLI", textIcon: "GC", color: "#4285F4", emoji: "💎" },
  "kimi-coding": { id: "kimi-coding", name: "Kimi Coding", textIcon: "KC", color: "#1E40AF", emoji: "🌙" },
  "kimi-coding-apikey": { id: "kimi-coding-apikey", name: "Kimi Coding (API)", textIcon: "KC", color: "#1E40AF", emoji: "🌙" },
  "minimax-cn": { id: "minimax-cn", name: "Minimax CN", textIcon: "MC", color: "#DC2626", emoji: "📏" },
  "alicode-intl": { id: "alicode-intl", name: "Alibaba Intl", textIcon: "AL", color: "#FF6A00", emoji: "☁️" },
  "bailian-coding-plan": { id: "bailian-coding-plan", name: "Bailian Coding", textIcon: "BCP", color: "#FF6A00", emoji: "☁️" },
};

function getProviderInfo(providerId: string): ProviderDisplayInfo {
  if (!providerId) {
    return { id: "", name: "Unknown", textIcon: "??", color: "#6B7280", emoji: "🔧" };
  }
  const normalized = providerId.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return PROVIDER_ICONS[normalized] || { 
    id: providerId, 
    name: providerId, 
    textIcon: providerId.slice(0, 2).toUpperCase(), 
    color: "#6B7280", 
    emoji: "🔧" 
  };
}

function parseModelName(modelString: string): string {
  if (!modelString) return "Unknown Model";
  const parts = modelString.split("/");
  if (parts.length >= 2) {
    const modelPart = parts[parts.length - 1];
    return modelPart
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return modelString;
}



// Get the primary model name from combo - prefer combo.model, fallback to first entry in models array
function getPrimaryModelName(combo: ComboFromAPI | null): string {
  if (!combo) return "Unknown Model";
  // First try combo.model field
  if (combo.model && typeof combo.model === "string" && combo.model.trim()) {
    return parseModelName(combo.model);
  }
  // Fallback to first model in models array
  if (combo.models && Array.isArray(combo.models) && combo.models.length > 0) {
    const firstModel = combo.models[0];
    const modelStr = typeof firstModel === "string" ? firstModel : firstModel?.model;
    return parseModelName(modelStr);
  }
  return "Unknown Model";
}

// Get full model string for display (with provider prefix)
function getPrimaryModelFullName(combo: ComboFromAPI | null): string {
  if (!combo) return "";
  if (combo.model && typeof combo.model === "string" && combo.model.trim()) {
    return combo.model;
  }
  if (combo.models && Array.isArray(combo.models) && combo.models.length > 0) {
    const firstModel = combo.models[0];
    return typeof firstModel === "string" ? firstModel : firstModel?.model || "";
  }
  return "";
}



function convertModelsToNodes(combo: ComboFromAPI | null): Array<{ provider: string; priority: number; weight: number; modelName: string; modelFullName: string }> {
  if (!combo?.models || !Array.isArray(combo.models)) return [];
  
  return combo.models.map((entry, index) => {
    const modelStr = typeof entry === "string" ? entry : entry?.model;
    if (!modelStr) return null;
    const provider = modelStr.split("/")[0]?.toLowerCase() || "unknown";
    const weight = typeof entry === "object" && entry.weight ? entry.weight : 0;
    return {
      provider,
      priority: index + 1,
      weight,
      modelName: parseModelName(modelStr),
      modelFullName: modelStr,
    };
  }).filter(Boolean) as Array<{ provider: string; priority: number; weight: number; modelName: string; modelFullName: string }>;
}

function determineActiveCombo(
  combos: ComboFromAPI[], 
  healthMetrics: Record<string, ComboHealthMetric | null>
): ComboFromAPI | null {
  if (!combos?.length) return null;

  const combosWithMetrics = combos
    .map((combo) => ({
      combo,
      totalRequests: healthMetrics[combo.name]?.performance?.totalRequests || 0,
    }))
    .sort((a, b) => b.totalRequests - a.totalRequests);

  if (combosWithMetrics.length > 0 && combosWithMetrics[0].totalRequests > 0) {
    return combosWithMetrics[0].combo;
  }

  const activeCombo = combos.find((c) => c.isActive);
  if (activeCombo) return activeCombo;

  return combos[0] || null;
}

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 450;
const CENTER_X = VIEWBOX_WIDTH / 2;
const CENTER_Y = VIEWBOX_HEIGHT / 2;
const BASE_RADIUS_RATIO = 0.28;
const NODE_BOX_WIDTH = 160;
const NODE_BOX_HEIGHT = 80;

export default function ProviderNodeGraph() {
  const [combos, setCombos] = useState<ComboFromAPI[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<Record<string, ComboHealthMetric | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedComboName, setSelectedComboName] = useState<string>("");
  const [autoMode, setAutoMode] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [combosRes, metricsRes] = await Promise.all([
        fetch(`/api/combos`),
        fetch(`/api/usage/combo-health?range=24h`),
      ]);

      if (!combosRes.ok) throw new Error("Gagal mengambil combo");
      
      const combosData = await combosRes.json();
      if (combosData.combos && Array.isArray(combosData.combos)) {
        setCombos(combosData.combos);
      } else {
        setCombos([]);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        if (metricsData.combos && Array.isArray(metricsData.combos)) {
          const metricsMap: Record<string, ComboHealthMetric | null> = {};
          for (const m of metricsData.combos) {
            metricsMap[m.comboName] = m;
          }
          setHealthMetrics(metricsMap);
        }
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching combo data:", err);
      setError("Gagal memuat data Combo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (autoMode && combos.length > 0) {
      const active = determineActiveCombo(combos, healthMetrics);
      if (active && active.name !== selectedComboName) {
        setSelectedComboName(active.name);
      }
    }
  }, [combos, healthMetrics, autoMode, selectedComboName]);

  const selectedCombo = useMemo(() => 
    combos.find((c) => c.name === selectedComboName) || combos[0] || null, 
    [combos, selectedComboName]
  );

  const primaryModelName = useMemo(() => getPrimaryModelName(selectedCombo), [selectedCombo]);
  const primaryModelFullName = useMemo(() => getPrimaryModelFullName(selectedCombo), [selectedCombo]);

  const processedNodes = useMemo((): ProcessedNode[] => {
    if (!selectedCombo) return [];
    const nodes = convertModelsToNodes(selectedCombo);
    if (!nodes.length) return [];
    
    return nodes.map((node, index) => {
      const info = getProviderInfo(node.provider);
      return {
        provider: node.provider,
        providerName: info.name,
        textIcon: info.textIcon,
        emoji: info.emoji,
        color: info.color,
        priority: node.priority,
        weight: node.weight,
        modelName: node.modelName,
        modelFullName: node.modelFullName,
        isPrimary: index === 0,
      };
    });
  }, [selectedCombo]);

  const strategyLabels: Record<string, string> = {
    priority: "Prioritas",
    weighted: "Berbobot",
    "round-robin": "Round-Robin",
    "context-relay": "Context Relay",
  };

  const activeMetrics = healthMetrics[selectedCombo?.name || ""];
  const totalRequests = activeMetrics?.performance?.totalRequests || 0;
  const lastUsedText = totalRequests > 0 
    ? `Total Request (24h): ${totalRequests.toLocaleString()}`
    : "Belum ada aktivitas";

  const totalNodes = processedNodes.length;
  const radius = useMemo(() => {
    const minDimension = Math.min(VIEWBOX_WIDTH, VIEWBOX_HEIGHT);
    const nodeCountFactor = Math.max(0.6, 1 - (totalNodes - 3) * 0.05);
    return Math.max(120, minDimension * BASE_RADIUS_RATIO * nodeCountFactor);
  }, [totalNodes]);

  const nodePositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    if (totalNodes === 0) return positions;
    
    const angleStep = (2 * Math.PI) / totalNodes;
    for (let i = 0; i < totalNodes; i++) {
      const angle = angleStep * i - Math.PI / 2;
      positions.push({
        x: CENTER_X + radius * Math.cos(angle),
        y: CENTER_Y + radius * Math.sin(angle),
      });
    }
    return positions;
  }, [totalNodes, radius]);

  // Render loading state
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Provider Network Graph</h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-muted">Memuat konfigurasi Combo...</div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error || !selectedCombo) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Provider Network Graph</h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-500">{error || "Tidak ada Combo tersedia"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg border border-border bg-card p-6 shadow-sm overflow-hidden">
      <style jsx>{`
        @keyframes dash-flow {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 4px currentColor); }
          50% { opacity: 1; filter: drop-shadow(0 0 12px currentColor) drop-shadow(0 0 20px currentColor); }
        }
        @keyframes node-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .flow-line {
          stroke-dasharray: 8 4;
          animation: dash-flow 1.5s linear infinite;
        }
        .primary-node {
          animation: node-pulse 2s ease-in-out infinite;
        }
        .primary-ring {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        .svg-wrapper {
          width: 100%;
          height: auto;
          max-height: 60vh;
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .svg-wrapper { max-height: 50vh; }
        }
      `}</style>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Provider Network Graph</h3>
          <p className="text-sm text-text-muted mt-1">
            Active Routing: <span className="font-mono text-primary">{selectedCombo.name}</span>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary font-medium">
              {strategyLabels[selectedCombo.strategy] || selectedCombo.strategy}
            </span>
            {autoMode && <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-medium">Auto</span>}
          </p>
          <p className="text-xs text-text-muted mt-1">{lastUsedText}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          {combos.length > 1 && (
            <select
              value={selectedComboName}
              onChange={(e) => {
                setSelectedComboName(e.target.value);
                setAutoMode(false);
              }}
              className="px-3 py-1.5 text-sm border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary min-w-[180px]"
              aria-label="Pilih Combo"
            >
              {combos.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} {c.isActive && "✓"}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => {
              setAutoMode(true);
              fetchData();
            }}
            disabled={autoMode}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-input hover:bg-input/80 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            aria-label="Mode otomatis deteksi combo aktif"
          >
            <span className="text-xs">🔄</span> Auto
          </button>
        </div>
      </div>

      <div className="relative w-full bg-black/[0.02] dark:bg-white/[0.02] rounded-lg border border-border/50">
        <div className="svg-wrapper">
          <svg 
            width="100%" 
            height="auto" 
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            role="img" 
            aria-label="Provider network graph"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,7 L9,3.5 Z" fill="currentColor" className="text-border" />
              </marker>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {processedNodes.map((node, idx) => {
              const pos = nodePositions[idx];
              const isPrimary = node.isPrimary;
              
              return (
                <g key={`connection-${idx}`}>
                  <line
                    className="flow-line"
                    x1={CENTER_X}
                    y1={CENTER_Y}
                    x2={pos.x}
                    y2={pos.y}
                    stroke={node.color}
                    strokeWidth={isPrimary ? 3 : 2}
                    strokeOpacity={isPrimary ? 0.9 : 0.5}
                    markerEnd="url(#arrowhead)"
                    filter={isPrimary ? "url(#glow)" : "none"}
                  />
                </g>
              );
            })}

            <g>
              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r={40}
                fill="currentColor"
                className="fill-primary/10 stroke-primary/50"
                strokeWidth={2}
              />
              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r={32}
                fill="currentColor"
                className="fill-primary/20 stroke-primary/30"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <text
                x={CENTER_X}
                y={CENTER_Y - 8}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-primary font-bold text-lg"
              >
                OmniRoute
              </text>
              <text
                x={CENTER_X}
                y={CENTER_Y + 16}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-primary/70 font-medium text-xs"
              >
                Hub Pusat
              </text>
            </g>

            {processedNodes.map((node, idx) => {
              const pos = nodePositions[idx];
              const isPrimary = node.isPrimary;
              const boxX = pos.x - NODE_BOX_WIDTH / 2;
              const boxY = pos.y - NODE_BOX_HEIGHT / 2;

              return (
                <g key={`node-${idx}`} className={isPrimary ? "primary-node" : ""} style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}>
                  <rect
                    x={boxX}
                    y={boxY}
                    width={NODE_BOX_WIDTH}
                    height={NODE_BOX_HEIGHT}
                    rx={12}
                    className="cursor-pointer transition-all hover:scale-105"
                    style={{
                      fill: `${node.color}15`,
                      stroke: node.color,
                      strokeWidth: isPrimary ? 3 : 2,
                      filter: isPrimary ? "drop-shadow(0 0 8px currentColor)" : "none",
                    }}
                  />
                  
                  {isPrimary && (
                    <circle
                      cx={pos.x + NODE_BOX_WIDTH / 2 - 20}
                      cy={pos.y - NODE_BOX_HEIGHT / 2 + 20}
                      r={16}
                      fill={node.color}
                      className="primary-ring"
                      strokeWidth={2}
                      stroke="white"
                    />
                  )}

                  <text
                    x={pos.x}
                    y={pos.y - 24}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-current font-bold text-2xl"
                    style={{ fontFamily: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji" }}
                  >
                    {node.emoji}
                  </text>

                  <text
                    x={pos.x}
                    y={pos.y + 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-current font-semibold text-sm"
                  >
                    {node.providerName}
                  </text>

                  {/* Model name - primary node shows full name, others show short name */}
                  {node.modelName && (
                    <text
                      x={pos.x}
                      y={pos.y + 22}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-current font-medium text-xs"
                      style={{ fontFamily: "monospace" }}
                    >
                      {isPrimary ? node.modelFullName : node.modelName}
                    </text>
                  )}

                  <text
                    x={pos.x}
                    y={pos.y + (node.modelName ? 38 : 26)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-current text-[10px] font-medium"
                  >
                    Prioritas #{node.priority} • Bobot {node.weight}
                  </text>

                  {isPrimary && (
                    <text
                      x={pos.x + NODE_BOX_WIDTH / 2 - 20}
                      y={pos.y - NODE_BOX_HEIGHT / 2 + 24}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white font-bold text-[12px]"
                    >
                      1
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap justify-center gap-2 px-4">
          {processedNodes.map((node, idx) => (
            <span
              key={node.provider}
              className="px-2 py-1 text-[10px] font-medium rounded-full border"
              style={{
                backgroundColor: `${node.color}15`,
                borderColor: node.color,
                color: node.color,
              }}
            >
              {node.emoji} {node.providerName} #{node.priority}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="text-xs text-text-muted">Strategi</div>
          <div className="text-sm font-semibold capitalize">{strategyLabels[selectedCombo.strategy] || selectedCombo.strategy}</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="text-xs text-text-muted">Model Target</div>
          <div className="text-sm font-semibold font-mono truncate">{primaryModelName}</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="text-xs text-text-muted">Node Aktif</div>
          <div className="text-sm font-semibold">{processedNodes.length}</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="text-xs text-text-muted">Total Request (24h)</div>
          <div className="text-sm font-semibold">{totalRequests.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}