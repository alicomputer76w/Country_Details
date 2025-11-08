// Country Details Explorer
// Data sources: REST Countries, World Bank, Hipolabs Universities, WHO/Ministry links

const els = {
  countrySelect: document.getElementById('countrySelect'),
  refreshBtn: document.getElementById('refreshBtn'),
  themeToggle: document.getElementById('themeToggle'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  exportPdfBtn: document.getElementById('exportPdfBtn'),
  bulkExportOpen: document.getElementById('bulkExportOpen'),
  langSelect: document.getElementById('langSelect'),
  detailsGrid: document.getElementById('detailsGrid'),
  loading: document.getElementById('loading'),
  year: document.getElementById('year'),
  // overview
  flagImg: document.getElementById('flagImg'),
  countryName: document.getElementById('countryName'),
  capital: document.getElementById('capital'),
  region: document.getElementById('region'),
  subregion: document.getElementById('subregion'),
  population: document.getElementById('population'),
  area: document.getElementById('area'),
  languages: document.getElementById('languages'),
  currencies: document.getElementById('currencies'),
  code: document.getElementById('code'),
  // gender
  genderStatus: document.getElementById('genderStatus'),
  genderStats: document.getElementById('genderStats'),
  femaleCount: document.getElementById('femaleCount'),
  maleCount: document.getElementById('maleCount'),
  femaleBar: document.getElementById('femaleBar'),
  maleBar: document.getElementById('maleBar'),
  genderYear: document.getElementById('genderYear'),
  // institutions
  instStatus: document.getElementById('instStatus'),
  instList: document.getElementById('instList'),
  instSearch: document.getElementById('instSearch'),
  instCity: document.getElementById('instCity'),
  instSort: document.getElementById('instSort'),
  instTld: document.getElementById('instTld'),
  instPager: document.getElementById('instPager'),
  instPagePrev: document.getElementById('instPagePrev'),
  instPageNext: document.getElementById('instPageNext'),
  instPageInfo: document.getElementById('instPageInfo'),
  // hospitals
  hospStatus: document.getElementById('hospStatus'),
  hospList: document.getElementById('hospList'),
  // health
  healthStatus: document.getElementById('healthStatus'),
  healthList: document.getElementById('healthList'),
  // economic
  econStatus: document.getElementById('econStatus'),
  econList: document.getElementById('econList'),
  // education
  eduStatus: document.getElementById('eduStatus'),
  eduList: document.getElementById('eduList'),
  // map
  mapStatus: document.getElementById('mapStatus'),
  mapEl: document.getElementById('map'),
  // i18n titles/labels
  titleSite: document.getElementById('titleSite'),
  linkAbout: document.getElementById('linkAbout'),
  titleOverview: document.getElementById('titleOverview'),
  titleGender: document.getElementById('titleGender'),
  titleInstitutions: document.getElementById('titleInstitutions'),
  titleHospitals: document.getElementById('titleHospitals'),
  titleHealth: document.getElementById('titleHealth'),
  titleEconomic: document.getElementById('titleEconomic'),
  titleEducation: document.getElementById('titleEducation'),
  titleMap: document.getElementById('titleMap'),
  titleAbout: document.getElementById('titleAbout'),
  labelSelectCountry: document.getElementById('labelSelectCountry'),
  labelInstSearch: document.getElementById('labelInstSearch'),
  labelInstCity: document.getElementById('labelInstCity'),
  labelInstSort: document.getElementById('labelInstSort'),
  labelInstTld: document.getElementById('labelInstTld'),
  // bulk export panel
  bulkPanel: document.getElementById('bulkPanel'),
  bulkSelect: document.getElementById('bulkSelect'),
  bulkCsvBtn: document.getElementById('bulkCsvBtn'),
  bulkPdfBtn: document.getElementById('bulkPdfBtn'),
  bulkClose: document.getElementById('bulkClose'),
  titleBulkExport: document.getElementById('titleBulkExport'),
  descBulkExport: document.getElementById('descBulkExport'),
  labelBulkSelect: document.getElementById('labelBulkSelect'),
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

const state = {
  countries: [], // {name, cca3, capital, flags, region, subregion, population, area, currencies, languages}
  selected: null, // country object
  aborter: null,
  map: null,
  boundaryDataset: null,
  institutionsRaw: [],
  lang: 'en',
  institutionsPage: 1,
  institutionsPageSize: 50,
};

function setLoading(show) {
  els.loading.hidden = !show;
}

function formatNumber(n) {
  try { return Intl.NumberFormat().format(n); } catch { return String(n); }
}

function getFromCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.ts || (Date.now() - obj.ts) > CACHE_TTL_MS) return null;
    return obj.data;
  } catch { return null; }
}

function saveToCache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

async function fetchJSON(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function loadCountries() {
  const cacheKey = 'countries_list_v3';
  const cached = getFromCache(cacheKey);
  if (cached) {
    state.countries = cached;
    populateCountrySelect(cached);
    return;
  }
  setLoading(true);
  try {
    const url = 'https://restcountries.com/v3.1/all?fields=name,cca3,capital,flags,region,subregion,population,area,currencies,languages';
    const data = await fetchJSON(url);
    const cleaned = data.map(c => ({
      name: c.name?.common || c.name?.official || 'Unknown',
      officialName: c.name?.official || c.name?.common || 'Unknown',
      cca3: c.cca3,
      capital: Array.isArray(c.capital) ? c.capital[0] : (c.capital || ''),
      flags: c.flags,
      region: c.region || '',
      subregion: c.subregion || '',
      population: c.population || 0,
      area: c.area || 0,
      currencies: c.currencies || {},
      languages: c.languages || {},
    })).sort((a, b) => a.name.localeCompare(b.name));
    state.countries = cleaned;
    saveToCache(cacheKey, cleaned);
    populateCountrySelect(cleaned);
  } catch (e) {
    console.error(e);
    els.countrySelect.innerHTML = '<option disabled selected>Failed to load countries. Retry.</option>';
  } finally {
    setLoading(false);
  }
}

function populateCountrySelect(list) {
  els.countrySelect.innerHTML = '<option value="" disabled selected>Select a country…</option>' +
    list.map(c => `<option value="${c.cca3}">${escapeHtml(c.name)}</option>`).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]+/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[s]);
}

function updateOverview(country) {
  els.detailsGrid.hidden = false;
  els.flagImg.src = country.flags?.png || country.flags?.svg || '';
  els.flagImg.alt = `${country.name} flag`;
  els.countryName.textContent = country.officialName || country.name;
  els.capital.textContent = country.capital || '—';
  els.region.textContent = country.region || '—';
  els.subregion.textContent = country.subregion || '—';
  els.population.textContent = country.population ? `${formatNumber(country.population)}` : '—';
  els.area.textContent = country.area ? `${formatNumber(country.area)} km²` : '—';
  els.languages.textContent = country.languages && Object.values(country.languages).length
    ? Object.values(country.languages).join(', ') : '—';
  els.currencies.textContent = country.currencies && Object.values(country.currencies).length
    ? Object.values(country.currencies).map(c => `${c.name} (${c.symbol || ''})`).join(', ') : '—';
  els.code.textContent = country.cca3;
}

async function loadGenderStats(country) {
  els.genderStatus.hidden = false;
  els.genderStatus.textContent = 'Fetching gender data…';
  els.genderStats.hidden = true;

  const indicatorMale = 'SP.POP.TOTL.MA.IN';
  const indicatorFemale = 'SP.POP.TOTL.FE.IN';
  const base = `https://api.worldbank.org/v2/country/${country.cca3}/indicator/`;

  try {
    const [maleData, femaleData] = await Promise.all([
      fetchJSON(`${base}${indicatorMale}?format=json`),
      fetchJSON(`${base}${indicatorFemale}?format=json`),
    ]);

    const male = pickLatestValue(maleData);
    const female = pickLatestValue(femaleData);
    if (male.value == null && female.value == null) throw new Error('No gender data available');

    const total = (male.value || 0) + (female.value || 0);
    const malePct = total ? Math.round((male.value || 0) / total * 100) : 0;
    const femalePct = total ? 100 - malePct : 0;

    els.maleCount.textContent = male.value != null ? `${formatNumber(male.value)} (${malePct}%)` : '—';
    els.femaleCount.textContent = female.value != null ? `${formatNumber(female.value)} (${femalePct}%)` : '—';
    els.maleBar.style.width = `${malePct}%`;
    els.femaleBar.style.width = `${femalePct}%`;
    els.genderYear.textContent = `Latest year: ${male.year || female.year || '—'}`;

    els.genderStatus.hidden = true;
    els.genderStats.hidden = false;
  } catch (e) {
    console.warn('Gender fetch failed', e);
    els.genderStatus.hidden = false;
    els.genderStatus.textContent = 'Gender data not available for this country.';
    els.genderStats.hidden = true;
  }
}

function pickLatestValue(worldBankJson) {
  // worldBankJson = [metadata, data[]]
  const rows = Array.isArray(worldBankJson) ? worldBankJson[1] : null;
  if (!rows || !rows.length) return { year: null, value: null };
  for (const row of rows) {
    if (row.value != null) {
      return { year: row.date, value: row.value };
    }
  }
  // fallback last item even if null
  const last = rows[0];
  return { year: last?.date ?? null, value: last?.value ?? null };
}

async function loadInstitutions(country) {
  els.instStatus.hidden = false;
  els.instStatus.textContent = 'Fetching institutions…';
  els.instList.hidden = true;
  els.instList.innerHTML = '';

  const url = `https://universities.hipolabs.com/search?country=${encodeURIComponent(country.name)}`;
  try {
    const list = await fetchJSON(url);
    if (!Array.isArray(list) || list.length === 0) throw new Error('No universities');
    state.institutionsRaw = list;
    renderInstitutions();
    els.instStatus.hidden = true;
    els.instList.hidden = false;
  } catch (e) {
    console.warn('Institutions fetch failed', e);
    els.instStatus.hidden = false;
    els.instStatus.textContent = 'No institution data found for this country.';
    els.instList.hidden = true;
  }
}

function loadHospitalsLinks(country) {
  els.hospStatus.textContent = 'Best-effort data from public sources.';
  els.hospList.innerHTML = '';

  const links = [];
  // WHO country page
  links.push({ title: 'WHO Country Profile', url: `https://www.who.int/countries/${encodeURIComponent(country.name.toLowerCase().replace(/\s+/g, '-'))}/` });
  // Wikipedia health in <country>
  links.push({ title: 'Wikipedia: Health in ' + country.name, url: `https://en.wikipedia.org/wiki/Health_in_${encodeURIComponent(country.name.replace(/\s+/g, '_'))}` });
  // Google advanced search hint
  links.push({ title: 'Search: Ministry of Health ' + country.name, url: `https://www.google.com/search?q=${encodeURIComponent(country.name + ' Ministry of Health hospitals')}` });

  els.hospList.innerHTML = links.map(l => `<li><a href="${l.url}" target="_blank" rel="noopener">${escapeHtml(l.title)}</a></li>`).join('');
}

function selectCountry(cca3) {
  const country = state.countries.find(c => c.cca3 === cca3);
  if (!country) return;
  state.selected = country;
  updateOverview(country);
  loadGenderStats(country);
  loadInstitutions(country);
  loadHospitalsLinks(country);
  loadHealth(country);
  loadEconomic(country);
  loadEducation(country);
  ensureMap();
  drawCountryOnMap(country);
}

function bindEvents() {
  els.countrySelect.addEventListener('change', e => {
    const val = e.target.value;
    if (val) selectCountry(val);
  });
  els.refreshBtn.addEventListener('click', async () => {
    localStorage.removeItem('countries_list_v3');
    await loadCountries();
    if (state.selected) selectCountry(state.selected.cca3);
  });
  els.themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('light');
  });
  els.exportCsvBtn.addEventListener('click', () => exportCSV());
  els.exportPdfBtn.addEventListener('click', () => exportPDF());
  if (els.bulkExportOpen) {
    els.bulkExportOpen.addEventListener('click', () => openBulkPanel());
  }
  if (els.bulkClose) {
    els.bulkClose.addEventListener('click', () => closeBulkPanel());
  }
  if (els.bulkCsvBtn) {
    els.bulkCsvBtn.addEventListener('click', () => bulkExportCSV());
  }
  if (els.bulkPdfBtn) {
    els.bulkPdfBtn.addEventListener('click', () => bulkExportPDF());
  }
  // Close modal when clicking outside the card
  if (els.bulkPanel) {
    els.bulkPanel.addEventListener('click', (e) => {
      const card = e.target.closest('.modal-card');
      if (!card) closeBulkPanel();
    });
  }
  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.bulkPanel && !els.bulkPanel.hidden) {
      closeBulkPanel();
    }
  });
  if (els.langSelect) {
    els.langSelect.addEventListener('change', (e) => setLanguage(e.target.value));
  }
  // institutions filters
  if (els.instSearch) {
    els.instSearch.addEventListener('input', renderInstitutions);
    els.instSearch.addEventListener('change', renderInstitutions);
  }
  if (els.instCity) {
    els.instCity.addEventListener('input', renderInstitutions);
    els.instCity.addEventListener('change', renderInstitutions);
  }
  if (els.instSort) {
    els.instSort.addEventListener('change', renderInstitutions);
  }
  if (els.instTld) {
    els.instTld.addEventListener('change', () => { state.institutionsPage = 1; renderInstitutions(); });
  }
  if (els.instPagePrev) {
    els.instPagePrev.addEventListener('click', () => {
      if (state.institutionsPage > 1) { state.institutionsPage--; renderInstitutions(); }
    });
  }
  if (els.instPageNext) {
    els.instPageNext.addEventListener('click', () => {
      state.institutionsPage++; // renderInstitutions will clamp to max
      renderInstitutions();
    });
  }
}

function init() {
  els.year.textContent = new Date().getFullYear();
  bindEvents();
  if (els.langSelect) setLanguage(els.langSelect.value || 'en');
  loadCountries();
}

document.addEventListener('DOMContentLoaded', init);

// ---------- Additional Features ----------
async function getIndicatorLatest(cca3, code) {
  try {
    const data = await fetchJSON(`https://api.worldbank.org/v2/country/${cca3}/indicator/${code}?format=json`);
    const v = pickLatestValue(data);
    return v; // {year, value}
  } catch (e) {
    return { year: null, value: null };
  }
}

async function loadHealth(country) {
  els.healthStatus.hidden = false;
  els.healthList.hidden = true;
  els.healthList.innerHTML = '';
  const [beds, healthExp, physicians] = await Promise.all([
    getIndicatorLatest(country.cca3, 'SH.MED.BEDS.ZS'),      // beds per 1,000
    getIndicatorLatest(country.cca3, 'SH.XPD.CHEX.GD.ZS'),   // health expenditure % of GDP
    getIndicatorLatest(country.cca3, 'SH.MED.PHYS.ZS'),      // physicians per 1,000
  ]);
  const items = [];
  items.push(renderIndicator(t('health_beds','Hospital beds per 1,000 people'), beds));
  items.push(renderIndicator(t('health_expenditure_gdp','Current health expenditure (% of GDP)'), healthExp));
  items.push(renderIndicator(t('health_physicians','Physicians per 1,000 people'), physicians));
  const has = items.some(i => i.includes('strong'));
  if (has) {
    els.healthList.innerHTML = items.join('');
    els.healthStatus.hidden = true;
    els.healthList.hidden = false;
  } else {
    els.healthStatus.textContent = 'No health indicator data available.';
  }
}

async function loadEconomic(country) {
  els.econStatus.hidden = false;
  els.econList.hidden = true;
  els.econList.innerHTML = '';
  const [gdp, uRate, infl, gdpPerCapita, poverty] = await Promise.all([
    getIndicatorLatest(country.cca3, 'NY.GDP.MKTP.CD'), // GDP (current US$)
    getIndicatorLatest(country.cca3, 'SL.UEM.TOTL.ZS'), // Unemployment (% of total labor force)
    getIndicatorLatest(country.cca3, 'FP.CPI.TOTL.ZG'), // Inflation, consumer prices (annual %)
    getIndicatorLatest(country.cca3, 'NY.GDP.PCAP.CD'), // GDP per capita (current US$)
    getIndicatorLatest(country.cca3, 'SI.POV.DDAY'),    // Poverty headcount ratio (% at $2.15/day)
  ]);
  const items = [];
  items.push(renderIndicator(t('econ_gdp','GDP (current US$)'), gdp, 'usd'));
  items.push(renderIndicator(t('econ_unemployment','Unemployment rate (%)'), uRate));
  items.push(renderIndicator(t('econ_inflation','Inflation (annual %)'), infl));
  items.push(renderIndicator(t('econ_gdp_per_capita','GDP per capita (current US$)'), gdpPerCapita, 'usd'));
  items.push(renderIndicator(t('econ_poverty','Poverty headcount ratio (% at $2.15/day)'), poverty));
  // Additional metrics
  const [govExpPct, currentAccount] = await Promise.all([
    getIndicatorLatest(country.cca3, 'NE.CON.GOVT.ZS'), // Government final consumption expenditure (% of GDP)
    getIndicatorLatest(country.cca3, 'BN.CAB.XOKA.CD'), // Current account balance (US$)
  ]);
  items.push(renderIndicator(t('econ_gov_exp_gdp','Government expenditure (% of GDP)'), govExpPct));
  items.push(renderIndicator(t('econ_current_account','Current account balance (US$)'), currentAccount, 'usd'));
  const has = items.some(i => i.includes('strong'));
  if (has) {
    els.econList.innerHTML = items.join('');
    els.econStatus.hidden = true;
    els.econList.hidden = false;
  } else {
    els.econStatus.textContent = 'No economic indicator data available.';
  }
}

async function loadEducation(country) {
  els.eduStatus.hidden = false;
  els.eduList.hidden = true;
  els.eduList.innerHTML = '';
  const [literacy, primaryEnroll, secondaryEnroll, tertiaryEnroll, primaryComplete, secondaryComplete, tertiaryComplete, ptrPrimary, ptrSecondary] = await Promise.all([
    getIndicatorLatest(country.cca3, 'SE.ADT.LITR.ZS'), // Adult literacy rate (% ages 15+)
    getIndicatorLatest(country.cca3, 'SE.PRM.NENR'),   // Primary school net enrollment rate (%)
    getIndicatorLatest(country.cca3, 'SE.SEC.ENRR'),   // Secondary gross enrollment ratio (%)
    getIndicatorLatest(country.cca3, 'SE.TER.ENRR'),   // Tertiary gross enrollment ratio (%)
    getIndicatorLatest(country.cca3, 'SE.PRM.CMPT.ZS'),// Primary completion rate (%)
    // Secondary/Tertiary completion (best-effort; availability varies)
    getFirstAvailableIndicator(country.cca3, ['SE.SEC.CMPT.LO.ZS','SE.SEC.CMPT.ZS']),
    getFirstAvailableIndicator(country.cca3, ['SE.TER.CMPT.ZS']),
    // Pupil-teacher ratio (best-effort codes; may be missing)
    getFirstAvailableIndicator(country.cca3, ['SE.PRM.ENRL.TC.ZS','SE.PRM.TCHR.RT.ZS']),
    getFirstAvailableIndicator(country.cca3, ['SE.SEC.ENRL.TC.ZS','SE.SEC.TCHR.RT.ZS']),
  ]);
  const items = [];
  items.push(renderIndicator(t('edu_literacy','Adult literacy rate (%)'), literacy));
  items.push(renderIndicator(t('edu_primary_enroll','Primary school net enrollment (%)'), primaryEnroll));
  items.push(renderIndicator(t('edu_secondary_enroll','Secondary school enrollment (gross %)'), secondaryEnroll));
  items.push(renderIndicator(t('edu_tertiary_enroll','Tertiary school enrollment (gross %)'), tertiaryEnroll));
  items.push(renderIndicator(t('edu_primary_complete','Primary completion rate (%)'), primaryComplete));
  items.push(renderIndicator(t('edu_secondary_complete','Secondary completion rate (%)'), secondaryComplete));
  items.push(renderIndicator(t('edu_tertiary_complete','Tertiary completion rate (%)'), tertiaryComplete));
  items.push(renderIndicator(t('edu_ptr_primary','Pupil-teacher ratio (Primary)'), ptrPrimary));
  items.push(renderIndicator(t('edu_ptr_secondary','Pupil-teacher ratio (Secondary)'), ptrSecondary));
  const has = items.some(i => i.includes('strong'));
  if (has) {
    els.eduList.innerHTML = items.join('');
    els.eduStatus.hidden = true;
    els.eduList.hidden = false;
  } else {
    els.eduStatus.textContent = 'No education metric data available.';
  }
}

function renderIndicator(label, { year, value }, type) {
  if (value == null) return `<li>${escapeHtml(label)} — <span class="muted">No data</span></li>`;
  let formatted = formatNumber(value);
  if (type === 'usd') formatted = `$${formatted}`;
  return `<li><strong>${escapeHtml(label)}:</strong> ${formatted}${year ? ` <span class="muted">(Latest year: ${year})</span>` : ''}</li>`;
}

// Map integration with Leaflet
function ensureMap() {
  if (state.map) return;
  try {
    state.map = L.map(els.mapEl).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(state.map);
    els.mapStatus.hidden = true;
  } catch (e) {
    console.warn('Leaflet initialization failed', e);
    els.mapStatus.textContent = 'Map could not be initialized.';
  }
}

async function loadBoundaryDataset() {
  const cacheKey = 'country_geojson_v1';
  const cached = getFromCache(cacheKey);
  if (cached) return cached;
  try {
    const geojson = await fetchJSON('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json');
    saveToCache(cacheKey, geojson);
    return geojson;
  } catch (e) {
    console.warn('Failed to load boundary dataset', e);
    return null;
  }
}

async function drawCountryOnMap(country) {
  if (!state.map) return;
  // Clear previous layers
  if (state.currentLayer) {
    state.map.removeLayer(state.currentLayer);
    state.currentLayer = null;
  }

  try {
    const dataset = state.boundaryDataset || await loadBoundaryDataset();
    state.boundaryDataset = dataset;
    let feature = null;
    if (dataset && dataset.features) {
      feature = dataset.features.find(f => {
        const p = f.properties || {};
        return (p.iso_a3 || p.ISO_A3 || p.ADM0_A3 || '').toUpperCase() === (country.cca3 || '').toUpperCase();
      }) || dataset.features.find(f => {
        const p = f.properties || {};
        const nm = (p.name || p.ADMIN || '').toLowerCase();
        return nm === (country.name || '').toLowerCase() || nm === (country.officialName || '').toLowerCase();
      });
    }

    if (feature) {
      const layer = L.geoJSON(feature, { style: { color: '#4f8cff', weight: 2 } }).addTo(state.map);
      state.currentLayer = layer;
      try { state.map.fitBounds(layer.getBounds(), { padding: [20, 20] }); } catch {}
    } else {
      // Fallback: center on capital or latlng
      const latlng = await getLatLngFallback(country);
      state.map.setView(latlng, 5);
    }
  } catch (e) {
    console.warn('Map draw failed', e);
    const latlng = await getLatLngFallback(country);
    state.map.setView(latlng, 5);
  }
}

async function getLatLngFallback(country) {
  // Try REST Countries details again for latlng
  try {
    const url = `https://restcountries.com/v3.1/alpha/${country.cca3}?fields=latlng,capitalInfo`;
    const data = await fetchJSON(url);
    const c = Array.isArray(data) ? data[0] : data;
    const latlng = c?.capitalInfo?.latlng || c?.latlng || [20, 0];
    // Add a marker for visibility
    if (state.map) {
      L.marker(latlng).addTo(state.map).bindPopup(`${country.name} Capital`).openPopup();
    }
    return latlng;
  } catch {
    return [20, 0];
  }
}

// Export functions
function collectOverviewData() {
  if (!state.selected) return null;
  const c = state.selected;
  return {
    Name: c.officialName || c.name,
    Capital: c.capital || '',
    Region: c.region || '',
    Subregion: c.subregion || '',
    Population: c.population || '',
    Area_km2: c.area || '',
    Languages: c.languages && Object.values(c.languages).join(', '),
    Currencies: c.currencies && Object.values(c.currencies).map(x => `${x.name} (${x.symbol || ''})`).join(', '),
    Code: c.cca3 || '',
  };
}

function exportCSV() {
  const data = collectOverviewData();
  if (!data) return alert('Please select a country first.');
  const headers = Object.keys(data);
  const values = headers.map(h => JSON.stringify(data[h] ?? ''));
  const csv = headers.join(',') + '\n' + values.join(',');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.selected.name}_details.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF() {
  const data = collectOverviewData();
  if (!data) return alert('Please select a country first.');
  try {
    // jsPDF UMD
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) throw new Error('jsPDF not loaded');
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Country Details: ${state.selected.name}`, 10, 15);
    doc.setFontSize(11);
    let y = 25;
    Object.entries(data).forEach(([k, v]) => {
      doc.text(`${k}: ${v ?? ''}`, 10, y);
      y += 7;
    });
    doc.save(`${state.selected.name}_details.pdf`);
  } catch (e) {
    console.warn('jsPDF export failed, using print fallback', e);
    window.print();
  }
}

// Institutions filtering/sorting renderer
function renderInstitutions() {
  const list = state.institutionsRaw || [];
  const q = (els.instSearch?.value || '').toLowerCase();
  const cityQ = (els.instCity?.value || '').toLowerCase();
  const sort = els.instSort?.value || 'name_asc';
  const tld = els.instTld?.value || 'all';
  let filtered = list.filter(u => {
    const name = (u.name || '').toLowerCase();
    const doms = (Array.isArray(u.domains) ? u.domains.join(' ') : (u.domains || '')).toLowerCase();
    const web = (Array.isArray(u.web_pages) ? u.web_pages.join(' ') : (u.web_pages || '')).toLowerCase();
    const city = (u['state-province'] || '').toLowerCase();
    const matchesQ = !q || name.includes(q) || doms.includes(q) || web.includes(q);
    const matchesCity = !cityQ || city.includes(cityQ);
    const matchesTld = tld === 'all' ? true : (
      (Array.isArray(u.domains) ? u.domains : [u.domains]).some(d => typeof d === 'string' && d.toLowerCase().endsWith(tld)) ||
      (Array.isArray(u.web_pages) ? u.web_pages : [u.web_pages]).some(w => typeof w === 'string' && w.toLowerCase().endsWith(tld))
    );
    return matchesQ && matchesCity && matchesTld;
  });
  filtered.sort((a, b) => a.name.localeCompare(b.name) * (sort === 'name_desc' ? -1 : 1));
  const total = filtered.length;
  const size = state.institutionsPageSize;
  const totalPages = Math.max(1, Math.ceil(total / size));
  if (state.institutionsPage > totalPages) state.institutionsPage = totalPages;
  if (state.institutionsPage < 1) state.institutionsPage = 1;
  const start = (state.institutionsPage - 1) * size;
  const end = start + size;
  const top = filtered.slice(start, end);
  els.instList.innerHTML = top.map(u => {
    const name = escapeHtml(u.name);
    const web = Array.isArray(u.web_pages) ? u.web_pages[0] : (u.web_pages || '');
    const dom = Array.isArray(u.domains) ? u.domains[0] : (u.domains || '');
    const city = u['state-province'] || '';
    return `<li><strong>${name}</strong>${city ? ` — <span class=\"muted\">${escapeHtml(city)}</span>` : ''}<br><a href=\"${web}\" target=\"_blank\" rel=\"noopener\">${escapeHtml(web || dom || '')}</a></li>`;
  }).join('');
  if (els.instPager && els.instPageInfo && els.instPagePrev && els.instPageNext) {
    els.instPager.hidden = totalPages <= 1;
    els.instPageInfo.textContent = `Page ${state.institutionsPage} of ${totalPages} (Total: ${total})`;
    els.instPagePrev.disabled = state.institutionsPage <= 1;
    els.instPageNext.disabled = state.institutionsPage >= totalPages;
  }
}

// Bulk export panel controls
async function openBulkPanel() {
  if (!els.bulkPanel) return;
  // Show the modal immediately
  els.bulkPanel.hidden = false;
  if (!els.bulkSelect) return;
  // If countries are not yet loaded, show a temporary message and load them
  if (!state.countries || state.countries.length === 0) {
    els.bulkSelect.innerHTML = '<option disabled selected>Loading countries…</option>';
    try {
      await loadCountries();
    } catch (e) {
      console.error('Failed to load countries for bulk export:', e);
    }
  }
  // Populate options from the latest state
  els.bulkSelect.innerHTML = state.countries && state.countries.length
    ? state.countries.map(c => `<option value="${c.cca3}">${escapeHtml(c.name)}</option>`).join('')
    : '<option disabled selected>No countries available</option>';
}
function closeBulkPanel() { if (els.bulkPanel) els.bulkPanel.hidden = true; }

function bulkExportCSV() {
  if (!els.bulkSelect) return;
  const selected = Array.from(els.bulkSelect.selectedOptions).map(o => o.value);
  if (!selected.length) return alert('Please select at least one country.');
  const rows = selected.map(cca3 => {
    const c = state.countries.find(x => x.cca3 === cca3);
    const d = {
      Name: c.officialName || c.name,
      Capital: c.capital || '',
      Region: c.region || '',
      Subregion: c.subregion || '',
      Population: c.population || '',
      Area_km2: c.area || '',
      Code: c.cca3 || '',
    };
    return d;
  });
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')]
    .concat(rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `countries_bulk_export.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function bulkExportPDF() {
  if (!els.bulkSelect) return;
  const selected = Array.from(els.bulkSelect.selectedOptions).map(o => o.value);
  if (!selected.length) return alert('Please select at least one country.');
  try {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) throw new Error('jsPDF not loaded');
    const doc = new jsPDF();
    let first = true;
    selected.forEach(cca3 => {
      const c = state.countries.find(x => x.cca3 === cca3);
      if (!first) doc.addPage();
      first = false;
      doc.setFontSize(14);
      doc.text(`Country Details: ${c.name}`, 10, 15);
      doc.setFontSize(11);
      let y = 25;
      const data = {
        Name: c.officialName || c.name,
        Capital: c.capital || '',
        Region: c.region || '',
        Subregion: c.subregion || '',
        Population: c.population || '',
        Area_km2: c.area || '',
        Code: c.cca3 || '',
      };
      Object.entries(data).forEach(([k, v]) => {
        doc.text(`${k}: ${v ?? ''}`, 10, y);
        y += 7;
      });
    });
    doc.save(`countries_bulk_export.pdf`);
  } catch (e) {
    console.warn('Bulk PDF export failed', e);
    alert('PDF export failed.');
  }
}

// Simple i18n for English, Urdu, Hindi
const strings = {
  en: {
    titleSite: 'Country Details Explorer',
    linkAbout: 'About',
    labelSelectCountry: 'Select Country',
    titleOverview: 'Overview',
    titleGender: 'Population by Gender',
    titleInstitutions: 'Institutions (Universities)',
    titleHospitals: 'Hospitals & Health Facilities',
    titleHealth: 'Health Indicators',
    titleEconomic: 'Economic Indicators',
    titleEducation: 'Education Metrics',
    titleMap: 'Map View',
    titleAbout: 'About this website',
    labelInstSearch: 'Search institutions',
    labelInstCity: 'Filter by city/province',
    labelInstSort: 'Sort',
    titleBulkExport: 'Bulk Export',
    descBulkExport: 'Select multiple countries to export overview details.',
    labelBulkSelect: 'Choose countries',
    // Indicator labels
    health_beds: 'Hospital beds per 1,000 people',
    health_expenditure_gdp: 'Current health expenditure (% of GDP)',
    health_physicians: 'Physicians per 1,000 people',
    econ_gdp: 'GDP (current US$)',
    econ_unemployment: 'Unemployment rate (%)',
    econ_inflation: 'Inflation (annual %)',
    econ_gdp_per_capita: 'GDP per capita (current US$)',
    econ_poverty: 'Poverty headcount ratio (% at $2.15/day)',
    econ_gov_exp_gdp: 'Government expenditure (% of GDP)',
    econ_current_account: 'Current account balance (US$)',
    edu_literacy: 'Adult literacy rate (%)',
    edu_primary_enroll: 'Primary school net enrollment (%)',
    edu_secondary_enroll: 'Secondary school enrollment (gross %)',
    edu_tertiary_enroll: 'Tertiary school enrollment (gross %)',
    edu_primary_complete: 'Primary completion rate (%)',
    edu_secondary_complete: 'Secondary completion rate (%)',
    edu_tertiary_complete: 'Tertiary completion rate (%)',
    edu_ptr_primary: 'Pupil-teacher ratio (Primary)',
    edu_ptr_secondary: 'Pupil-teacher ratio (Secondary)',
    // Institutions
    labelInstTld: 'Filter by domain TLD',
  },
  ur: {
    titleSite: 'ملک کی تفصیلات ایکسپلورر',
    linkAbout: 'متعلق',
    labelSelectCountry: 'ملک منتخب کریں',
    titleOverview: 'خلاصہ',
    titleGender: 'آبادی (مرد/عورت)',
    titleInstitutions: 'ادارے (جامعات)',
    titleHospitals: 'ہسپتال اور صحت مراکز',
    titleHealth: 'صحت کے اشاریے',
    titleEconomic: 'معاشی اشاریے',
    titleEducation: 'تعلیمی اشاریے',
    titleMap: 'نقشہ',
    titleAbout: 'اس ویب سائٹ کے بارے میں',
    labelInstSearch: 'اداروں میں تلاش کریں',
    labelInstCity: 'شہر/صوبہ کے مطابق فلٹر کریں',
    labelInstSort: 'ترتیب',
    titleBulkExport: 'بلک ایکسپورٹ',
    descBulkExport: 'ایک سے زائد ممالک منتخب کریں اور تفصیلات ایکسپورٹ کریں۔',
    labelBulkSelect: 'ممالک منتخب کریں',
    // Indicator labels
    health_beds: 'ہر 1000 افراد پر ہسپتال بیڈز',
    health_expenditure_gdp: 'صحت پر اخراجات (% GDP)',
    health_physicians: 'ہر 1000 افراد پر ڈاکٹر',
    econ_gdp: 'مجموعی قومی پیداوار (موجودہ امریکی ڈالر)',
    econ_unemployment: 'بے روزگاری شرح (%)',
    econ_inflation: 'مہنگائی (سالانہ %)',
    econ_gdp_per_capita: 'فی کس GDP (موجودہ امریکی ڈالر)',
    econ_poverty: 'غربت سر شمار (% $2.15/دن)',
    econ_gov_exp_gdp: 'حکومتی اخراجات (% GDP)',
    econ_current_account: 'کرنٹ اکاؤنٹ بیلنس (امریکی ڈالر)',
    edu_literacy: 'بالغان کی خواندگی کی شرح (%)',
    edu_primary_enroll: 'ابتدائی تعلیم خالص اندراج (%)',
    edu_secondary_enroll: 'ثانوی تعلیم اندراج (مجموعی %)',
    edu_tertiary_enroll: 'اعلیٰ تعلیم اندراج (مجموعی %)',
    edu_primary_complete: 'ابتدائی تکمیل کی شرح (%)',
    edu_secondary_complete: 'ثانوی تکمیل کی شرح (%)',
    edu_tertiary_complete: 'اعلیٰ تکمیل کی شرح (%)',
    edu_ptr_primary: 'طالب علم-استاد تناسب (ابتدائی)',
    edu_ptr_secondary: 'طالب علم-استاد تناسب (ثانوی)',
    // Institutions
    labelInstTld: 'ڈومین ٹی ایل ڈی کے مطابق فلٹر',
  },
  hi: {
    titleSite: 'देश विवरण एक्सप्लोरर',
    linkAbout: 'जानकारी',
    labelSelectCountry: 'देश चुनें',
    titleOverview: 'सारांश',
    titleGender: 'जनसंख्या (पुरुष/महिला)',
    titleInstitutions: 'संस्थान (विश्वविद्यालय)',
    titleHospitals: 'अस्पताल एवं स्वास्थ्य केंद्र',
    titleHealth: 'स्वास्थ्य संकेतक',
    titleEconomic: 'आर्थिक संकेतक',
    titleEducation: 'शिक्षा संकेतक',
    titleMap: 'मानचित्र',
    titleAbout: 'इस वेबसाइट के बारे में',
    labelInstSearch: 'संस्थानों में खोजें',
    labelInstCity: 'शहर/प्रांत से फ़िल्टर करें',
    labelInstSort: 'क्रम',
    titleBulkExport: 'बल्क निर्यात',
    descBulkExport: 'एकाधिक देशों का चयन कर विवरण निर्यात करें।',
    labelBulkSelect: 'देश चुनें',
    // Indicator labels
    health_beds: 'प्रति 1000 जनसंख्या अस्पताल बेड',
    health_expenditure_gdp: 'स्वास्थ्य व्यय (% GDP)',
    health_physicians: 'प्रति 1000 जनसंख्या चिकित्सक',
    econ_gdp: 'सकल घरेलू उत्पाद (वर्तमान US$)',
    econ_unemployment: 'बेरोज़गारी दर (%)',
    econ_inflation: 'मुद्रास्फीति (वार्षिक %)',
    econ_gdp_per_capita: 'प्रति व्यक्ति GDP (वर्तमान US$)',
    econ_poverty: 'गरीबी हेडकाउंट (% $2.15/दिन)',
    econ_gov_exp_gdp: 'सरकारी व्यय (% GDP)',
    econ_current_account: 'चालू खाते का शेष (US$)',
    edu_literacy: 'वयस्क साक्षरता दर (%)',
    edu_primary_enroll: 'प्राथमिक शुद्ध नामांकन (%)',
    edu_secondary_enroll: 'माध्यमिक नामांकन (सकल %)',
    edu_tertiary_enroll: 'तृतीयक नामांकन (सकल %)',
    edu_primary_complete: 'प्राथमिक पूर्णता दर (%)',
    edu_secondary_complete: 'माध्यमिक पूर्णता दर (%)',
    edu_tertiary_complete: 'तृतीयक पूर्णता दर (%)',
    edu_ptr_primary: 'प्यूपिल-टीचर अनुपात (प्राथमिक)',
    edu_ptr_secondary: 'प्यूपिल-टीचर अनुपात (माध्यमिक)',
    // Institutions
    labelInstTld: 'डोमेन TLD से फ़िल्टर',
  }
};

function setLanguage(lang) {
  state.lang = lang in strings ? lang : 'en';
  const s = strings[state.lang];
  if (els.titleSite) els.titleSite.textContent = s.titleSite;
  if (els.linkAbout) els.linkAbout.textContent = s.linkAbout;
  if (els.labelSelectCountry) els.labelSelectCountry.textContent = s.labelSelectCountry;
  if (els.titleOverview) els.titleOverview.textContent = s.titleOverview;
  if (els.titleGender) els.titleGender.textContent = s.titleGender;
  if (els.titleInstitutions) els.titleInstitutions.textContent = s.titleInstitutions;
  if (els.titleHospitals) els.titleHospitals.textContent = s.titleHospitals;
  if (els.titleHealth) els.titleHealth.textContent = s.titleHealth;
  if (els.titleEconomic) els.titleEconomic.textContent = s.titleEconomic;
  if (els.titleEducation) els.titleEducation.textContent = s.titleEducation;
  if (els.titleMap) els.titleMap.textContent = s.titleMap;
  if (els.titleAbout) els.titleAbout.textContent = s.titleAbout;
  if (els.labelInstSearch) els.labelInstSearch.textContent = s.labelInstSearch;
  if (els.labelInstCity) els.labelInstCity.textContent = s.labelInstCity;
  if (els.labelInstSort) els.labelInstSort.textContent = s.labelInstSort;
  if (els.labelInstTld) els.labelInstTld.textContent = s.labelInstTld;
  if (els.titleBulkExport) els.titleBulkExport.textContent = s.titleBulkExport;
  if (els.descBulkExport) els.descBulkExport.textContent = s.descBulkExport;
  if (els.labelBulkSelect) els.labelBulkSelect.textContent = s.labelBulkSelect;
}

// simple translator with fallback
function t(key, fallback) {
  const s = strings[state.lang] || {};
  return s[key] || fallback || key;
}

// try multiple indicator codes, return first available
async function getFirstAvailableIndicator(cca3, codes) {
  for (const code of codes) {
    const v = await getIndicatorLatest(cca3, code);
    if (v && v.value != null) return v;
  }
  return { year: null, value: null };
}