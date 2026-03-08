/**
 * Dashboard Logic
 */

// Initial Data Structure
const DEFAULT_DATA = [
  {
    id: `cat-${Date.now()}-1`,
    name: 'Frequent',
    links: [
      { id: `link-${Date.now()}-1`, name: 'GitHub', url: 'https://github.com' },
      { id: `link-${Date.now()}-2`, name: 'YouTube', url: 'https://youtube.com' }
    ]
  }
];

let dashboardData = [];
let canvasSettings = {
  domain: '',
  token: '',
  geminiToken: ''
};

// DOM Elements
const dashboardCategories = document.getElementById('dashboard-categories');
const canvasWidgetContainer = document.getElementById('canvas-widget-container');
const canvasAssignmentsList = document.getElementById('canvas-assignments-list');
const dateDisplay = document.getElementById('date-display');
const greetingEl = document.getElementById('greeting');
const addCategoryBtn = document.getElementById('add-category-btn');
const settingsBtn = document.getElementById('settings-btn');
const refreshCanvasBtn = document.getElementById('refresh-canvas-btn');

// Modals
const linkModal = document.getElementById('link-modal');
const categoryModal = document.getElementById('category-modal');
const settingsModal = document.getElementById('settings-modal');
const closeButtons = document.querySelectorAll('.close-modal-btn');

// Forms
const linkForm = document.getElementById('link-form');
const categoryForm = document.getElementById('category-form');
const settingsForm = document.getElementById('settings-form');

// Form Inputs
const linkIdInput = document.getElementById('link-id');
const linkCategoryIdInput = document.getElementById('link-category-id');
const linkNameInput = document.getElementById('link-name');
const linkUrlInput = document.getElementById('link-url');
const linkDescInput = document.getElementById('link-desc');
const linkModalTitle = document.getElementById('link-modal-title');
const categoryNameInput = document.getElementById('category-name');
const canvasDomainInput = document.getElementById('canvas-domain');
const canvasTokenInput = document.getElementById('canvas-token');
const geminiTokenInput = document.getElementById('gemini-token');
const autoFillDescBtn = document.getElementById('auto-fill-desc-btn');

/**
 * Initialization
 */
function init() {
  loadData();
  updateClock();
  setInterval(updateClock, 60000); // Update time every minute
  setupEventListeners();
  renderDashboard();
  setupBackgroundAnimation();
  
  if (canvasSettings.domain && canvasSettings.token) {
    refreshCanvasData();
  }
}

/**
 * Time and Greeting
 */
function updateClock() {
  const now = new Date();
  
  // Update time display
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  dateDisplay.textContent = now.toLocaleDateString('en-US', options);
  
  // Update greeting
  const hour = now.getHours();
  let greeting = 'Good evening';
  if (hour >= 5 && hour < 12) greeting = 'Good morning';
  else if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  
  greetingEl.textContent = greeting;
}

/**
 * Background Animation
 */
function setupBackgroundAnimation() {
  const bgGrid = document.querySelector('.bg-grid');
  
  if (!bgGrid) return;
  
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    
    bgGrid.style.setProperty('--mouse-x', `${x}%`);
    bgGrid.style.setProperty('--mouse-y', `${y}%`);
  });
}

/**
 * Data Management
 */
function loadData() {
  const storedData = localStorage.getItem('personalDashboardData');
  const storedSettings = localStorage.getItem('canvasSettings');
  
  if (storedData) {
    try {
      dashboardData = JSON.parse(storedData);
    } catch (e) {
      console.error("Error parsing stored data", e);
      dashboardData = DEFAULT_DATA;
    }
  } else {
    dashboardData = DEFAULT_DATA;
    saveData();
  }
  
  if (storedSettings) {
    try {
      canvasSettings = JSON.parse(storedSettings);
    } catch (e) {
      console.error("Error parsing stored settings", e);
    }
  }
}

function saveData() {
  localStorage.setItem('personalDashboardData', JSON.stringify(dashboardData));
  localStorage.setItem('canvasSettings', JSON.stringify(canvasSettings));
}

/**
 * Event Listeners
 */
function setupEventListeners() {
  // Menu Buttons
  addCategoryBtn.addEventListener('click', () => {
    categoryForm.reset();
    categoryModal.showModal();
  });
  
  settingsBtn.addEventListener('click', () => {
    settingsForm.reset();
    canvasDomainInput.value = canvasSettings.domain;
    canvasTokenInput.value = canvasSettings.token;
    geminiTokenInput.value = canvasSettings.geminiToken || '';
    settingsModal.showModal();
  });
  
  refreshCanvasBtn.addEventListener('click', refreshCanvasData);

  // Close Modals
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      linkModal.close();
      categoryModal.close();
      settingsModal.close();
    });
  });

  // Submit Handlers
  linkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLinkSubmit();
  });

  categoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleCategorySubmit();
  });
  
  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSettingsSubmit();
  });
  
  // Close modals on clicking backdrop
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      const dialogDimensions = modal.getBoundingClientRect()
      if (
        e.clientX < dialogDimensions.left ||
        e.clientX > dialogDimensions.right ||
        e.clientY < dialogDimensions.top ||
        e.clientY > dialogDimensions.bottom
      ) {
        modal.close();
      }
    });
  });

  // AI autofill handler
  autoFillDescBtn.addEventListener('click', async () => {
    const url = linkUrlInput.value.trim();
    if (!url) {
      alert("Please enter a URL first to summarize.");
      return;
    }
    
    autoFillDescBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
    linkDescInput.placeholder = 'Generating...';
    linkDescInput.value = '';
    
    try {
      let description = '';
      if (canvasSettings.geminiToken) {
        // Use Gemini
        const prompt = `Summarize the purpose of this website in one short sentence (max 10 words). URL: ${url}`;
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${canvasSettings.geminiToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!res.ok) throw new Error('Gemini API Error');
        const data = await res.json();
        description = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        // Fallback: proxy fetch and meta description scrape
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error('Proxy error');
        const data = await res.json();
        const html = data.contents;
        
        const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) || 
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i) ||
                      html.match(/<title[^>]*>([^<]+)<\/title>/i);
        
        description = (match && match[1]) ? match[1] : 'No description found.';
      }
      
      description = description.replace(/\n}/g, '').trim();
      if (description.length > 55) description = description.substring(0, 52) + '...';
      linkDescInput.value = description;
      
    } catch (err) {
      console.error(err);
      linkDescInput.placeholder = 'Failed to fetch.';
    }
    
    autoFillDescBtn.innerHTML = '<i class="ph ph-sparkle"></i>';
  });
}

/**
 * Link Handlers
 */
function openAddLinkModal(categoryId) {
  linkForm.reset();
  linkModalTitle.textContent = 'Add Link';
  linkIdInput.value = '';
  linkCategoryIdInput.value = categoryId;
  linkDescInput.value = '';
  linkModal.showModal();
}

function openEditLinkModal(categoryId, linkId) {
  const category = dashboardData.find(c => c.id === categoryId);
  const link = category.links.find(l => l.id === linkId);
  
  if (link) {
    linkModalTitle.textContent = 'Edit Link';
    linkIdInput.value = link.id;
    linkCategoryIdInput.value = categoryId;
    linkNameInput.value = link.name;
    linkUrlInput.value = link.url;
    linkDescInput.value = link.description || '';
    linkModal.showModal();
  }
}

function handleLinkSubmit() {
  const categoryId = linkCategoryIdInput.value;
  const linkId = linkIdInput.value;
  const name = linkNameInput.value.trim();
  const description = linkDescInput.value.trim();
  let url = linkUrlInput.value.trim();
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  const categoryIndex = dashboardData.findIndex(c => c.id === categoryId);
  
  if (categoryIndex === -1) return;

  if (linkId) {
    // Edit existing
    const linkIndex = dashboardData[categoryIndex].links.findIndex(l => l.id === linkId);
    if (linkIndex !== -1) {
      dashboardData[categoryIndex].links[linkIndex] = { id: linkId, name, url, description };
    }
  } else {
    // Add new
    dashboardData[categoryIndex].links.push({
      id: `link-${Date.now()}`,
      name,
      url,
      description
    });
  }

  saveData();
  renderDashboard();
  linkModal.close();
}

function deleteLink(categoryId, linkId) {
  if (confirm('Are you sure you want to delete this link?')) {
    const categoryIndex = dashboardData.findIndex(c => c.id === categoryId);
    if (categoryIndex !== -1) {
      dashboardData[categoryIndex].links = dashboardData[categoryIndex].links.filter(l => l.id !== linkId);
      saveData();
      renderDashboard();
    }
  }
}

/**
 * Category Handlers
 */
function handleCategorySubmit() {
  const name = categoryNameInput.value.trim();
  
  if (name) {
    dashboardData.push({
      id: `cat-${Date.now()}`,
      name,
      links: []
    });
    
    saveData();
    renderDashboard();
    categoryModal.close();
  }
}

function deleteCategory(categoryId) {
  if (confirm('Are you sure you want to delete this active category and all its links?')) {
    dashboardData = dashboardData.filter(c => c.id !== categoryId);
    saveData();
    renderDashboard();
  }
}

/**
 * Settings Handlers
 */
function handleSettingsSubmit() {
  let domain = canvasDomainInput.value.trim();
  const token = canvasTokenInput.value.trim();
  const geminiToken = geminiTokenInput.value.trim();
  
  // clean domain
  domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  canvasSettings.domain = domain;
  canvasSettings.token = token;
  canvasSettings.geminiToken = geminiToken;
  
  saveData();
  settingsModal.close();
  
  if (domain && token) {
    refreshCanvasData();
  } else {
    canvasWidgetContainer.style.display = 'none';
  }
}

/**
 * Canvas LMS API Fetching
 */
async function refreshCanvasData() {
  canvasWidgetContainer.style.display = 'block';
  canvasAssignmentsList.innerHTML = `<p class="empty-state" style="padding: 1rem;"><i class="ph ph-spinner ph-spin"></i> Loading Assignments...</p>`;
  
  if (!canvasSettings.domain || !canvasSettings.token) {
    canvasAssignmentsList.innerHTML = `<p class="empty-state" style="padding: 1rem;">Missing Domain or Token in Settings</p>`;
    return;
  }

  // Connect headers
  const headers = {
    'Authorization': `Bearer ${canvasSettings.token}`,
    'Accept': 'application/json'
  };

  try {
    const todoUrl = `https://corsproxy.io/?${encodeURIComponent(`https://${canvasSettings.domain}/api/v1/users/self/todo`)}`;
    const upcomingUrl = `https://corsproxy.io/?${encodeURIComponent(`https://${canvasSettings.domain}/api/v1/users/self/upcoming_events`)}`;

    const [todoRes, upcomingRes] = await Promise.all([
      fetch(todoUrl, { method: 'GET', headers }),
      fetch(upcomingUrl, { method: 'GET', headers })
    ]);

    if (!todoRes.ok) {
      throw new Error(`API Error: ${todoRes.status}`);
    }

    const todoData = await todoRes.json();
    let upcomingData = [];
    if (upcomingRes.ok) {
        upcomingData = await upcomingRes.json();
    }

    const mergedItems = [];
    const seenIds = new Set();
    
    // Process Todo items (Uncompleted)
    todoData.forEach(item => {
      const title = item.assignment ? item.assignment.name : item.quiz ? item.quiz.title : item.ignore_item ? item.ignore_item.title : 'Task';
      const url = item.assignment ? item.assignment.html_url : item.quiz ? item.quiz.html_url : item.html_url || `https://${canvasSettings.domain}`;
      const id = item.assignment ? item.assignment.id : item.quiz ? item.quiz.id : null;
      
      let dueDateStr = null;
      if (item.assignment && item.assignment.due_at) dueDateStr = item.assignment.due_at;
      else if (item.ignore_item && item.ignore_item.due_at) dueDateStr = item.ignore_item.due_at;
      else if (item.quiz && item.quiz.due_at) dueDateStr = item.quiz.due_at;
      
      if (id) seenIds.add(id.toString());
      
      mergedItems.push({
        id: id,
        title: title,
        url: url,
        courseName: item.context_name || '',
        dueDateStr: dueDateStr,
        isCompleted: false
      });
    });

    // Process Upcoming items (Completed if not in Todo list)
    upcomingData.forEach(event => {
       const isAssgn = event.type === 'assignment' || event.assignment;
       if (isAssgn) {
          const assgn = event.assignment || {};
          const id = (assgn.id || (event.id + "").replace('assignment_', '')) + "";
          
          if (!seenIds.has(id)) {
             let cName = event.context_name;
             if (!cName && event.context_code) {
                 cName = event.context_code.replace('course_', 'Course ');
             }
             
             mergedItems.push({
               id: id,
               title: event.title || assgn.name || 'Task',
               url: event.html_url || assgn.html_url || `https://${canvasSettings.domain}`,
               courseName: cName || '',
               dueDateStr: assgn.due_at || event.start_at || event.end_at,
               isCompleted: true // It's upcoming but not in todo, we assume it's done!
             });
             seenIds.add(id);
          }
       }
    });
    
    // Sort by due date (oldest first, i.e., overdue -> soon -> later)
    mergedItems.sort((a, b) => {
       if (!a.dueDateStr) return 1;
       if (!b.dueDateStr) return -1;
       return new Date(a.dueDateStr) - new Date(b.dueDateStr);
    });

    renderCanvasAssignments(mergedItems);
    
  } catch (error) {
    console.error("Canvas API Error:", error);
    canvasAssignmentsList.innerHTML = `
      <p class="empty-state" style="padding: 1rem; color: var(--danger-color);">
        <i class="ph ph-warning"></i> ${error.message}<br>
        Check Token/Domain
      </p>
    `;
  }
}

function renderCanvasAssignments(items) {
  canvasAssignmentsList.innerHTML = '';
  
  if (!items || items.length === 0) {
    canvasAssignmentsList.innerHTML = `<p class="empty-state" style="padding: 1rem;">No impending doom!</p>`;
    return;
  }
  
  // limit to next 5 items for UI cleanliness
  const displayItems = items.slice(0, 5);
  
  displayItems.forEach((item, index) => {
    // delay for staggered cascade animation
    const animationDelay = `${index * 0.1}s`;
    
    const title = item.title || 'Task';
    const url = item.url || `https://${canvasSettings.domain}`;
    
    // Attempt to extract course info
    let courseNameHtml = '';
    if (item.courseName) {
      courseNameHtml = `<span style="font-size: 0.70rem; color: var(--accent-purple); font-weight: bold; text-transform: uppercase;">${escapeHTML(item.courseName)}</span>`;
    }

    // Formatting Due Date
    const dueDateStr = item.dueDateStr; 
    let dueFormatted = 'No due date';
    let isUrgent = false;   // Purple: due soon
    let isOverdue = false;  // Red: overdue
    const isCompleted = item.isCompleted;// Green: completed
    
    if (dueDateStr) {
      const dueDate = new Date(dueDateStr);
      dueFormatted = dueDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      
      if (!isCompleted) {
        const diffMs = dueDate - new Date();
        if (diffMs < 0) {
          isOverdue = true;
        } else if (diffMs < 48 * 60 * 60 * 1000) {
          isUrgent = true;
        }
      }
    }
    
    let colors = '';
    let iconColor = '';
    let iconClass = 'ph-exam';
    
    if (isCompleted) {
      colors = `color: var(--accent-green-hover); border-color: var(--accent-green);`;
      iconColor = `background-color: var(--accent-green); color: #fff; border-color: var(--accent-green-hover);`;
      iconClass = 'ph-check-circle';
    } else if (isOverdue) {
      colors = `color: var(--danger-hover); border-color: var(--danger-color);`;
      iconColor = `background-color: var(--danger-color); color: #fff; border-color: var(--danger-hover);`;
      iconClass = 'ph-warning-circle';
    } else if (isUrgent) {
      colors = `color: var(--accent-purple-hover); border-color: var(--accent-purple);`;
      iconColor = `background-color: var(--accent-purple); color: #fff; border-color: var(--accent-purple-hover);`;
      iconClass = 'ph-clock-countdown';
    }

    const linkEl = document.createElement('a');
    linkEl.className = 'link-item canvas-item';
    linkEl.href = url;
    linkEl.style.animationDelay = animationDelay;
    if (colors) {
        linkEl.style.cssText += colors;
    }
    
    linkEl.innerHTML = `
      <div class="link-item-content">
        <div class="link-icon" style="${iconColor}">
          <i class="ph ${iconClass}"></i>
        </div>
        <div style="display: flex; flex-direction: column; overflow: hidden; gap: 2px;">
            ${courseNameHtml}
            <span class="link-name">${escapeHTML(title)}</span>
            <span style="font-size: 0.75rem; color: var(--text-tertiary); font-family: monospace;">${dueFormatted}</span>
        </div>
      </div>
      <div class="link-item-actions">
        <i class="ph ph-arrow-up-right" style="color: var(--text-tertiary);"></i>
      </div>
    `;
    canvasAssignmentsList.appendChild(linkEl);
  });
}

/**
 * Rendering
 */
function getFaviconUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
  } catch (e) {
    return '';
  }
}

function renderDashboard() {
  dashboardCategories.innerHTML = '';
  
  // Make sure widget is shown/hidden based on settings
  if (canvasSettings.domain && canvasSettings.token) {
    canvasWidgetContainer.style.display = 'block';
  } else {
    canvasWidgetContainer.style.display = 'none';
  }
  
  if (dashboardData.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.style.gridColumn = '1 / -1';
    emptyState.style.marginTop = '2rem';
    emptyState.innerHTML = `
      <p style="margin-bottom: 1rem;"><i class="ph ph-folder-dashed" style="font-size: 3rem; color: var(--text-tertiary);"></i></p>
      <p style="color: var(--text-secondary);">Your dashboard is empty.</p>
    `;
    dashboardCategories.appendChild(emptyState);
    return;
  }

  dashboardData.forEach((category, index) => {
    // stagger animation delay
    const animationDelay = `${index * 0.1}s`;
    
    const card = document.createElement('div');
    card.className = 'category-card';
    card.style.animationDelay = animationDelay;
    
    // Header
    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `
      <h3 class="category-title">
        <i class="ph ph-folder"></i>
        ${escapeHTML(category.name)}
      </h3>
      <div class="category-actions">
        <button class="btn-icon danger" onclick="deleteCategory('${category.id}')" title="Delete Category">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    `;
    
    // Links list
    const linksContainer = document.createElement('div');
    linksContainer.className = 'links-list';
    
    if (category.links.length === 0) {
      linksContainer.innerHTML = `<p class="empty-state">No links yet</p>`;
    } else {
      category.links.forEach(link => {
        const linkEl = document.createElement('a');
        linkEl.className = 'link-item';
        linkEl.href = link.url;
        // Don't default override behavior if the user wants default behavior, but opening in new tab is safe for a new tab app
        
        const faviconUrl = getFaviconUrl(link.url);
        
        const descriptionHtml = link.description ? `<span class="link-description">${escapeHTML(link.description)}</span>` : '';

        linkEl.innerHTML = `
          <div class="link-item-content">
            <div class="link-icon">
              ${faviconUrl ? `<img src="${faviconUrl}" style="width:16px; height:16px; border-radius:3px;" alt="" onerror="this.outerHTML='<i class=\\'ph ph-link\\'></i>'">` : '<i class="ph ph-link"></i>'}
            </div>
            <div class="link-text-container">
              <span class="link-name">${escapeHTML(link.name)}</span>
              ${descriptionHtml}
            </div>
          </div>
          <div class="link-item-actions" onclick="event.preventDefault();">
            <button class="btn-icon" onclick="openEditLinkModal('${category.id}', '${link.id}')" title="Edit">
              <i class="ph ph-pencil-simple"></i>
            </button>
            <button class="btn-icon danger" onclick="deleteLink('${category.id}', '${link.id}')" title="Delete">
              <i class="ph ph-trash"></i>
            </button>
          </div>
        `;
        linksContainer.appendChild(linkEl);
      });
    }
    
    // Add Link Button
    const addLinkBtn = document.createElement('button');
    addLinkBtn.className = 'add-link-btn';
    addLinkBtn.innerHTML = '<i class="ph ph-plus"></i> Add Link';
    addLinkBtn.onclick = () => openAddLinkModal(category.id);
    
    card.appendChild(header);
    card.appendChild(linksContainer);
    card.appendChild(addLinkBtn);
    
    dashboardCategories.appendChild(card);
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag])
  );
}

// Start app
document.addEventListener('DOMContentLoaded', init);
