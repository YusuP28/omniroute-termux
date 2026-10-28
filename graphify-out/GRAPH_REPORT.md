# Graph Report - omniroute  (2026-10-28)

## Corpus Check
- Large corpus: 2153 files · ~3,555,093 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2265 nodes · 3632 edges · 178 communities (93 shown, 85 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 55
- Community 56
- Community 58
- Community 59
- Community 60
- Community 61
- Community 63
- Community 65
- Community 66
- Community 67
- Community 68
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 80
- Community 81
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 113
- Community 114
- Community 115
- Community 119
- Community 120
- Community 121
- Community 123
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 142
- Community 144
- Community 145
- Community 147
- Community 148
- Community 155
- Community 165
- Community 166
- Community 169
- Community 174
- Community 175
- Community 176

## God Nodes (most connected - your core abstractions)
1. `createChatPipelineHarness()` - 43 edges
2. `with` - 27 edges
3. `with` - 17 edges
4. `with` - 16 edges
5. `jobs` - 15 edges
6. `uses` - 14 edges
7. `run` - 14 edges
8. `omniroute-prod` - 11 edges
9. `omniroute-base` - 11 edges
10. `omniroute-cli` - 11 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `sanitizeColorEnv()`  [EXTRACTED]
  scripts/run-ecosystem-tests.mjs → scripts/runtime-env.mjs
- `runBuildForStart()` --calls--> `withRuntimePortEnv()`  [EXTRACTED]
  scripts/run-next-playwright.mjs → scripts/runtime-env.mjs
- `main()` --calls--> `sanitizeColorEnv()`  [EXTRACTED]
  scripts/run-protocol-clients-tests.mjs → scripts/runtime-env.mjs

## Import Cycles
- None detected.

## Communities (178 total, 85 thin omitted)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (13): budget, cwd, tmpDir, TEST_DATA_DIR, TEST_DATA_DIR, JSON_DB_FILE, TEST_DATA_DIR, TEST_DATA_DIR (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (37): isServerReady(), main(), maxWaitMs, waitForServerReady(), args, env, appDir, appPage (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (32): apiPort, APP_DIR, args, dashboardPort, __dirname, env, __filename, nodeMajor (+24 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (44): env, name, runs-on, steps, DOCKER_BUILDKIT_INLINE_CACHE, IMAGE_NAME, version, jobs (+36 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (20): changelogPath, cwd, openApiPath, packageJsonPath, API_ROOT, collectRouteFiles(), missingValidation, ROOT (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (41): GITHUB_TOKEN, JWT_SECRET, NODE_AUTH_TOKEN, tag, version, jobs, publish, name (+33 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (12): TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (34): buildDocsLanguageBar(), buildRootReadmeLanguageBar(), collectStringLeaves(), DOC_SOURCE_FILES, DOCS_DIR, DOCS_I18N_DIR, ensureDir(), EXISTING_README_CODES (+26 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (33): steps, steps, steps, steps, steps, steps, steps, steps (+25 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (4): createChatPipelineHarness(), cleanup(), clearSkillState(), resetStorage()

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (4): TEST_DATA_DIR, withFakeTimers(), runAllTimers(), runNextTimer()

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (9): TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, fileTmpDir, removeStorageFiles() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (25): if, name, runs-on, steps, jobs, deploy, name, permissions (+17 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (4): textDecoder, textEncoder, buildToolCallFrame(), concatArrays()

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (5): TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (25): APP_DIR, appPkg, binaryDirsToRemove, buildRoot, __dirname, __filename, mcpDestDir, mcpDestFile (+17 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (21): APP_PATH, changePort(), checkForUpdates(), createTray(), createWindow(), downloadUpdate(), getPreferredEnvFilePath(), getServerUrl() (+13 more)

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (11): appBinary, __dirname, ensureSwcHelpers(), __filename, ROOT, rootBinary, TEST_LOG_DIR, TEST_LOG_PATH (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (13): bootstrapEnv(), getPreferredEnvFilePath(), hasEncryptedCredentials(), OPTIONAL_OAUTH_SECRETS, parseEnvFile(), require, resolveDataDir(), writeEnvFile() (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (19): certDir, CHAT_URL_PATTERNS, collectBodyRaw(), DATA_DIR, DB_FILE, extractModel(), getMappedModel(), getSqliteDb() (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (7): TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, __dirname, ROOT_DIR, TEST_DATA_DIR

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (22): context, target, interval, retries, start_period, test, timeout, build (+14 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (5): A11Y_CHECKS, generateTestMatrix(), getViewportNames(), PAGES, VIEWPORTS

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (5): TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR

### Community 27 - "Community 27"
Cohesion: 0.11
Nodes (13): resetSkillsRuntime(), resetStorage(), TEST_DATA_DIR, resetRegistryState(), resetStorage(), TEST_DATA_DIR, executionContext, resetRuntime() (+5 more)

### Community 28 - "Community 28"
Cohesion: 0.10
Nodes (20): name, runs-on, concurrency, cancel-in-progress, group, jobs, advanced-security, lint (+12 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (10): syncProjectEnv(), CRYPTO_SECRETS, getEnvSyncPlan(), parseEnvEntry(), parseEnvFile(), parseExampleEntries(), replaceBlankSecret(), syncEnv() (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.10
Nodes (4): TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (12): buildClaudeResponse(), buildOpenAIResponse(), buildResponsesResponse(), hasCacheControl(), invokeChatCore(), noopLog(), originalBackgroundConfig, originalResponsesToOpenAI (+4 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (18): prefix, dependency-type, development, production, dependency-name, update-types, dependency-type, day (+10 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (4): TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (18): API_KEY_SECRET, DATA_DIR, INITIAL_PASSWORD, JWT_SECRET, test-security, test-unit, env, env (+10 more)

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (14): classifyResult(), customLocales, customRoutes, DATE, DEFAULT_LOCALES, ensureLoggedIn(), evaluatePageHealth(), REPORTS_DIR (+6 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (12): bundleDir, createPathPattern(), __dirname, ELECTRON_STANDALONE_DIR, __filename, PUBLIC_DEST, PUBLIC_SRC, ROOT (+4 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (16): description, label, options, placeholder, render, value, body, attributes (+8 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (16): description, label, multiple, options, placeholder, value, body, attributes (+8 more)

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (17): name, runs-on, strategy, continue-on-error, name, needs, runs-on, strategy (+9 more)

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (13): cliTools, __dirname, dockerContainers, installedGlobal, lines, outArg, outPath, pm2Status (+5 more)

### Community 45 - "Community 45"
Cohesion: 0.12
Nodes (3): ensureLegacyMemoryTable(), insertLegacyMemory(), TEST_DATA_DIR

### Community 46 - "Community 46"
Cohesion: 0.16
Nodes (14): buildGraph(), components, cwd, cycles, defaultRoots, extractImportSpecifiers(), files, graph (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (10): changedFiles, changedSourceFiles, changedTestFiles, EXCLUDED_PATTERNS, report, reportLines, SOURCE_ROOTS, summaryFile (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (14): APP_DIR, classifyPriority(), collectRouteRiskMetrics(), collectStringKeys(), countRegex(), I18N_README_DIR, main(), MESSAGES_DIR (+6 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (14): description, label, placeholder, value, body, attributes, id, type (+6 more)

### Community 51 - "Community 51"
Cohesion: 0.13
Nodes (15): with, cache, draft, fail_on_unmatched_files, fetch-depth, files, generate_release_notes, key (+7 more)

### Community 53 - "Community 53"
Cohesion: 0.15
Nodes (3): TEST_DATA_DIR, TEST_DATA_DIR, TEST_DATA_DIR

### Community 55 - "Community 55"
Cohesion: 0.13
Nodes (9): CALL_LOGS_JSON_FILE, CURRENT_REQUEST_LOGS_DIR, CURRENT_REQUEST_SUMMARY_FILE, LEGACY_CALL_LOGS_JSON_FILE, LEGACY_DATA_DIR, LEGACY_USAGE_JSON_FILE, TEST_DATA_DIR, TEST_HOME_DIR (+1 more)

### Community 56 - "Community 56"
Cohesion: 0.20
Nodes (14): steps, GH_TOKEN, GITHUB_TOKEN, JWT_SECRET, steps, env, id, if (+6 more)

### Community 58 - "Community 58"
Cohesion: 0.18
Nodes (5): buildUpstreamResponse(), invokeChatCore(), noopLog(), TEST_DATA_DIR, toPlainHeaders()

### Community 59 - "Community 59"
Cohesion: 0.17
Nodes (13): COVERAGE_RESULT, EVENT_NAME, POLICY_RESULT, SNYK_TOKEN, SONAR_HOST_URL, SONAR_TOKEN, sonarqube, env (+5 more)

### Community 60 - "Community 60"
Cohesion: 0.15
Nodes (13): name, needs, runs-on, strategy, deb_ext, ext, platform, runner (+5 more)

### Community 61 - "Community 61"
Cohesion: 0.23
Nodes (12): applyMessageOverrides(), applyReadmeOverrides(), main(), MESSAGE_OVERRIDES, MESSAGES_DIR, README_NAV_OVERRIDES, README_PREFIX_OVERRIDES, removeBrazilianAppendixSection() (+4 more)

### Community 63 - "Community 63"
Cohesion: 0.17
Nodes (4): modulePath, originalEnv, require, tempDirs

### Community 66 - "Community 66"
Cohesion: 0.50
Nodes (11): asRecord(), getLoggedInputTokens(), getPromptCacheCreationTokens(), getPromptCacheCreationTokensOrNull(), getPromptCacheReadTokens(), getPromptCacheReadTokensOrNull(), getPromptTokenDetails(), getReasoningTokens() (+3 more)

### Community 67 - "Community 67"
Cohesion: 0.17
Nodes (3): require, TEST_CONFIG_DIR, TEST_DATA_DIR

### Community 68 - "Community 68"
Cohesion: 0.18
Nodes (10): jobs, release, name, permissions, contents, id-token, packages, name (+2 more)

### Community 72 - "Community 72"
Cohesion: 0.18
Nodes (6): chatLatency, errorRate, headers, healthLatency, options, VUS

### Community 73 - "Community 73"
Cohesion: 0.18
Nodes (5): env, fixBetterSqliteBinary(), modulePath, originalPlatformDescriptor, require

### Community 74 - "Community 74"
Cohesion: 0.18
Nodes (4): modulePath, require, require, requiredSettingsKeys

### Community 75 - "Community 75"
Cohesion: 0.18
Nodes (5): loadedModules, MOCK_MODELS_DEV_DATA, modulePath, originalEnv, TEST_DATA_DIR

### Community 76 - "Community 76"
Cohesion: 0.18
Nodes (5): collectHttpsUrls(), EXPECTED_CONFIG_BY_PROVIDER, EXPECTED_PROVIDER_KEYS, originalEnv, REQUIRED_FIELDS_BY_PROVIDER

### Community 77 - "Community 77"
Cohesion: 0.56
Nodes (10): healthcheck, interval, retries, start_period, test, timeout, healthcheck, healthcheck (+2 more)

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (10): if, name, needs, permissions, runs-on, coverage-pr-comment, permissions, contents (+2 more)

### Community 81 - "Community 81"
Cohesion: 0.22
Nodes (5): content, envPath, jwtMatch, nextAuthMatch, args

### Community 85 - "Community 85"
Cohesion: 0.28
Nodes (6): ask(), DB_PATH, __dirname, generateSecretDigest(), main(), rl

### Community 86 - "Community 86"
Cohesion: 0.22
Nodes (9): container_name, env_file, environment, image, ports, profiles, restart, volumes (+1 more)

### Community 87 - "Community 87"
Cohesion: 0.22
Nodes (9): container_name, env_file, environment, image, ports, profiles, restart, volumes (+1 more)

### Community 88 - "Community 88"
Cohesion: 0.22
Nodes (9): container_name, env_file, environment, image, ports, profiles, restart, volumes (+1 more)

### Community 89 - "Community 89"
Cohesion: 0.22
Nodes (9): version, tags, True, push, workflow_dispatch, description, required, type (+1 more)

### Community 90 - "Community 90"
Cohesion: 0.22
Nodes (9): publish-npm, name, needs, secrets, uses, with, NPM_TOKEN, tag (+1 more)

### Community 91 - "Community 91"
Cohesion: 0.28
Nodes (4): buildEventFrame(), crc32(), encodeHeader(), textEncoder

### Community 96 - "Community 96"
Cohesion: 0.22
Nodes (4): modulePath, originalEnv, require, tempDirs

### Community 98 - "Community 98"
Cohesion: 0.28
Nodes (5): fileTmpDir, getConfig(), getFallbackChain(), moduleDataDir, upsert()

### Community 99 - "Community 99"
Cohesion: 0.36
Nodes (7): buildJsonResponse(), buildOpenAISseResponse(), invokeResponsesCore(), noopLog(), responseFactory(), TEST_DATA_DIR, toPlainHeaders()

### Community 100 - "Community 100"
Cohesion: 0.25
Nodes (8): container_name, environment, image, ports, profiles, restart, volumes, cliproxyapi

### Community 104 - "Community 104"
Cohesion: 0.36
Nodes (7): backupDir, exists(), legacyAppDir, main(), movePath(), projectRoot, runNextBuild()

### Community 106 - "Community 106"
Cohesion: 0.25
Nodes (5): LEGACY_CALL_LOGS_DIR, LEGACY_LOGS_DIR, LEGACY_SUMMARY_FILE, MARKER_PATH, TEST_DATA_DIR

### Community 107 - "Community 107"
Cohesion: 0.38
Nodes (6): __dirname, __filename, formatSpawnError(), resolveMcpEntry(), ROOT, startMcpCli()

### Community 108 - "Community 108"
Cohesion: 0.29
Nodes (6): name, name, services, volumes, cliproxyapi-data, omniroute-data

### Community 109 - "Community 109"
Cohesion: 0.29
Nodes (7): name, outputs, runs-on, steps, i18n-matrix, langs, id

### Community 113 - "Community 113"
Cohesion: 0.33
Nodes (3): clearSkillRegistry(), resetStorage(), tmpDir

### Community 120 - "Community 120"
Cohesion: 0.33
Nodes (5): blank_issues_enabled, contact_links, about, name, url

### Community 121 - "Community 121"
Cohesion: 0.33
Nodes (6): branches, types, branches, True, pull_request, push

### Community 127 - "Community 127"
Cohesion: 0.40
Nodes (4): assertRouteMethods(), __dirname, readProjectFile(), ROOT

### Community 128 - "Community 128"
Cohesion: 0.53
Nodes (4): assert_equals(), read_json_field(), test-cli-runtime.sh script, wait_ready()

### Community 132 - "Community 132"
Cohesion: 0.40
Nodes (3): flushBackgroundWork(), TEST_DATA_DIR, wait()

### Community 134 - "Community 134"
Cohesion: 0.60
Nodes (5): context, target, build, build, build

### Community 135 - "Community 135"
Cohesion: 0.40
Nodes (5): x-common, env_file, environment, restart, volumes

### Community 137 - "Community 137"
Cohesion: 0.40
Nodes (5): if, name, needs, runs-on, ci-summary

### Community 138 - "Community 138"
Cohesion: 0.40
Nodes (5): test-e2e, name, needs, runs-on, timeout-minutes

### Community 139 - "Community 139"
Cohesion: 0.40
Nodes (5): test-integration, name, needs, runs-on, timeout-minutes

### Community 140 - "Community 140"
Cohesion: 0.40
Nodes (5): validate, version, name, outputs, runs-on

### Community 144 - "Community 144"
Cohesion: 0.60
Nodes (3): assert_contains(), assert_status(), test-docker-hardening.sh script

### Community 155 - "Community 155"
Cohesion: 0.83
Nodes (3): asRecord(), getLoggedInputTokens(), toFiniteNumber()

## Knowledge Gaps
- **85 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getSqliteDb()` connect `Community 22` to `Community 21`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.043029259896729774 - nodes in this community are weakly interconnected._
- **Why does `createChatPipelineHarness()` connect `Community 11` to `Community 58`, `Community 102`, `Community 7`, `Community 12`, `Community 14`, `Community 113`, `Community 49`, `Community 17`, `Community 116`, `Community 149`, `Community 23`, `Community 26`, `Community 27`, `Community 92`, `Community 95`, `Community 31`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0549645390070922 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06648936170212766 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05757575757575758 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._