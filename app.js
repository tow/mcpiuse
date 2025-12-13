// MCP I Use - Data loader and renderer

const DATA_PATH = './data';

// Data storage
let ides = {};
let aiClients = {};
let features = {};
let changelog = { entries: [] };

// Support code rendering
const SUPPORT_ICONS = {
    y: { icon: '&#10003;', class: 'support-y', title: 'Supported' },
    a: { icon: '~', class: 'support-a', title: 'Partial support' },
    n: { icon: '&#10005;', class: 'support-n', title: 'Not supported' },
    u: { icon: '?', class: 'support-u', title: 'Unknown' },
    d: { icon: '&#9881;', class: 'support-a', title: 'Disabled by default' }
};

// File lists (static for now, could be dynamic with a manifest)
// "IDEs" = developer interfaces (editors, CLIs, desktop apps)
const IDE_FILES = [
    'vscode', 'cursor', 'visual-studio', 'jetbrains', 'android-studio', 'xcode',
    'windsurf', 'zed', 'neovim', 'emacs', 'void', 'pearai',
    'firebase-studio', 'gemini-cli', 'jules', 'lovable',
    'claude-desktop', 'claude-code', 'codex-cli'
];

const AI_CLIENT_FILES = [
    'github-copilot', 'cline', 'continue', 'cody', 'tabnine', 'codeium', 'amazonq', 'gemini-code-assist',
    'native',
    'avante', 'codecompanion', 'gptel', 'ellama',
    'claude-code', 'codex-cli'
];

const FEATURE_FILES = [
    'tools', 'resources', 'prompts', 'sampling', 'elicitation', 'roots'
];


// Load JSON file
async function loadJSON(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Failed to load ${path}:`, error);
        return null;
    }
}

// Load all data
async function loadAllData() {
    // Load IDEs
    const idePromises = IDE_FILES.map(async (id) => {
        const data = await loadJSON(`${DATA_PATH}/ides/${id}.json`);
        if (data) ides[id] = data;
    });

    // Load AI clients
    const aiPromises = AI_CLIENT_FILES.map(async (id) => {
        const data = await loadJSON(`${DATA_PATH}/ai-clients/${id}.json`);
        if (data) aiClients[id] = data;
    });

    // Load features
    const featurePromises = FEATURE_FILES.map(async (id) => {
        const data = await loadJSON(`${DATA_PATH}/features/${id}.json`);
        if (data) features[id] = data;
    });

    // Load changelog
    const changelogPromise = loadJSON(`${DATA_PATH}/changelog.json`).then(data => {
        if (data) changelog = data;
    });

    await Promise.all([
        ...idePromises,
        ...aiPromises,
        ...featurePromises,
        changelogPromise
    ]);
}

// Get all valid IDE+AI client combinations
function getClientCombinations() {
    const combos = [];

    for (const [ideId, ide] of Object.entries(ides)) {
        for (const aiClientId of ide.compatible_ai_clients || []) {
            const aiClient = aiClients[aiClientId];
            if (aiClient) {
                combos.push({
                    key: `${ideId}+${aiClientId}`,
                    ide: ide,
                    ideId: ideId,
                    aiClient: aiClient,
                    aiClientId: aiClientId
                });
            }
        }
    }

    return combos;
}

// Parse support value (e.g., "y #1" -> { code: 'y', noteRef: '1' })
function parseSupport(value) {
    if (!value) return { code: 'u', noteRef: null };

    const match = value.match(/^([yandu])\s*(?:#(\d+))?$/);
    if (match) {
        return {
            code: match[1],
            noteRef: match[2] || null
        };
    }

    return { code: 'u', noteRef: null };
}

// Render support cell
function renderSupportCell(support, notes) {
    const { code, noteRef } = parseSupport(support);
    const iconInfo = SUPPORT_ICONS[code] || SUPPORT_ICONS.u;

    // Build note text if there's a reference
    let noteText = null;
    if (noteRef && notes && notes[noteRef]) {
        noteText = notes[noteRef];
    }

    const noteAttr = noteText ? ` data-note="${escapeHtml(noteText)}"` : '';
    let html = `<span class="support-icon ${iconInfo.class}"${noteAttr}>${iconInfo.icon}</span>`;

    return html;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Render plugins availability matrix
function renderPluginsMatrix() {
    const container = document.getElementById('plugins-matrix');

    if (Object.keys(ides).length === 0 || Object.keys(aiClients).length === 0) {
        container.innerHTML = '<p class="loading">No data available</p>';
        return;
    }

    // Separate IDEs into those with plugin ecosystems vs native-only
    const pluginEcosystems = []; // Multiple AI client options
    const nativeOnly = [];       // Only native/built-in AI

    for (const ideId of IDE_FILES) {
        const ide = ides[ideId];
        if (!ide) continue;

        const clients = ide.compatible_ai_clients || [];
        // Has plugin ecosystem if it supports more than just "native"
        const hasPlugins = clients.length > 1 || (clients.length === 1 && clients[0] !== 'native');

        if (hasPlugins) {
            pluginEcosystems.push({ id: ideId, ...ide });
        } else {
            nativeOnly.push({ id: ideId, ...ide });
        }
    }

    // Get all non-native AI clients for the plugin ecosystem table
    const pluginClientIds = new Set();
    for (const ide of pluginEcosystems) {
        for (const clientId of ide.compatible_ai_clients || []) {
            if (clientId !== 'native') {
                pluginClientIds.add(clientId);
            }
        }
    }
    const sortedPluginClients = Array.from(pluginClientIds);

    let html = '';

    // Section 1: Plugin Ecosystems
    html += '<h3>With Plugin Ecosystem</h3>';
    html += '<p class="subsection-note">These interfaces support multiple AI assistants via plugins/extensions.</p>';
    html += '<table class="matrix-table">';

    // Header
    html += '<thead><tr>';
    html += '<th class="feature-header">Developer Interface</th>';
    html += '<th class="client-header"><span class="ai-name">Native</span></th>';
    for (const clientId of sortedPluginClients) {
        const client = aiClients[clientId];
        const name = client ? client.name : clientId;
        html += `<th class="client-header"><span class="ai-name">${escapeHtml(name)}</span></th>`;
    }
    html += '</tr></thead>';

    // Rows
    html += '<tbody>';
    for (const ide of pluginEcosystems) {
        html += '<tr>';
        html += `<td class="feature-cell">${escapeHtml(ide.name)}</td>`;

        // Native column
        const hasNative = (ide.compatible_ai_clients || []).includes('native');
        const nativeClient = aiClients['native'];
        const nativeName = nativeClient?.native_names?.[ide.id];
        const nativeNoteAttr = nativeName ? ` data-note="${escapeHtml(nativeName)}"` : '';
        html += `<td class="support-cell"><span class="support-icon ${hasNative ? 'support-y' : 'support-n'}"${nativeNoteAttr}>${hasNative ? '&#10003;' : '&#10005;'}</span></td>`;

        // Plugin columns
        for (const clientId of sortedPluginClients) {
            const isCompatible = (ide.compatible_ai_clients || []).includes(clientId);
            html += `<td class="support-cell"><span class="support-icon ${isCompatible ? 'support-y' : 'support-n'}" title="${isCompatible ? 'Available' : 'Not available'}">${isCompatible ? '&#10003;' : '&#10005;'}</span></td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table>';

    // Section 2: Native Only
    if (nativeOnly.length > 0) {
        html += '<h3>Native AI Only</h3>';
        html += '<p class="subsection-note">These interfaces have built-in AI without a plugin architecture.</p>';
        html += '<table class="matrix-table native-only-table">';
        html += '<thead><tr><th class="feature-header">Developer Interface</th><th class="client-header"><span class="ai-name">Native</span></th></tr></thead>';
        html += '<tbody>';
        const nativeClient = aiClients['native'];
        for (const ide of nativeOnly) {
            const nativeName = nativeClient?.native_names?.[ide.id];
            const noteAttr = nativeName ? ` data-note="${escapeHtml(nativeName)}"` : '';
            html += `<tr><td class="feature-cell">${escapeHtml(ide.name)}</td>`;
            html += `<td class="support-cell"><span class="support-icon support-y"${noteAttr}>&#10003;</span></td></tr>`;
        }
        html += '</tbody></table>';
    }

    container.innerHTML = html;
}

// Render features matrix
function renderFeaturesMatrix() {
    const container = document.getElementById('features-matrix');
    const combos = getClientCombinations();

    if (combos.length === 0 || Object.keys(features).length === 0) {
        container.innerHTML = '<p class="loading">No data available</p>';
        return;
    }

    // Collect all notes
    const allNotes = {};
    for (const feature of Object.values(features)) {
        if (feature.notes) {
            for (const [key, value] of Object.entries(feature.notes)) {
                allNotes[key] = value;
            }
        }
    }

    let html = '<table class="matrix-table">';

    // Header row
    html += '<thead><tr>';
    html += '<th class="feature-header">Feature</th>';
    for (const combo of combos) {
        // For standalone apps (desktop/cli), just show AI client name
        const isStandalone = combo.ide.category === 'desktop' || combo.ide.category === 'cli';
        if (isStandalone) {
            html += `<th class="client-header">
                <span class="ai-name standalone">${escapeHtml(combo.aiClient.name)}</span>
            </th>`;
        } else {
            html += `<th class="client-header">
                <span class="ide-name">${escapeHtml(combo.ide.name)}</span>
                <span class="ai-name">${escapeHtml(combo.aiClient.name)}</span>
            </th>`;
        }
    }
    html += '</tr></thead>';

    // Feature rows
    html += '<tbody>';
    for (const featureId of FEATURE_FILES) {
        const feature = features[featureId];
        if (!feature) continue;

        html += '<tr>';
        html += `<td class="feature-cell">
            <a href="${escapeHtml(feature.spec_url)}" target="_blank" rel="noopener" class="feature-link" title="${escapeHtml(feature.description)}">
                ${escapeHtml(feature.title)}
                <span class="spec-link-icon">&#8599;</span>
            </a>
        </td>`;

        for (const combo of combos) {
            const support = feature.stats ? feature.stats[combo.key] : null;
            html += `<td class="support-cell">${renderSupportCell(support, feature.notes)}</td>`;
        }

        html += '</tr>';
    }
    html += '</tbody></table>';

    // Notes section
    if (Object.keys(allNotes).length > 0) {
        html += '<div class="matrix-notes"><h4>Notes</h4><ul>';
        for (const [key, value] of Object.entries(allNotes)) {
            html += `<li><strong>#${key}</strong>: ${escapeHtml(value)}</li>`;
        }
        html += '</ul></div>';
    }

    container.innerHTML = html;
}
// Render changelog
function renderChangelog() {
    const container = document.getElementById('changelog-list');

    if (!changelog.entries || changelog.entries.length === 0) {
        container.innerHTML = '<p class="loading">No changelog entries</p>';
        return;
    }

    // Sort by date descending
    const sorted = [...changelog.entries].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    );

    let html = '';
    for (const entry of sorted) {
        const typeClass = entry.type === 'spec' ? 'type-spec' : 'type-client';

        html += `<article class="changelog-entry ${typeClass}">
            <div class="changelog-header">
                <span class="changelog-title">${escapeHtml(entry.title)}</span>
                <span class="changelog-date">${escapeHtml(entry.date)}</span>
            </div>
            <span class="changelog-type">${escapeHtml(entry.type)}</span>
            <p class="changelog-description">${escapeHtml(entry.description)}</p>`;

        if (entry.links && entry.links.length > 0) {
            html += '<div class="changelog-links">';
            for (const link of entry.links) {
                html += `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.title)} &rarr;</a>`;
            }
            html += '</div>';
        }

        html += '</article>';
    }

    container.innerHTML = html;
}

// Initialize
async function init() {
    await loadAllData();
    renderPluginsMatrix();
    renderFeaturesMatrix();
    renderChangelog();
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
