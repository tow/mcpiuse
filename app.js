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
    'claude-desktop', 'claude-code', 'codex-cli', 'amp'
];

const AI_CLIENT_FILES = [
    'github-copilot', 'cline', 'continue', 'cody', 'tabnine', 'codeium', 'amazonq', 'gemini-code-assist', 'amp', 'augment',
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
function renderSupportCell(support, notes, source, comboKey, featureId) {
    const { code, noteRef } = parseSupport(support);
    const iconInfo = SUPPORT_ICONS[code] || SUPPORT_ICONS.u;

    // Build note text if there's a reference
    let noteText = null;
    if (noteRef && notes && notes[noteRef]) {
        noteText = notes[noteRef];
    }

    // Store only identifiers - lookup happens in showSourceModal
    const dataAttrs = `data-combo-key="${escapeHtml(comboKey)}" data-feature-id="${escapeHtml(featureId)}"`;
    const noteAttr = noteText ? ` data-note="${escapeHtml(noteText)}"` : '';
    const hasSource = source ? ' has-source' : '';

    let html = `<span class="support-icon ${iconInfo.class}${hasSource}"${noteAttr} ${dataAttrs} onclick="showSourceModal(this)">${iconInfo.icon}</span>`;

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
        const nativeOnclick = nativeName ? ` onclick="toggleNote(this)"` : '';
        html += `<td class="support-cell"><span class="support-icon ${hasNative ? 'support-y' : 'support-n'}"${nativeNoteAttr}${nativeOnclick}>${hasNative ? '&#10003;' : '&#10005;'}</span></td>`;

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
            const noteOnclick = nativeName ? ` onclick="toggleNote(this)"` : '';
            html += `<tr><td class="feature-cell">${escapeHtml(ide.name)}</td>`;
            html += `<td class="support-cell"><span class="support-icon support-y"${noteAttr}${noteOnclick}>&#10003;</span></td></tr>`;
        }
        html += '</tbody></table>';
    }

    container.innerHTML = html;
}

// Render features matrix (transposed: clients as rows, features as columns, grouped by IDE)
function renderFeaturesMatrix() {
    const container = document.getElementById('features-matrix');
    const combos = getClientCombinations();

    if (combos.length === 0 || Object.keys(features).length === 0) {
        container.innerHTML = '<p class="loading">No data available</p>';
        return;
    }

    // Build ordered feature list
    const featureList = FEATURE_FILES.map(id => features[id]).filter(f => f);

    // Group combos by IDE
    const groupedByIde = {};
    for (const combo of combos) {
        const ideId = combo.ideId;
        if (!groupedByIde[ideId]) {
            groupedByIde[ideId] = {
                ide: combo.ide,
                combos: []
            };
        }
        groupedByIde[ideId].combos.push(combo);
    }

    let html = '<table class="matrix-table transposed">';

    // Header row: Client | Feature1 | Feature2 | ...
    html += '<thead><tr>';
    html += '<th class="client-header-cell">Client</th>';
    for (const feature of featureList) {
        html += `<th class="feature-header-cell">
            <a href="${escapeHtml(feature.spec_url)}" target="_blank" rel="noopener" class="feature-link" title="${escapeHtml(feature.description)}">
                ${escapeHtml(feature.title)}
                <span class="spec-link-icon">&#8599;</span>
            </a>
        </th>`;
    }
    html += '</tr></thead>';

    // Sort IDEs: by plugin count descending, then alphabetically
    const sortedIdeIds = Object.keys(groupedByIde).sort((a, b) => {
        const countDiff = groupedByIde[b].combos.length - groupedByIde[a].combos.length;
        if (countDiff !== 0) return countDiff;
        return groupedByIde[a].ide.name.localeCompare(groupedByIde[b].ide.name);
    });

    // Body rows: grouped by IDE
    html += '<tbody>';
    for (const ideId of sortedIdeIds) {
        const group = groupedByIde[ideId];
        if (!group) continue;

        const ide = group.ide;
        const groupId = `group-${ideId}`;

        // For single-plugin IDEs, don't make it collapsible
        if (group.combos.length === 1) {
            const combo = group.combos[0];
            // Use IDE name for single-plugin entries
            const displayName = ide.name;
            html += `<tr>`;
            html += `<td class="client-name-cell">
                <span class="ai-name standalone">${escapeHtml(displayName)}</span>
            </td>`;
            for (const feature of featureList) {
                const support = feature.stats ? feature.stats[combo.key] : null;
                const source = feature.sources ? feature.sources[combo.key] : null;
                html += `<td class="support-cell">${renderSupportCell(support, feature.notes, source, combo.key, feature.id)}</td>`;
            }
            html += '</tr>';
        } else {
            // IDE group header row (collapsible)
            html += `<tr class="ide-group-header" data-group="${groupId}" onclick="toggleGroup('${groupId}')">`;
            html += `<td class="ide-header-cell" colspan="${featureList.length + 1}">
                <span class="expand-icon">&#9654;</span>
                <span class="ide-name">${escapeHtml(ide.name)}</span>
                <span class="client-count">${group.combos.length} plugins</span>
            </td>`;
            html += '</tr>';

            // AI client rows (hidden by default)
            for (const combo of group.combos) {
                // For "native" AI client, show the native name if available
                let aiName = combo.aiClient.name;
                if (combo.aiClientId === 'native') {
                    const nativeName = combo.aiClient.native_names?.[ideId];
                    aiName = nativeName || ide.name + ' (Native)';
                }
                html += `<tr class="ide-group-row ${groupId}" style="display: none;">`;
                html += `<td class="client-name-cell">
                    <span class="ai-name">${escapeHtml(aiName)}</span>
                </td>`;
                for (const feature of featureList) {
                    const support = feature.stats ? feature.stats[combo.key] : null;
                    const source = feature.sources ? feature.sources[combo.key] : null;
                    html += `<td class="support-cell">${renderSupportCell(support, feature.notes, source, combo.key, feature.id)}</td>`;
                }
                html += '</tr>';
            }
        }
    }
    html += '</tbody></table>';

    container.innerHTML = html;
}

// Toggle visibility of IDE group rows
function toggleGroup(groupId) {
    const header = document.querySelector(`tr[data-group="${groupId}"]`);
    const rows = document.querySelectorAll(`tr.${groupId}`);
    const isExpanded = header.classList.toggle('expanded');

    rows.forEach(row => {
        row.style.display = isExpanded ? '' : 'none';
    });
}

// Show source modal when clicking on a support cell
function showSourceModal(element) {
    // Prevent event from bubbling (e.g., to group toggle)
    event.stopPropagation();

    const comboKey = element.dataset.comboKey;
    const featureId = element.dataset.featureId;
    const note = element.dataset.note;

    // Get feature and source data directly from loaded data
    const feature = features[featureId];
    if (!feature) {
        console.error('Feature not found:', featureId);
        return;
    }

    const featureTitle = feature.title || featureId;
    const source = feature.sources?.[comboKey];
    const url = source ? (typeof source === 'string' ? source : source.url) : null;
    const evidence = source && typeof source === 'object' ? source.evidence : null;

    // Parse combo key for display
    let clientDisplay = comboKey;
    if (comboKey) {
        const [ideId, aiClientId] = comboKey.split('+');
        const ide = ides[ideId];
        const aiClient = aiClients[aiClientId];
        const ideName = ide ? ide.name : ideId;
        const aiName = aiClient ? (aiClientId === 'native' ? (aiClient.native_names?.[ideId] || 'Native') : aiClient.name) : aiClientId;
        clientDisplay = `${ideName} + ${aiName}`;
    }

    // Get or create modal
    let modal = document.getElementById('source-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'source-modal';
        modal.className = 'source-modal';
        modal.innerHTML = `
            <div class="source-modal-content">
                <button class="source-modal-close" onclick="closeSourceModal()">&times;</button>
                <h3 class="source-modal-title"></h3>
                <div class="source-modal-client"></div>
                <div class="source-modal-note"></div>
                <div class="source-modal-evidence"></div>
                <div class="source-modal-link"></div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeSourceModal();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeSourceModal();
        });
    }

    // Populate modal
    modal.querySelector('.source-modal-title').textContent = featureTitle;
    modal.querySelector('.source-modal-client').textContent = clientDisplay;

    const noteEl = modal.querySelector('.source-modal-note');
    if (note) {
        noteEl.innerHTML = `<strong>Note:</strong> ${escapeHtml(note)}`;
        noteEl.style.display = 'block';
    } else {
        noteEl.style.display = 'none';
    }

    const evidenceEl = modal.querySelector('.source-modal-evidence');
    if (evidence) {
        evidenceEl.innerHTML = `<strong>Evidence:</strong> ${escapeHtml(evidence)}`;
        evidenceEl.style.display = 'block';
    } else {
        evidenceEl.innerHTML = '<strong>Evidence:</strong> <em>No evidence recorded</em>';
        evidenceEl.style.display = 'block';
    }

    const linkEl = modal.querySelector('.source-modal-link');
    if (url) {
        linkEl.innerHTML = `
            <a href="${url}" target="_blank" rel="noopener" class="source-button">View Source Documentation &rarr;</a>
            <div class="source-url">${escapeHtml(url)}</div>
        `;
        linkEl.style.display = 'block';
    } else {
        linkEl.innerHTML = '<em>No source URL available</em>';
        linkEl.style.display = 'block';
    }

    // Show modal
    modal.classList.add('active');
}

// Close source modal
function closeSourceModal() {
    const modal = document.getElementById('source-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Toggle note tooltip visibility (for click on plugin availability cells)
function toggleNote(element) {
    event.stopPropagation();
    // Remove show-note from all other elements
    document.querySelectorAll('.support-icon.show-note').forEach(el => {
        if (el !== element) el.classList.remove('show-note');
    });
    // Toggle on clicked element
    element.classList.toggle('show-note');
}

// Close note tooltips when clicking elsewhere
document.addEventListener('click', () => {
    document.querySelectorAll('.support-icon.show-note').forEach(el => {
        el.classList.remove('show-note');
    });
});

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
