"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import Modal from "./Modal";
import { getModelsByProviderId, PROVIDER_ID_TO_ALIAS } from "@/shared/constants/models";
import { getCompatibleFallbackModels } from "@/lib/providers/managedAvailableModels";
import {
  OAUTH_PROVIDERS,
  FREE_PROVIDERS,
  APIKEY_PROVIDERS,
  isOpenAICompatibleProvider,
  isAnthropicCompatibleProvider,
} from "@/shared/constants/providers";

// Provider order: OAuth first, then Free, then API Key (matches dashboard/providers)
const PROVIDER_ORDER = [
  ...Object.keys(OAUTH_PROVIDERS),
  ...Object.keys(FREE_PROVIDERS),
  ...Object.keys(APIKEY_PROVIDERS),
];

interface ModelTestResult {
  model: string;
  status: "ok" | "error" | "testing" | "pending";
  latencyMs?: number;
  error?: string;
  responseText?: string;
}

export default function ModelSelectModal({
  isOpen,
  onClose,
  onSelect,
  onSelectMultiple,
  selectedModel,
  activeProviders = [],
  title = "Select Model",
  modelAliases = {},
  addedModelValues = [],
  multiSelect = false,
  maxSelections,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [combos, setCombos] = useState<any[]>([]);
  const [providerNodes, setProviderNodes] = useState<any[]>([]);
  const [customModels, setCustomModels] = useState<Record<string, any>>({});

  // Multi‑select state
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());

  // Smart‑filter state
  const [modelTestResults, setModelTestResults] = useState<Record<string, ModelTestResult>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState({ current: 0, total: 0 });
  const [hideFailing, setHideFailing] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCombos = useCallback(async () => {
    try {
      const res = await fetch("/api/combos");
      if (!res.ok) throw new Error(`Failed to fetch combos: ${res.status}`);
      const data = await res.json();
      setCombos(data.combos || []);
    } catch (error) {
      console.error("Error fetching combos:", error);
      setCombos([]);
    }
  }, []);


  useEffect(() => {
    if (isOpen) fetchCombos();
  }, [isOpen]);

  const fetchProviderNodes = useCallback(async () => {
    try {
      const res = await fetch("/api/provider-nodes");
      if (!res.ok) throw new Error(`Failed to fetch provider nodes: ${res.status}`);
      const data = await res.json();
      setProviderNodes(data.nodes || []);
    } catch (error) {
      console.error("Error fetching provider nodes:", error);
      setProviderNodes([]);
    }
  }, []);


  useEffect(() => {
    if (isOpen) fetchProviderNodes();
  }, [isOpen]);

  const fetchCustomModels = useCallback(async () => {
    try {
      const res = await fetch("/api/provider-models");
      if (!res.ok) throw new Error(`Failed to fetch custom models: ${res.status}`);
      const data = await res.json();
      setCustomModels(data.models || {});
    } catch (error) {
      console.error("Error fetching custom models:", error);
      setCustomModels({});
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchCustomModels();
  }, [isOpen]);

  const allProviders = useMemo(
    () => ({ ...OAUTH_PROVIDERS, ...FREE_PROVIDERS, ...APIKEY_PROVIDERS }),
    []
  );

  // Group models by provider with priority order
  const groupedModels = useMemo(() => {
    const groups: Record<string, any> = {};

    // Get all active provider IDs from connections
    const activeConnectionIds = activeProviders.map((p) => p.provider);

    // Only show connected providers (including both standard and custom)
    const providerIdsToShow = new Set([
      ...activeConnectionIds, // Only connected providers
    ]);

    // Sort by PROVIDER_ORDER
    const sortedProviderIds = [...providerIdsToShow].sort((a, b) => {
      const indexA = PROVIDER_ORDER.indexOf(a);
      const indexB = PROVIDER_ORDER.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    sortedProviderIds.forEach((providerId) => {
      const alias = PROVIDER_ID_TO_ALIAS[providerId] || providerId;
      const providerInfo = allProviders[providerId] || { name: providerId, color: "#666" };
      const isCustomProvider =
        isOpenAICompatibleProvider(providerId) || isAnthropicCompatibleProvider(providerId);

      // Get user-added custom models for this provider (if any)
      const providerCustomModels = customModels[providerId] || [];

      if (providerInfo.passthroughModels) {
        const aliasModels = Object.entries(modelAliases as Record<string, string>)
          .filter(([, fullModel]: [string, string]) => fullModel.startsWith(`${alias}/`))
          .map(([aliasName, fullModel]: [string, string]) => ({
            id: fullModel.replace(`${alias}/`, ""),
            name: aliasName,
            value: fullModel,
          }));

        // Merge custom models for passthrough providers
        const customEntries = providerCustomModels
          .filter((cm) => !aliasModels.some((am) => am.id === cm.id))
          .map((cm) => ({
            id: cm.id,
            name: cm.name || cm.id,
            value: `${alias}/${cm.id}`,
            isCustom: true,
          }));

        const allModels = [...aliasModels, ...customEntries];

        if (allModels.length > 0) {
          const matchedNode = providerNodes.find((node) => node.id === providerId);
          const displayName = matchedNode?.name || providerInfo.name;

          groups[providerId] = {
            name: displayName,
            alias: alias,
            color: providerInfo.color,
            models: allModels,
          };
        }
      } else if (isCustomProvider) {
        const matchedNode = providerNodes.find((node) => node.id === providerId);
        const displayName = matchedNode?.name || providerInfo.name;
        const nodePrefix = matchedNode?.prefix || providerId; // Consider a more user-friendly fallback if providerId is a UUID

        const nodeModels = Object.entries(modelAliases as Record<string, string>)
          .filter(([, fullModel]: [string, string]) => fullModel.startsWith(`${providerId}/`))
          .map(([aliasName, fullModel]: [string, string]) => ({
            id: fullModel.replace(`${providerId}/`, ""),
            name: aliasName,
            value: `${nodePrefix}/${fullModel.replace(`${providerId}/`, "")}`,
          }));

        const fallbackEntries = (
          getCompatibleFallbackModels(providerId, providerCustomModels) || []
        )
          .filter((fm) => !nodeModels.some((nm) => nm.id === fm.id))
          .map((fm) => ({
            id: fm.id,
            name: fm.name || fm.id,
            value: `${nodePrefix}/${fm.id}`,
            isFallback: true,
          }));

        // Merge custom models for custom providers
        const customEntries = providerCustomModels
          .filter(
            (cm) =>
              !nodeModels.some((nm) => nm.id === cm.id) &&
              !fallbackEntries.some((fm) => fm.id === cm.id)
          )
          .map((cm) => ({
            id: cm.id,
            name: cm.name || cm.id,
            value: `${nodePrefix}/${cm.id}`,
            isCustom: true,
          }));

        const allModels = [...nodeModels, ...fallbackEntries, ...customEntries];

        if (allModels.length > 0) {
          groups[providerId] = {
            name: displayName,
            alias: nodePrefix,
            color: providerInfo.color,
            models: allModels,
            isCustom: true,
            hasModels: true,
          };
        }
      } else {
        const systemModels = getModelsByProviderId(providerId);

        // Merge system models with user-added custom models
        const systemEntries = systemModels.map((m) => ({
          id: m.id,
          name: m.name,
          value: `${alias}/${m.id}`,
        }));

        const customEntries = providerCustomModels
          .filter((cm) => !systemModels.some((sm) => sm.id === cm.id))
          .map((cm) => ({
            id: cm.id,
            name: cm.name || cm.id,
            value: `${alias}/${cm.id}`,
            isCustom: true,
          }));

        const allModels = [...systemEntries, ...customEntries];

        if (allModels.length > 0) {
          groups[providerId] = {
            name: providerInfo.name,
            alias: alias,
            color: providerInfo.color,
            models: allModels,
          };
        }
      }
    });

    return groups;
  }, [activeProviders, modelAliases, allProviders, providerNodes, customModels]);

  // Filter combos by search query
  const filteredCombos = useMemo(() => {
    if (!searchQuery.trim()) return combos;
    const query = searchQuery.toLowerCase();
    return combos.filter((c) => c.name.toLowerCase().includes(query));
  }, [combos, searchQuery]);

  // Filter models by search query and optional hide failing filter
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedModels;

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, any> = {};

    Object.entries(groupedModels).forEach(([providerId, group]: [string, any]) => {
      const matchedModels = group.models.filter(
        (m) => m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query)
      );

      const providerNameMatches = group.name.toLowerCase().includes(query);

      if (matchedModels.length > 0 || providerNameMatches) {
        filtered[providerId] = {
          ...group,
          models: matchedModels,
        };
      }
    });

    // Apply hide failing filter if enabled
    if (hideFailing) {
      const passing: Record<string, any> = {};
      Object.entries(filtered).forEach(([providerId, group]: [string, any]) => {
        if (!group?.models) return;
        const passingModels = group.models.filter((model: any) => {
          const result = modelTestResults[model?.value];
          return !result || result.status === "ok" || result.status === "testing" || result.status === "pending";
        });
        if (passingModels.length > 0) {
          passing[providerId] = { ...group, models: passingModels };
        }
      });
      return passing;
    }

    return filtered;
  }, [groupedModels, searchQuery, hideFailing, modelTestResults]);

  const handleSelect = useCallback((model: any) => {
    if (!model?.value) return;
    if (multiSelect) {
      // toggle selection in multi-select mode
      setSelectedModels((prev) => {
        const next = new Set(prev);
        if (next.has(model.value)) {
          next.delete(model.value);
        } else {
          // enforce max selections if provided
          if (maxSelections && next.size >= maxSelections) {
            return prev; // do not add beyond limit
          }
          next.add(model.value);
        }
        return next;
      });
    } else {
      onSelect(model);
      onClose();
      setSearchQuery("");
    }
  }, [multiSelect, onSelect, onClose, maxSelections]);

  // Get all visible model values for testing (used by Test All Models)
  const getAllVisibleModelValues = useCallback(() => {
    const values: string[] = [];
    Object.values(filteredGroups).forEach((group: any) => {
      if (group?.models) {
        group.models.forEach((model: any) => {
          if (model?.value && !values.includes(model.value)) {
            values.push(model.value);
          }
        });
      }
    });
    return values;
  }, [filteredGroups]);

  // Get working model values (status === "ok")
  const getWorkingModelValues = useCallback(() => {
    const values: string[] = [];
    Object.values(filteredGroups).forEach((group: any) => {
      if (group?.models) {
        group.models.forEach((model: any) => {
          const result = modelTestResults[model?.value];
          if (model?.value && result?.status === "ok" && !values.includes(model.value)) {
            values.push(model.value);
          }
        });
      }
    });
    return values;
  }, [filteredGroups, modelTestResults]);

  // Smart filter: test all visible models
  const handleTestAllModels = useCallback(async () => {
    try {
      const modelsToTest = getAllVisibleModelValues();
      if (modelsToTest.length === 0) return;

      const total = modelsToTest.length;
      const BATCH_SIZE = 5;

      setTestError(null);
      abortControllerRef.current = new AbortController();
      setIsTesting(true);
      setTestProgress({ current: 0, total });

      // Initialize pending results
      const initial: Record<string, ModelTestResult> = {};
      modelsToTest.forEach((m) => {
        initial[m] = { model: m, status: "pending" };
      });
      setModelTestResults(initial);
      const final: Record<string, ModelTestResult> = { ...initial };

      for (let i = 0; i < modelsToTest.length; i += BATCH_SIZE) {
        if (abortControllerRef.current?.signal.aborted) break;
        const batch = modelsToTest.slice(i, i + BATCH_SIZE);
        const res = await fetch("/api/models/test-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            models: batch,
            concurrency: 3,
            timeoutMs: 5000,
          }),
          signal: abortControllerRef.current.signal,
        });
        if (!res.ok) throw new Error(`Batch test failed: ${res.status}`);
        const data = await res.json();
        (data.results || []).forEach((result: ModelTestResult) => {
          final[result.model] = { ...result, status: result.status || (result.error ? "error" : "ok") };
        });
        setModelTestResults({ ...final });
        setTestProgress({ current: Math.min(i + BATCH_SIZE, total), total });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Batch test error:", err);
        setTestError(err.message || "Test failed");
        setModelTestResults((prev) => {
          const upd = { ...prev };
          Object.keys(upd).forEach((k) => {
            if (upd[k].status === "pending" || upd[k].status === "testing") {
              upd[k] = { model: k, status: "error", error: err.message || "Test failed" };
            }
          });
          return upd;
        });
      }
    } finally {
      setIsTesting(false);
      setTestProgress({ current: 0, total: 0 });
      abortControllerRef.current = null;
    }
  }, [getAllVisibleModelValues]);

  // Select all working models
  const handleSelectAllWorking = useCallback(() => {
    const working = getWorkingModelValues();
    setSelectedModels((prev) => {
      const next = new Set(prev);
      working.forEach((v) => {
        if (!maxSelections || next.size < maxSelections) {
          next.add(v);
        }
      });
      return next;
    });
  }, [getWorkingModelValues, maxSelections]);

  // Test models within a single provider group
  const handleTestProviderModels = useCallback(
    async (providerId: string) => {
      try {
        const group = filteredGroups[providerId];
        if (!group?.models?.length) return;
        const modelsToTest = group.models.map((m) => m.value);
        setTestError(null);
        abortControllerRef.current = new AbortController();
        setIsTesting(true);
        setTestProgress({ current: 0, total: modelsToTest.length });

        // Initialize as pending
        const initial: Record<string, ModelTestResult> = {};
        modelsToTest.forEach((m) => {
          initial[m] = { model: m, status: "pending" };
        });
        setModelTestResults(initial);

        const res = await fetch("/api/models/test-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            models: modelsToTest,
            concurrency: 3,
            timeoutMs: 5000,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) throw new Error(`Batch test failed: ${res.status}`);
        const data = await res.json();

        const final: Record<string, ModelTestResult> = { ...initial };
        (data.results || []).forEach((result: ModelTestResult) => {
          final[result.model] = {
            ...result,
            status: result.status || (result.error ? "error" : "ok"),
          };
        });
        setModelTestResults(final);
        setTestProgress({ current: modelsToTest.length, total: modelsToTest.length });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Batch test error:", err);
          setTestError(err.message || "Test failed");
          setModelTestResults((prev) => {
            const upd = { ...prev };
            Object.keys(upd).forEach((k) => {
              if (upd[k].status === "pending" || upd[k].status === "testing") {
                upd[k] = { model: k, status: "error", error: err.message || "Test failed" };
              }
            });
            return upd;
          });
        }
      } finally {
        setIsTesting(false);
        setTestProgress({ current: 0, total: 0 });
        abortControllerRef.current = null;
      }
    },
    [filteredGroups]
  );

   // Batched provider test implementation
   const handleTestProviderModelsBatched = useCallback(async (providerId: string) => {
    try {
      const group = filteredGroups[providerId];
      if (!group?.models?.length) return;
      const modelsToTest = group.models.map((m) => m.value);
      const total = modelsToTest.length;
      const BATCH_SIZE = 5;

      setTestError(null);
      abortControllerRef.current = new AbortController();
      setIsTesting(true);
      setTestProgress({ current: 0, total });

      const initial: Record<string, ModelTestResult> = {};
      modelsToTest.forEach((m) => { initial[m] = { model: m, status: "pending" }; });
      setModelTestResults(initial);
      const final: Record<string, ModelTestResult> = { ...initial };

      for (let i = 0; i < modelsToTest.length; i += BATCH_SIZE) {
        if (abortControllerRef.current?.signal.aborted) break;
        const batch = modelsToTest.slice(i, i + BATCH_SIZE);
        const res = await fetch("/api/models/test-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ models: batch, concurrency: 3, timeoutMs: 5000 }),
          signal: abortControllerRef.current.signal,
        });
        if (!res.ok) throw new Error(`Batch test failed: ${res.status}`);
        const data = await res.json();
        (data.results || []).forEach((result: ModelTestResult) => {
          final[result.model] = { ...result, status: result.status || (result.error ? "error" : "ok") };
        });
        setModelTestResults({ ...final });
        setTestProgress({ current: Math.min(i + BATCH_SIZE, total), total });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Batch test error:", err);
        setTestError(err.message || "Test failed");
        setModelTestResults((prev) => {
          const upd = { ...prev };
          Object.keys(upd).forEach((k) => {
            if (upd[k].status === "pending" || upd[k].status === "testing") {
              upd[k] = { model: k, status: "error", error: err.message || "Test failed" };
            }
          });
          return upd;
        });
      }
    } finally {
      setIsTesting(false);
      setTestProgress({ current: 0, total: 0 });
      abortControllerRef.current = null;
    }
  }, [filteredGroups]);


  const handleCancelTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTesting(false);
    setTestProgress({ current: 0, total: 0 });
  }, []);

  // Clear test results
  const handleClearTestResults = useCallback(() => {
    setModelTestResults({});
    setTestError(null);
  }, []);

  // Clear multi‑select selection
  const handleClearSelection = useCallback(() => {
    setSelectedModels(new Set());
  }, []);

  // Confirm multi‑select selection
  const handleConfirmMultiSelect = useCallback(() => {
    if (selectedModels.size > 0 && onSelectMultiple) {
      const selectedObjs: any[] = [];
      Object.values(filteredGroups).forEach((group: any) => {
        if (!group?.models) return;
        group.models.forEach((model: any) => {
          if (selectedModels.has(model.value)) {
            selectedObjs.push(model);
          }
        });
      });
      onSelectMultiple(selectedObjs);
      onClose();
      setSearchQuery("");
      setSelectedModels(new Set());
    }
  }, [selectedModels, filteredGroups, onSelectMultiple, onClose]);

  // UI helpers for summary
  const totalModels = useMemo(() => Object.values(filteredGroups).reduce((sum, g: any) => sum + (g.models?.length || 0), 0), [filteredGroups]);
  const passingModels = useMemo(() => Object.values(modelTestResults).filter(r => r?.status === "ok").length, [modelTestResults]);
  const failingModels = useMemo(() => Object.values(modelTestResults).filter(r => r?.status === "error").length, [modelTestResults]);
  const selectedCount = selectedModels.size;
  const workingCount = getWorkingModelValues().length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setSearchQuery("");
      }}
      title={title}
      size="lg"
      className="p-4! max-h-[85vh]"
    >
      {/* Search bar */}
      <div className="mb-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-[16px]">search</span>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-10 py-1.5 bg-surface border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Smart filter bar (only when multiSelect) */}
      {multiSelect && (
        <div className="mb-3 space-y-2">
          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestAllModels}
              disabled={isTesting || totalModels === 0}
              className={`px-2.5 py-1 text-xs font-medium rounded border transition-all ${isTesting ? "bg-amber-500/15 border-amber-500/30 text-amber-700 cursor-not-allowed" : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"}`}
            >
              {isTesting ? `⏳ Testing ${testProgress.current}/${testProgress.total}` : "Test All Models"}
            </button>

            {/* Select All Working */}
            {!isTesting && workingCount > 0 && (
              <button
                type="button"
                onClick={handleSelectAllWorking}
                disabled={selectedCount >= (maxSelections || Infinity)}
                className={`px-2.5 py-1 text-xs font-medium rounded border ${selectedCount >= (maxSelections || Infinity) ? "bg-surface border-border text-text-muted cursor-not-allowed opacity-50" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"}`}
              >
                Select All Working ({workingCount})
              </button>
            )}

            {/* Cancel testing */}
            {isTesting && (
              <button
                type="button"
                onClick={handleCancelTest}
                className="px-2.5 py-1 text-xs font-medium rounded border bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-500/25"
              >
                Cancel
              </button>
            )}

            {/* Clear results */}
            {!isTesting && Object.keys(modelTestResults).length > 0 && (
              <button
                type="button"
                onClick={handleClearTestResults}
                className="px-2.5 py-1 text-xs font-medium rounded border bg-surface border-border text-text-muted hover:bg-surface/80"
              >
                Clear Results
              </button>
            )}

            {/* Hide failing toggle */}
            <label className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border bg-surface border-border hover:bg-surface/80 cursor-pointer">
              <input type="checkbox" checked={hideFailing} onChange={(e) => setHideFailing(e.target.checked)} className="w-4 h-4 accent-primary" />
              <span>Hide Failing</span>
            </label>
          </div>

          {/* Progress bar */}
          {isTesting && testProgress.total > 0 && (
            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(testProgress.current / testProgress.total) * 100}%` }} />
            </div>
          )}

          {/* Error message */}
          {testError && !isTesting && (
            <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">Test error: {testError}</div>
          )}

          {/* Summary */}
          {Object.keys(modelTestResults).length > 0 && !isTesting && (
            <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{passingModels} working</span>
              {failingModels > 0 && (
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{failingModels} failing</span>
              )}
              <span className="text-text-muted/60">|</span>
              <span>{totalModels} total visible</span>
            </div>
          )}

          {/* Selected count and confirm */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-text-muted">{selectedCount} model{selectedCount !== 1 ? "s" : ""} dipilih{maxSelections && ` (max ${maxSelections})`}</span>
              <div className="flex gap-2">
                <button type="button" onClick={handleClearSelection} className="px-2.5 py-1 text-xs font-medium rounded border bg-surface border-border text-text-muted hover:bg-surface/80">Clear Selection</button>
                <button type="button" onClick={handleConfirmMultiSelect} className="px-3 py-1 text-xs font-semibold rounded bg-primary text-white hover:bg-primary/90" disabled={selectedCount === 0}>Tambahkan {selectedCount} Model{selectedCount !== 1 ? "s" : ""}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model list */}
      <div className="max-h-[300px] overflow-y-auto space-y-3">
        {filteredCombos.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 sticky top-0 bg-surface py-0.5">
              <span className="material-symbols-outlined text-primary text-[14px]">layers</span>
              <span className="text-xs font-medium text-primary">Combos</span>
              <span className="text-[10px] text-text-muted">({filteredCombos.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filteredCombos.map((combo) => {
                const isSelected = selectedModel === combo.name;
                return (
                  <button
                    key={combo.id}
                    onClick={() => handleSelect({ id: combo.name, name: combo.name, value: combo.name })}
                    className={`
                      px-2 py-1 rounded-xl text-xs font-medium transition-all border hover:cursor-pointer
                      ${isSelected ? "bg-primary text-white border-primary" : "bg-surface border-border text-text-main hover:border-primary/50 hover:bg-primary/5"}
                    `}
                  >
                    {combo.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Provider models */}
        {Object.entries(filteredGroups).map(([providerId, group]) => (
          <div key={providerId}>
            <div className="flex items-center gap-1.5 mb-1.5 sticky top-0 bg-surface py-0.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
              <span className="text-xs font-medium text-primary">{group.name}</span>
              <span className="text-[10px] text-text-muted">({group.models.length})</span>
              <button
                type="button"
                onClick={() => handleTestProviderModelsBatched(providerId)}
                disabled={isTesting}
                className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded border bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              >
                Test
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {group.models.map((model) => {
                const isSelected = selectedModels.has(model.value);
                const isAdded = addedModelValues.includes(model.value);
                const testResult = modelTestResults[model.value];
                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model)}
                    className={`
                      px-2 py-1 rounded-xl text-xs font-medium transition-all border hover:cursor-pointer
                      ${isSelected ? "bg-primary text-white border-primary" : isAdded ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : "bg-surface border-border text-text-main hover:border-primary/50 hover:bg-primary/5"}
                    `}
                  >
                    <div className="flex items-center gap-1">
                      {multiSelect && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 accent-primary border-border text-primary focus:ring-primary focus:ring-1 rounded"
                        />
                      )}
                      {isAdded && <span className="mr-0.5 opacity-70">✓</span>}
                      {model.name}
                      {model.isCustom ? " ★" : model.isFallback ? " ↻" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(filteredGroups).length === 0 && filteredCombos.length === 0 && (
          <div className="text-center py-4 text-text-muted">
            <span className="material-symbols-outlined text-2xl mb-1 block">search_off</span>
            <p className="text-xs">No models found</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

ModelSelectModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  selectedModel: PropTypes.string,
  activeProviders: PropTypes.arrayOf(
    PropTypes.shape({
      provider: PropTypes.string.isRequired,
    })
  ),
  title: PropTypes.string,
  modelAliases: PropTypes.object,
  addedModelValues: PropTypes.arrayOf(PropTypes.string),
  multiSelect: PropTypes.bool,
  onSelectMultiple: PropTypes.func,
  maxSelections: PropTypes.number,
};
