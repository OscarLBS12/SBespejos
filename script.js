function calculateCost() {
    // Inputs
    const widthCm = parseFloat(document.getElementById('width').value);
    const heightCm = parseFloat(document.getElementById('height').value);
    const thickness = document.getElementById('thickness').value; // '3', '4', '5', '6'
    const baseType = document.getElementById('base').value;
    const ledCount = parseInt(document.getElementById('led-count').value) || 0;
    const cutsCount = parseInt(document.getElementById('cuts-count').value) || 0;

    if (isNaN(widthCm) || isNaN(heightCm) || widthCm <= 0 || heightCm <= 0) {
        alert("Por favor ingresa dimensiones positivas válidas.");
        return false;
    }

    // Convert dimensions to meters for calculation
    const widthM = widthCm / 100;
    const heightM = heightCm / 100;
    const areaM2 = widthM * heightM;
    const perimeterM = 2 * (widthM + heightM);

    // --- Pricing Configuration ---
    const cfg = getConfig();

    const glassPrices = cfg.glassPrices;

    const basePrices = cfg.basePrices;

    const ledBaseCost = cfg.led.baseCost;
    const ledStripCost = cfg.led.stripCost;
    const cutPrice = cfg.cuts.price;
    const extrasPrices = cfg.extras;

    // --- Calculation ---

    // Glass Cost
    const pricePerM2 = glassPrices[thickness] || 0;
    const glassCost = areaM2 * pricePerM2;

    // Base Cost
    let baseCost = 0;
    const baseConfig = basePrices[baseType];
    if (baseConfig) {
        if (baseConfig.type === 'fixed') {
            baseCost = baseConfig.price;
        } else if (baseConfig.type === 'perimeter') {
            baseCost = perimeterM * baseConfig.price;
        } else if (baseConfig.type === 'area') {
            baseCost = areaM2 * baseConfig.price;
        } else if (baseConfig.type === 'aluminum_special') {
            // 2 bases, each is 20cm shorter than height
            // Cost is per cm
            const baseLengthCm = Math.max(0, heightCm - 20);
            const totalBaseLengthCm = baseLengthCm * 2;
            baseCost = totalBaseLengthCm * baseConfig.pricePerCm;
        }
    }

    // LED Cost
    let ledCost = 0;
    if (ledCount > 0) {
        ledCost = ledBaseCost + (ledCount * ledStripCost);
    }
    // Cuts Cost
    const cutsCost = cutsCount * cutPrice;

    // Extras (perímetro * precio por metro de cada extra seleccionado)
    const extraArenado = document.getElementById('extra-arenado')?.checked;
    const extraCanto = document.getElementById('extra-canto')?.checked;
    const extraBiselado = document.getElementById('extra-biselado')?.checked;
    const extraMarco = document.getElementById('extra-marco')?.checked;
    const extrasRatePerM =
        (extraArenado ? (extrasPrices.arenado || 0) : 0) +
        (extraCanto ? (extrasPrices.canto_pulido || 0) : 0) +
        (extraBiselado ? (extrasPrices.biselado || 0) : 0) +
        (extraMarco ? (extrasPrices.marco || 0) : 0);
    const extrasCost = perimeterM * extrasRatePerM;

    // Total Cost
    const totalCost = glassCost + baseCost + ledCost + cutsCost + extrasCost;

    // Sell Price & Profit
    const profit = totalCost * cfg.profitMultiplier;
    const sellPrice = totalCost + profit;

    // --- Display Results ---
    document.getElementById('glass-cost').textContent = glassCost.toFixed(2);
    document.getElementById('base-cost').textContent = baseCost.toFixed(2);
    document.getElementById('led-cost').textContent = ledCost.toFixed(2);
    document.getElementById('cuts-cost').textContent = cutsCost.toFixed(2);
    document.getElementById('extras-cost').textContent = extrasCost.toFixed(2);
    document.getElementById('total-cost').textContent = totalCost.toFixed(2);
    
    document.getElementById('profit').textContent = profit.toFixed(2);
    document.getElementById('sell-price').textContent = sellPrice.toFixed(2);
    const manuf = document.getElementById('manufacturing-cost');
    if (manuf) manuf.textContent = (sellPrice * 0.8).toFixed(2);

    const me = getCurrentUser?.() || null;
    const isEmployee = !!(me && me.role !== 'admin');
    const breakdownDiv = document.querySelector('.breakdown');
    const profitInfo = document.querySelector('.profit-info');
    const costHeader = document.querySelector('#result h2');
    if (isEmployee) {
        if (breakdownDiv) breakdownDiv.style.display = 'none';
        if (profitInfo) profitInfo.style.display = 'none';
        if (costHeader) costHeader.style.display = 'none';
    } else {
        if (breakdownDiv) breakdownDiv.style.display = 'block';
        if (profitInfo) profitInfo.style.display = '';
        if (costHeader) costHeader.style.display = 'block';
    }

    document.getElementById('result').classList.remove('hidden');
    return true;
}

const defaultConfig = {
    glassPrices: { '3': 235.04, '4': 341.88, '5': 373.93, '6': 446.58 },
    basePrices: {
        glue: { type: 'fixed', price: 530 },
        hooks: { type: 'fixed', price: 350 },
        aluminum: { type: 'fixed', price: 350 },
        wood_frame: { type: 'perimeter', price: 1000 }
    },
    led: { baseCost: 0, stripCost: 350, stripLength: 5 },
    cuts: { price: 250 },
    extras: { arenado: 140, canto_pulido: 80, biselado: 160, marco: 200 },
    profitMultiplier: 1.5,
    labels: {
        base: {
            glue: 'Pegamento',
            hooks: 'Ganchos simples',
            aluminum: 'Base de aluminio',
            wood_frame: 'Marco de madera'
        },
        extras: {
            arenado: 'Arenado',
            canto_pulido: 'Canto pulido',
            biselado: 'Biselado',
            marco: 'Marco'
        }
    }
};

function getConfig() {
    try {
        const raw = localStorage.getItem('mirrorConfig');
        if (!raw) return defaultConfig;
        const stored = JSON.parse(raw);
        return {
            glassPrices: { ...defaultConfig.glassPrices, ...(stored.glassPrices || {}) },
            basePrices: { ...defaultConfig.basePrices, ...(stored.basePrices || {}) },
            led: { ...defaultConfig.led, ...(stored.led || {}) },
            cuts: { ...defaultConfig.cuts, ...(stored.cuts || {}) },
            extras: { ...defaultConfig.extras, ...(stored.extras || {}) },
            profitMultiplier: stored.profitMultiplier ?? defaultConfig.profitMultiplier,
            labels: {
                base: { ...defaultConfig.labels.base, ...(((stored.labels || {}).base) || {}) },
                extras: { ...defaultConfig.labels.extras, ...(((stored.labels || {}).extras) || {}) }
            }
        };
    } catch {
        return defaultConfig;
    }
}

function setConfig(cfg) {
    localStorage.setItem('mirrorConfig', JSON.stringify(cfg));
    cloudPut('config', cfg);
}

function initConfigForm() {
    const cfg = getConfig();
    const g3 = document.getElementById('price-3'); if (g3) g3.value = cfg.glassPrices['3'];
    const g4 = document.getElementById('price-4'); if (g4) g4.value = cfg.glassPrices['4'];
    const g5 = document.getElementById('price-5'); if (g5) g5.value = cfg.glassPrices['5'];
    const g6 = document.getElementById('price-6'); if (g6) g6.value = cfg.glassPrices['6'];
    const bGlue = document.getElementById('base-glue-price'); if (bGlue) bGlue.value = cfg.basePrices.glue.price;
    const bHooks = document.getElementById('base-hooks-price'); if (bHooks) bHooks.value = cfg.basePrices.hooks.price;
    const bAl = document.getElementById('base-aluminum-price'); if (bAl) bAl.value = cfg.basePrices.aluminum.price;
    const bWood = document.getElementById('base-wood-price'); if (bWood) bWood.value = cfg.basePrices.wood_frame.price;
    const ledStrip = document.getElementById('led-strip-cost'); if (ledStrip) ledStrip.value = cfg.led.stripCost;
    const ledBase = document.getElementById('led-base-cost'); if (ledBase) ledBase.value = cfg.led.baseCost;
    const cutCost = document.getElementById('cut-cost'); if (cutCost) cutCost.value = cfg.cuts.price;
    const eA = document.getElementById('extra-arenado-price'); if (eA) eA.value = cfg.extras.arenado;
    const eC = document.getElementById('extra-canto-price'); if (eC) eC.value = cfg.extras.canto_pulido;
    const eB = document.getElementById('extra-biselado-price'); if (eB) eB.value = cfg.extras.biselado;
    const eM = document.getElementById('extra-marco-price'); if (eM) eM.value = cfg.extras.marco;
    const profitMul = document.getElementById('profit-multiplier'); if (profitMul) profitMul.value = cfg.profitMultiplier;
    const lBG = document.getElementById('base-glue-label'); if (lBG) lBG.value = cfg.labels.base.glue;
    const lBH = document.getElementById('base-hooks-label'); if (lBH) lBH.value = cfg.labels.base.hooks;
    const lBA = document.getElementById('base-aluminum-label'); if (lBA) lBA.value = cfg.labels.base.aluminum;
    const lBW = document.getElementById('base-wood-label'); if (lBW) lBW.value = cfg.labels.base.wood_frame;
    const lEA = document.getElementById('extra-arenado-label'); if (lEA) lEA.value = cfg.labels.extras.arenado;
    const lEC = document.getElementById('extra-canto-label'); if (lEC) lEC.value = cfg.labels.extras.canto_pulido;
    const lEB = document.getElementById('extra-biselado-label'); if (lEB) lEB.value = cfg.labels.extras.biselado;

    const optBG = document.getElementById('base-glue-option'); if (optBG) optBG.textContent = cfg.labels.base.glue;
    const optBH = document.getElementById('base-hooks-option'); if (optBH) optBH.textContent = cfg.labels.base.hooks;
    const optBA = document.getElementById('base-aluminum-option'); if (optBA) optBA.textContent = cfg.labels.base.aluminum;
    const optBW = document.getElementById('base-wood-option'); if (optBW) optBW.textContent = cfg.labels.base.wood_frame;
    const lblEA = document.getElementById('label-extra-arenado'); if (lblEA) lblEA.textContent = cfg.labels.extras.arenado;
    const lblEC = document.getElementById('label-extra-canto'); if (lblEC) lblEC.textContent = cfg.labels.extras.canto_pulido;
    const lblEB = document.getElementById('label-extra-biselado'); if (lblEB) lblEB.textContent = cfg.labels.extras.biselado;
    const lblEM = document.getElementById('label-extra-marco'); if (lblEM) lblEM.textContent = cfg.labels.extras.marco;
    const saveBtn = document.getElementById('save-config');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const newCfg = {
                glassPrices: {
                    '3': parseFloat((document.getElementById('price-3') || {}).value) || cfg.glassPrices['3'],
                    '4': parseFloat((document.getElementById('price-4') || {}).value) || cfg.glassPrices['4'],
                    '5': parseFloat((document.getElementById('price-5') || {}).value) || cfg.glassPrices['5'],
                    '6': parseFloat((document.getElementById('price-6') || {}).value) || cfg.glassPrices['6']
                },
                basePrices: {
                    glue: { type: 'fixed', price: parseFloat((document.getElementById('base-glue-price') || {}).value) || cfg.basePrices.glue.price },
                    hooks: { type: 'fixed', price: parseFloat((document.getElementById('base-hooks-price') || {}).value) || cfg.basePrices.hooks.price },
                    aluminum: { type: 'fixed', price: parseFloat((document.getElementById('base-aluminum-price') || {}).value) || cfg.basePrices.aluminum.price },
                    wood_frame: { type: 'perimeter', price: parseFloat((document.getElementById('base-wood-price') || {}).value) || cfg.basePrices.wood_frame.price }
                },
                led: {
                    baseCost: parseFloat((document.getElementById('led-base-cost') || {}).value) || cfg.led.baseCost,
                    stripCost: parseFloat((document.getElementById('led-strip-cost') || {}).value) || cfg.led.stripCost,
                    stripLength: cfg.led.stripLength
                },
                cuts: { price: parseFloat((document.getElementById('cut-cost') || {}).value) || cfg.cuts.price },
                extras: {
                    arenado: parseFloat((document.getElementById('extra-arenado-price') || {}).value) || cfg.extras.arenado,
                    canto_pulido: parseFloat((document.getElementById('extra-canto-price') || {}).value) || cfg.extras.canto_pulido,
                    biselado: parseFloat((document.getElementById('extra-biselado-price') || {}).value) || cfg.extras.biselado,
                    marco: parseFloat((document.getElementById('extra-marco-price') || {}).value) || cfg.extras.marco
                },
                profitMultiplier: parseFloat((document.getElementById('profit-multiplier') || {}).value) || cfg.profitMultiplier,
                labels: {
                    base: {
                        glue: (document.getElementById('base-glue-label') || {}).value || cfg.labels.base.glue,
                        hooks: (document.getElementById('base-hooks-label') || {}).value || cfg.labels.base.hooks,
                        aluminum: (document.getElementById('base-aluminum-label') || {}).value || cfg.labels.base.aluminum,
                        wood_frame: (document.getElementById('base-wood-label') || {}).value || cfg.labels.base.wood_frame
                    },
                    extras: {
                        arenado: (document.getElementById('extra-arenado-label') || {}).value || cfg.labels.extras.arenado,
                        canto_pulido: (document.getElementById('extra-canto-label') || {}).value || cfg.labels.extras.canto_pulido,
                        biselado: (document.getElementById('extra-biselado-label') || {}).value || cfg.labels.extras.biselado,
                        marco: (document.getElementById('extra-marco-label') || {}).value || cfg.labels.extras.marco
                    }
                }
            };
            setConfig(newCfg);
            alert('Configuración guardada');
        });
    }
}

document.addEventListener('DOMContentLoaded', initConfigForm);

const CLOUD = (typeof window !== 'undefined') && /netlify\.app$/.test(window.location.hostname);

async function cloudFetch(key) {
    if (!CLOUD) throw new Error('Cloud disabled');
    const res = await fetch(`/.netlify/functions/storage?key=${encodeURIComponent(key)}`, { method: 'GET' });
    if (!res.ok) throw new Error('Cloud fetch failed');
    return await res.json();
}

async function cloudPut(key, value) {
    if (!CLOUD) return;
    try {
        await fetch(`/.netlify/functions/storage?key=${encodeURIComponent(key)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(value ?? null)
        });
    } catch {}
}

async function syncCloudDown() {
    if (!CLOUD) return;
    try {
        const [users, clients, config] = await Promise.all([
            cloudFetch('users').catch(() => null),
            cloudFetch('clients').catch(() => null),
            cloudFetch('config').catch(() => null)
        ]);
        if (users) localStorage.setItem('mirrorUsers', JSON.stringify(users));
        if (clients) {
            localStorage.setItem('mirrorClients', JSON.stringify(clients));
            renderClients();
        }
        if (config) localStorage.setItem('mirrorConfig', JSON.stringify(config));
    } catch {}
}

async function enforceAccessOnLoad() {
    try {
        await syncCloudDown();
        const me = getCurrentUser();
        const path = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
        const onLogin = path.includes('login.html');
        const onIndex = path.endsWith('index.html') || (!path.includes('.html'));
        const onClients = path.includes('clients.html');
        const onAdmin = path.includes('admin.html');
        if (onLogin) return;
        if (!me) {
            if (typeof window !== 'undefined') window.location.href = 'login.html';
            return;
        }
        if (onClients && me.role !== 'admin') {
            if (typeof window !== 'undefined') window.location.href = 'index.html';
            return;
        }
        if (onAdmin && me.role !== 'admin') {
            if (typeof window !== 'undefined') window.location.href = 'index.html';
            return;
        }
        if (onIndex && me.role !== 'admin') {
            const config = document.querySelector('details.config-section');
            if (config) config.style.display = 'none';
            const navClients = document.getElementById('nav-clients');
            if (navClients) navClients.style.display = 'none';
            const navAdmin = document.getElementById('nav-admin');
            if (navAdmin) navAdmin.style.display = 'none';
            const breakdownDiv = document.querySelector('.breakdown');
            if (breakdownDiv) breakdownDiv.style.display = 'none';
            const profitInfo = document.querySelector('.profit-info');
            if (profitInfo) profitInfo.style.display = 'none';
            const costHeader = document.querySelector('#result h2');
            if (costHeader) costHeader.style.display = 'none';
        }
        if (onClients && me.role !== 'admin') {
            const navAdmin2 = document.getElementById('nav-admin');
            if (navAdmin2) navAdmin2.style.display = 'none';
        }
    } catch {}
}

document.addEventListener('DOMContentLoaded', enforceAccessOnLoad);

function ensureClientsUI() {
    const container = document.getElementById('app-container');
    if (!container) return;
    let tabs = container.querySelector('.tabs');
    if (!tabs) {
        tabs = document.createElement('div');
        tabs.className = 'tabs';
        const btnCalc = document.createElement('button');
        btnCalc.type = 'button';
        btnCalc.className = 'tab-btn';
        btnCalc.id = 'tab-btn-calculadora';
        btnCalc.textContent = 'Calculadora';
        const btnCli = document.createElement('button');
        btnCli.type = 'button';
        btnCli.className = 'tab-btn active';
        btnCli.id = 'tab-btn-clientes';
        btnCli.textContent = 'Clientes';
        tabs.appendChild(btnCalc);
        tabs.appendChild(btnCli);
        container.insertBefore(tabs, container.firstChild);
    }
    let cli = document.getElementById('tab-clientes');
    if (!cli) {
        cli = document.createElement('div');
        cli.id = 'tab-clientes';
        cli.className = 'tab-section';
        cli.innerHTML = `
            <h1>Clientes</h1>
            <p>Consulta aquí los clientes y cotizaciones guardados desde la calculadora.</p>
            <div class="table-wrap">
                <table class="table" id="clients-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Dirección</th>
                            <th>Descripción</th>
                            <th>Costo</th>
                            <th>Anticipo</th>
                            <th>Adeudo</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="clients-tbody"></tbody>
                </table>
            </div>
        `;
        container.appendChild(cli);
    }
    let calc = document.getElementById('tab-calculadora');
    if (calc && !calc.classList.contains('tab-section')) {
        calc.classList.add('tab-section');
    }
}

function getClients() {
    try {
        const raw = localStorage.getItem('mirrorClients');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function setClients(arr) {
    localStorage.setItem('mirrorClients', JSON.stringify(arr));
    cloudPut('clients', arr);
}

function renderClients() {
    const tbody = document.getElementById('clients-tbody');
    if (!tbody) return;
    const data = getClients();
    tbody.innerHTML = '';
    for (const item of data) {
        const isPaid = !!item.pagado || Number(item.adeudo || 0) <= 0;
        const tr = document.createElement('tr');
        const tdNom = document.createElement('td'); tdNom.textContent = item.nombre || '';
        const tdTel = document.createElement('td'); tdTel.textContent = item.telefono || '';
        const tdDir = document.createElement('td'); tdDir.textContent = item.direccion || '';
        const tdDesc = document.createElement('td'); tdDesc.textContent = item.descripcion || '';
        const tdCosto = document.createElement('td'); tdCosto.textContent = Number(item.costo || 0).toFixed(2);
        const tdAnt = document.createElement('td'); tdAnt.textContent = Number(item.anticipo || 0).toFixed(2);
        const tdAde = document.createElement('td'); tdAde.textContent = Number(item.adeudo || 0).toFixed(2);
        const tdEstado = document.createElement('td');
        tdEstado.textContent = isPaid ? 'Pagado' : 'Pendiente';
        tdEstado.style.fontWeight = '600';
        tdEstado.style.color = isPaid ? '#2e7d32' : '#b02a37';
        tr.appendChild(tdNom);
        tr.appendChild(tdTel);
        tr.appendChild(tdDir);
        tr.appendChild(tdDesc);
        tr.appendChild(tdCosto);
        tr.appendChild(tdAnt);
        tr.appendChild(tdAde);
        tr.appendChild(tdEstado);
        tbody.appendChild(tr);
    }
}

function clearClientForm() {
    const f = {
        nombre: document.getElementById('client-nombre'),
        telefono: document.getElementById('client-telefono'),
        direccion: document.getElementById('client-direccion'),
        descripcion: document.getElementById('client-descripcion'),
        costo: document.getElementById('client-costo'),
        anticipo: document.getElementById('client-anticipo'),
        adeudo: document.getElementById('client-adeudo')
    };
    if (f.nombre) f.nombre.value = '';
    if (f.telefono) f.telefono.value = '';
    if (f.direccion) f.direccion.value = '';
    if (f.descripcion) f.descripcion.value = '';
    if (f.costo) f.costo.value = '0';
    if (f.anticipo) f.anticipo.value = '0';
    if (f.adeudo) f.adeudo.value = '0';
    if (f.costo && f.anticipo) {
        const c = parseFloat(f.costo.value || '0') || 0;
        f.anticipo.value = (c * 0.5).toFixed(2);
    }
    if (typeof window !== 'undefined') window.__anticipoUserEdited = false;
}

function updateAdeudoField() {
    const costo = parseFloat(document.getElementById('client-costo')?.value || '0') || 0;
    const anticipo = parseFloat(document.getElementById('client-anticipo')?.value || '0') || 0;
    const adeudo = Math.max(0, costo - anticipo);
    const adeudoEl = document.getElementById('client-adeudo');
    if (adeudoEl) adeudoEl.value = adeudo.toFixed(2);
}

function onCostoChange() {
    const costoEl = document.getElementById('client-costo');
    const anticipoEl = document.getElementById('client-anticipo');
    const costo = parseFloat(costoEl?.value || '0') || 0;
    if (!window.__anticipoUserEdited && anticipoEl) {
        anticipoEl.value = (costo * 0.5).toFixed(2);
    }
    updateAdeudoField();
}

function onAnticipoChange() {
    window.__anticipoUserEdited = true;
    updateAdeudoField();
}

function saveClient() {
    const nombre = document.getElementById('client-nombre')?.value.trim();
    const telefono = document.getElementById('client-telefono')?.value.trim() || '';
    const direccion = document.getElementById('client-direccion')?.value.trim() || '';
    const descripcion = document.getElementById('client-descripcion')?.value.trim() || '';
    const costo = parseFloat(document.getElementById('client-costo')?.value || '0') || 0;
    const anticipo = parseFloat(document.getElementById('client-anticipo')?.value || '0') || 0;
    const adeudo = Math.max(0, costo - anticipo);
    if (!nombre) {
        alert('Ingresa el nombre del cliente');
        return;
    }
    const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        nombre,
        telefono,
        direccion,
        descripcion,
        costo,
        anticipo,
        adeudo,
        pagado: adeudo <= 0
    };
    const list = getClients();
    list.push(item);
    setClients(list);
    renderClients();
    clearClientForm();
}

function payInFull(id) {
    const list = getClients();
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) {
        const c = Number(list[idx].costo || 0);
        list[idx].anticipo = c;
        list[idx].adeudo = 0;
        list[idx].pagado = true;
        setClients(list);
        renderClients();
    }
}
function showTab(key) {
    const calc = document.getElementById('tab-calculadora');
    const cli = document.getElementById('tab-clientes');
    const btnC = document.getElementById('tab-btn-calculadora');
    const btnL = document.getElementById('tab-btn-clientes');
    if (!calc || !cli || !btnC || !btnL) return;
    if (key === 'clientes') {
        calc.classList.add('hidden');
        cli.classList.remove('hidden');
        btnC.classList.remove('active');
        btnL.classList.add('active');
    } else {
        cli.classList.add('hidden');
        calc.classList.remove('hidden');
        btnL.classList.remove('active');
        btnC.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const c = document.getElementById('client-costo');
    const a = document.getElementById('client-anticipo');
    if (c) c.addEventListener('input', onCostoChange);
    if (a) a.addEventListener('input', onAnticipoChange);
    const s = document.getElementById('client-save-btn');
    if (s) s.addEventListener('click', saveClient);
    const st = document.getElementById('client-add-btn-top');
    if (st) st.addEventListener('click', saveClient);
    const lb = document.getElementById('logout-btn');
    if (lb) lb.addEventListener('click', logout);
    renderClients();
    onCostoChange();
});

document.addEventListener('DOMContentLoaded', () => {
    const onLoginPage = document.getElementById('login-card') || document.getElementById('setup-admin-card');
    if (!onLoginPage) return;
    initAuthUI();
    const btnSetup = document.getElementById('setup-admin-btn');
    const btnLogin = document.getElementById('login-btn');
    if (btnSetup) btnSetup.addEventListener('click', setupAdmin);
    if (btnLogin) btnLogin.addEventListener('click', login);
    const pw = document.getElementById('login-password');
    const un = document.getElementById('login-username');
    if (pw) pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
    if (un) un.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
});

function renderAdminUsers() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    const me = getCurrentUser();
    const users = getUsers();
    tbody.innerHTML = '';
    for (const u of users) {
        const tr = document.createElement('tr');
        const tdU = document.createElement('td'); tdU.textContent = u.username;
        const tdR = document.createElement('td');
        const sel = document.createElement('select');
        sel.innerHTML = '<option value="employee">Proveedor</option><option value="admin">Administrador</option>';
        sel.value = u.role;
        sel.addEventListener('change', () => adminChangeRole(u.username, sel.value));
        tdR.appendChild(sel);
        const tdA = document.createElement('td');
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Restablecer contraseña';
        resetBtn.style.marginRight = '0.5rem';
        resetBtn.addEventListener('click', async () => {
            const np = prompt('Nueva contraseña para ' + u.username);
            if (!np) return;
            await adminResetPassword(u.username, np);
            alert('Contraseña actualizada');
        });
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Eliminar';
        delBtn.style.background = '#dc3545';
        delBtn.addEventListener('click', () => {
            if (me && me.username === u.username) {
                alert('No puedes eliminar tu propia cuenta.');
                return;
            }
            adminDeleteUser(u.username);
        });
        tdA.appendChild(resetBtn);
        tdA.appendChild(delBtn);
        tr.appendChild(tdU);
        tr.appendChild(tdR);
        tr.appendChild(tdA);
        tbody.appendChild(tr);
    }
}

function adminDeleteUser(username) {
    const users = getUsers();
    const remaining = users.filter(x => x.username !== username);
    const admins = remaining.filter(x => x.role === 'admin').length;
    if (admins === 0) {
        alert('Debe existir al menos un administrador.');
        return;
    }
    setUsers(remaining);
    renderAdminUsers();
}

async function adminResetPassword(username, newPass) {
    const users = getUsers();
    const idx = users.findIndex(x => x.username === username);
    if (idx < 0) return;
    users[idx].passHash = await hashPassword(username, newPass);
    setUsers(users);
}

function adminChangeRole(username, newRole) {
    const users = getUsers();
    const idx = users.findIndex(x => x.username === username);
    if (idx < 0) return;
    users[idx].role = newRole;
    const admins = users.filter(x => x.role === 'admin').length;
    if (admins === 0) {
        alert('Debe existir al menos un administrador.');
        return;
    }
    setUsers(users);
    renderAdminUsers();
}

document.addEventListener('DOMContentLoaded', () => {
    const adminTable = document.getElementById('users-tbody');
    if (!adminTable) return;
    const btnCreate = document.getElementById('create-user-btn');
    if (btnCreate) btnCreate.addEventListener('click', async () => {
        await createUser();
        renderAdminUsers();
    });
    renderAdminUsers();
});

// ===== Autenticación y gestión de usuarios =====
function simpleHashHex(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h >>> 0) * 16777619;
    }
    let hex = (h >>> 0).toString(16);
    while (hex.length < 8) hex = '0' + hex;
    return hex.repeat(8).slice(0, 64);
}

const DEFAULT_ADMIN = { username: 'admin', password: 'admin' };

async function hashPassword(username, password) {
    const input = `${username}:${password}`;
    try {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
            const enc = new TextEncoder();
            const data = enc.encode(input);
            const digest = await window.crypto.subtle.digest('SHA-256', data);
            const bytes = new Uint8Array(digest);
            return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch {}
    return simpleHashHex(input);
}

async function hashCandidates(username, password) {
    const input = `${username}:${password}`;
    const out = new Set();
    try {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
            const enc = new TextEncoder();
            const data = enc.encode(input);
            const digest = await window.crypto.subtle.digest('SHA-256', data);
            const bytes = new Uint8Array(digest);
            out.add(Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
        }
    } catch {}
    out.add(simpleHashHex(input));
    return Array.from(out);
}
function getUsers() {
    try {
        const raw = localStorage.getItem('mirrorUsers');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function setUsers(users) {
    localStorage.setItem('mirrorUsers', JSON.stringify(users));
    cloudPut('users', users);
}

function getCurrentUser() {
    try {
        const raw = localStorage.getItem('mirrorCurrentUser');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function setCurrentUser(u) {
    if (u) localStorage.setItem('mirrorCurrentUser', JSON.stringify(u));
    else localStorage.removeItem('mirrorCurrentUser');
}

function toggleAppVisibility(authNeeded) {
    const auth = document.getElementById('auth-container');
    const app = document.getElementById('app-container');
    const topbar = document.getElementById('topbar');
    if (authNeeded) {
        auth?.classList.remove('hidden');
        app?.classList.add('hidden');
        topbar?.classList.add('hidden');
    } else {
        auth?.classList.add('hidden');
        app?.classList.remove('hidden');
        topbar?.classList.remove('hidden');
    }
}

function updateRoleUI() {
    const me = getCurrentUser();
    const isAdmin = me?.role === 'admin';
    const adminPanel = document.getElementById('admin-panel');
    const configSection = document.querySelector('details.config-section');
    const myAccount = document.getElementById('my-account');
    const userInfo = document.getElementById('user-info');
    if (userInfo && me) userInfo.textContent = `${me.username} (${me.role})`;
    if (adminPanel) adminPanel.classList.toggle('hidden', !isAdmin);
    if (configSection) configSection.classList.toggle('hidden', !isAdmin);
    if (myAccount) myAccount.classList.toggle('hidden', !me);
}

function initAuthUI() {
    const setupCard = document.getElementById('setup-admin-card');
    const loginCard = document.getElementById('login-card');
    if (setupCard) setupCard.style.display = 'none';
    if (loginCard) loginCard.style.display = 'block';
}

async function setupAdmin() {
    const u = document.getElementById('setup-admin-username').value.trim() || 'admin';
    const p1 = document.getElementById('setup-admin-password').value;
    const p2 = document.getElementById('setup-admin-password2').value;
    if (!u || !p1 || p1 !== p2) {
        alert('Completa usuario y contraseñas iguales.');
        return;
    }
    const passHash = await hashPassword(u, p1);
    const users = [{ username: u, passHash, role: 'admin' }];
    setUsers(users);
    setCurrentUser({ username: u, role: 'admin' });
    if (typeof window !== 'undefined') window.location.href = 'index.html';
}

async function login() {
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    const users = getUsers();
    const found = users.find(x => x.username === u);
    if (!found) {
        if (u === DEFAULT_ADMIN.username && p === DEFAULT_ADMIN.password) {
            const passHash = await hashPassword(DEFAULT_ADMIN.username, DEFAULT_ADMIN.password);
            const seeded = [{ username: DEFAULT_ADMIN.username, passHash, role: 'admin' }];
            setUsers(seeded);
            setCurrentUser({ username: DEFAULT_ADMIN.username, role: 'admin' });
            if (typeof window !== 'undefined') window.location.href = 'index.html';
            return;
        } else {
            alert('Usuario o contraseña incorrectos.');
            return;
        }
    } else {
        const hashes = await hashCandidates(u, p);
        if (!hashes.includes(found.passHash)) {
            alert('Usuario o contraseña incorrectos.');
            return;
        }
        setCurrentUser({ username: found.username, role: found.role });
    }
    if (typeof window !== 'undefined') window.location.href = 'index.html';
}

function logout() {
    setCurrentUser(null);
    if (typeof window !== 'undefined') window.location.href = 'login.html';
}

async function createUser() {
    const me = getCurrentUser();
    if (me?.role !== 'admin') return;
    const u = document.getElementById('new-user-username').value.trim();
    const role = document.getElementById('new-user-role').value;
    const p = document.getElementById('new-user-password').value;
    if (!u || !p) {
        alert('Usuario y contraseña son requeridos.');
        return;
    }
    const users = getUsers();
    if (users.find(x => x.username === u)) {
        alert('El usuario ya existe.');
        return;
    }
    const passHash = await hashPassword(u, p);
    users.push({ username: u, passHash, role });
    setUsers(users);
    alert('Usuario creado.');
    document.getElementById('new-user-username').value = '';
    document.getElementById('new-user-password').value = '';
}

async function changeOwnPassword() {
    const me = getCurrentUser();
    if (!me) return;
    const current = document.getElementById('current-password').value;
    const n1 = document.getElementById('new-password').value;
    const n2 = document.getElementById('new-password2').value;
    if (!n1 || n1 !== n2) {
        alert('Las nuevas contraseñas no coinciden.');
        return;
    }
    const users = getUsers();
    const idx = users.findIndex(x => x.username === me.username);
    if (idx < 0) return;
    const currentHashes = await hashCandidates(me.username, current);
    if (!currentHashes.includes(users[idx].passHash)) {
        alert('La contraseña actual es incorrecta.');
        return;
    }
    users[idx].passHash = await hashPassword(me.username, n1);
    setUsers(users);
    alert('Contraseña actualizada.');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('new-password2').value = '';
}

function resetSecurity() {
    localStorage.removeItem('mirrorUsers');
    localStorage.removeItem('mirrorCurrentUser');
    alert('Seguridad restablecida. Crea el usuario administrador.');
}


// ===== Cotizaciones =====
function escapeQuoteHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function nextQuoteFolio() {
    const current = parseInt(localStorage.getItem('mirrorQuoteFolio') || '0', 10) || 0;
    const next = current + 1;
    localStorage.setItem('mirrorQuoteFolio', String(next));
    return 'COT-' + String(next).padStart(4, '0');
}

function createQuote() {
    const nombre = document.getElementById('quote-client-name')?.value.trim() || '';
    const telefono = document.getElementById('quote-client-phone')?.value.trim() || '';
    const direccion = document.getElementById('quote-client-address')?.value.trim() || '';

    if (!nombre) {
        alert('Ingresa el nombre del cliente antes de crear la cotización.');
        document.getElementById('quote-client-name')?.focus();
        return;
    }

    // Always use the current mirror inputs, even if a previous result is visible.
    if (!calculateCost()) return;

    const width = parseFloat(document.getElementById('width')?.value || '0') || 0;
    const height = parseFloat(document.getElementById('height')?.value || '0') || 0;
    const thickness = document.getElementById('thickness')?.value || '';
    const baseSelect = document.getElementById('base');
    const baseLabel = baseSelect?.options[baseSelect.selectedIndex]?.text || '';
    const ledCount = parseInt(document.getElementById('led-count')?.value || '0', 10) || 0;
    const sellPrice = parseFloat(document.getElementById('sell-price')?.textContent || '0') || 0;
    const cfg = getConfig();

    const extras = [];
    if (document.getElementById('extra-arenado')?.checked) extras.push(cfg.labels.extras.arenado);
    if (document.getElementById('extra-canto')?.checked) extras.push(cfg.labels.extras.canto_pulido);
    if (document.getElementById('extra-biselado')?.checked) extras.push(cfg.labels.extras.biselado);
    if (document.getElementById('extra-marco')?.checked) extras.push(cfg.labels.extras.marco);

    const folio = nextQuoteFolio();
    const now = new Date();
    const fecha = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const descripcion = [
        'Espejo ' + width + ' x ' + height + ' cm',
        thickness + ' mm',
        baseLabel,
        ledCount > 0 ? ledCount + ' tira(s) LED' : '',
        extras.length ? 'Extras: ' + extras.join(', ') : ''
    ].filter(Boolean).join(' · ');

    const clients = getClients();
    clients.push({
        id: Date.now() + '-' + Math.random().toString(36).slice(2),
        nombre,
        telefono,
        direccion,
        descripcion: folio + ' — ' + descripcion,
        costo: sellPrice,
        anticipo: 0,
        adeudo: sellPrice,
        pagado: false,
        cotizacion: true,
        folio,
        fecha: now.toISOString()
    });
    setClients(clients);

    const quoteWindow = window.open('', '_blank');
    if (!quoteWindow) {
        alert('El navegador bloqueó la ventana de la cotización. Permite ventanas emergentes e inténtalo de nuevo.');
        return;
    }

    const money = sellPrice.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    quoteWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeQuoteHtml(folio)} - SB Espejos</title>
<style>
body{font-family:Arial,sans-serif;color:#222;margin:0;background:#f2f2f2}
.page{max-width:760px;margin:24px auto;background:#fff;padding:44px;box-sizing:border-box}
.header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #111;padding-bottom:18px;margin-bottom:28px}
.brand{font-size:28px;font-weight:800;letter-spacing:1px}.muted{color:#666;font-size:14px}
h1{font-size:22px;margin:0 0 6px}.client{background:#f7f7f7;padding:18px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin:18px 0}th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd}th{background:#f5f5f5}
.total{text-align:right;font-size:24px;font-weight:800;margin-top:24px}.note{margin-top:36px;font-size:13px;color:#666;border-top:1px solid #ddd;padding-top:16px}
.actions{margin:20px auto;max-width:760px;text-align:right}.actions button{padding:12px 20px;font-size:16px;cursor:pointer}
@media print{body{background:#fff}.page{margin:0;max-width:none;padding:20mm}.actions{display:none}}
</style>
</head>
<body>
<div class="actions"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>
<div class="page">
    <div class="header">
        <div><div class="brand">SB ESPEJOS</div><div class="muted">Cotización comercial</div></div>
        <div><h1>${escapeQuoteHtml(folio)}</h1><div class="muted">${escapeQuoteHtml(fecha)}</div></div>
    </div>
    <div class="client">
        <strong>Cliente:</strong> ${escapeQuoteHtml(nombre)}<br>
        ${telefono ? '<strong>Teléfono:</strong> ' + escapeQuoteHtml(telefono) + '<br>' : ''}
        ${direccion ? '<strong>Dirección:</strong> ' + escapeQuoteHtml(direccion) : ''}
    </div>
    <table>
        <thead><tr><th>Concepto</th><th>Detalle</th></tr></thead>
        <tbody>
            <tr><td>Medidas</td><td>${width} × ${height} cm</td></tr>
            <tr><td>Espesor</td><td>${escapeQuoteHtml(thickness)} mm</td></tr>
            <tr><td>Base</td><td>${escapeQuoteHtml(baseLabel)}</td></tr>
            <tr><td>LED</td><td>${ledCount > 0 ? ledCount + ' tira(s)' : 'Sin LED'}</td></tr>
            <tr><td>Extras</td><td>${extras.length ? escapeQuoteHtml(extras.join(', ')) : 'Sin extras'}</td></tr>
        </tbody>
    </table>
    <div class="total">TOTAL: $${money} MXN</div>
    <div class="note">Esta cotización corresponde a las especificaciones indicadas y está sujeta a confirmación de disponibilidad y condiciones de instalación. Los costos internos de fabricación no forman parte de este documento.</div>
</div>
</body>
</html>`);
    quoteWindow.document.close();
    quoteWindow.focus();
}
