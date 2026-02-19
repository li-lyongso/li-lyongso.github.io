// Simple community app (client-only) with localStorage persistence

const STORAGE_KEYS = {
  POSTS: 'community_posts_v1',
  MEMBERS: 'community_members_v1',
  USERS: 'community_users_v1',
  SESSION: 'community_session_v1'
};

const DOM = {
  composer: document.getElementById('composer'),
  newPostToggle: document.getElementById('newPostToggle'),
  postSubmit: document.getElementById('postSubmit'),
  postCancel: document.getElementById('postCancel'),
  postTitle: document.getElementById('postTitle'),
  postBody: document.getElementById('postBody'),
  postTags: document.getElementById('postTags'),
  feed: document.getElementById('feed'),
  noPosts: document.getElementById('noPosts'),
  membersList: document.getElementById('membersList'),
  memberCount: document.getElementById('memberCount'),
  tagsCloud: document.getElementById('tagsCloud'),
  globalSearch: document.getElementById('globalSearch'),
  postTemplate: document.getElementById('postTemplate').content,
  // Auth
  loginBtn: document.getElementById('loginBtn'),
  signupBtn: document.getElementById('signupBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  userSection: document.getElementById('userSection'),
  authSection: document.getElementById('authSection'),
  userNameDisplay: document.getElementById('userNameDisplay'),
  authModal: document.getElementById('authModal'),
  modalTitle: document.getElementById('modalTitle'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authName: document.getElementById('authName'),
  modalCancel: document.getElementById('modalCancel'),
  modalSubmit: document.getElementById('modalSubmit'),
  modalSwitch: document.getElementById('modalSwitch'),
  // Election
  electionToggle: document.getElementById('electionToggle'),
  electionComposer: document.getElementById('electionComposer'),
  electionTitle: document.getElementById('electionTitle'),
  electionOptions: document.getElementById('electionOptions'),
  addOptionBtn: document.getElementById('addOptionBtn'),
  electionCancel: document.getElementById('electionCancel'),
  electionSubmit: document.getElementById('electionSubmit')
};

let posts = [];
let members = [];
let users = [];
let currentUser = null;
let isSignUpMode = false;

function save() {
  localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(currentUser));
}

function load() {
  posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || "[]");
  members = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMBERS) || "[]");
  users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
  currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION) || "null");
  
  if (members.length === 0) {
    members = [
      { name: "타냐", initials: "T" },
      { name: "빅토리아", initials: "V" },
      { name: "모니카", initials: "M" },
      { name: "베니", initials: "B" }
    ];
  }
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return '방금 전';
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff/3600)}시간 전`;
  return `${Math.floor(diff/86400)}일 전`;
}

function render() {
  updateAuthUI();

  // members
  DOM.membersList.innerHTML = '';
  members.forEach(m => {
    const li = document.createElement('li');
    li.className = 'member-item';
    li.innerHTML = `<div class="avatar" title="${m.name}">${m.initials}</div><div>${m.name}</div>`;
    DOM.membersList.appendChild(li);
  });
  DOM.memberCount.textContent = members.length;

  // tags
  const tagCounts = {};
  posts.forEach(p => (p.tags || []).forEach(t => tagCounts[t] = (tagCounts[t]||0)+1));
  DOM.tagsCloud.innerHTML = '';
  Object.keys(tagCounts).sort((a,b)=>tagCounts[b]-tagCounts[a]).slice(0,12).forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'tag-pill';
    btn.textContent = `${t} (${tagCounts[t]})`;
    btn.onclick = ()=> filterByTag(t);
    DOM.tagsCloud.appendChild(btn);
  });

  // feed
  const q = DOM.globalSearch.value.trim().toLowerCase();
  const filtered = posts.filter(p => {
    if (!q) return true;
    const inTitle = (p.title||'').toLowerCase().includes(q);
    const inBody = (p.body||'').toLowerCase().includes(q);
    const inTags = (p.tags||[]).join(' ').toLowerCase().includes(q);
    return inTitle || inBody || inTags;
  }).sort((a,b)=>b.ts-a.ts);

  DOM.feed.innerHTML = '';
  if (filtered.length === 0) {
    DOM.noPosts.classList.remove('hidden');
  } else {
    DOM.noPosts.classList.add('hidden');
    filtered.forEach(p => {
      const el = document.importNode(DOM.postTemplate, true);
      const article = el.querySelector('.post');
      el.querySelector('.avatar').textContent = p.author.initials || p.author.name[0] || '?';
      el.querySelector('.author').textContent = p.author.name;
      el.querySelector('.time').textContent = timeAgo(p.ts);
      el.querySelector('.post-title').textContent = p.title || '';
      el.querySelector('.post-body').textContent = p.body;
      el.querySelector('.like-count').textContent = p.likes || 0;
      el.querySelector('.comment-count').textContent = (p.comments||[]).length || 0;
      el.querySelector('.post-time').textContent = new Date(p.ts).toLocaleString();

      // Election display
      if (p.isElection) {
        const electionWrap = el.querySelector('.election-display');
        electionWrap.classList.remove('hidden');
        electionWrap.querySelector('.election-q').textContent = `🗳️ ${p.title}`;
        const votesArea = electionWrap.querySelector('.election-votes');
        votesArea.innerHTML = '';
        
        const totalVotes = Object.values(p.votes || {}).reduce((a,b)=>a+b, 0);
        p.options.forEach(opt => {
          const count = p.votes[opt] || 0;
          const pct = totalVotes > 0 ? (count/totalVotes)*100 : 0;
          const item = document.createElement('div');
          item.className = 'vote-item';
          item.innerHTML = `
            <div class="vote-bar" style="width:${pct}%"></div>
            <div class="vote-text">
              <span>${opt}</span>
              <span class="vote-count">${count}표 (${Math.round(pct)}%)</span>
            </div>
          `;
          item.onclick = () => {
            if (!currentUser) { alert('투표하려면 로그인이 필요합니다.'); return; }
            p.votes[opt] = (p.votes[opt] || 0) + 1;
            save();
            render();
          };
          votesArea.appendChild(item);
        });
      }

      // tags
      const tagsWrap = el.querySelector('.post-tags');
      (p.tags||[]).forEach(t=>{
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = t;
        span.onclick = ()=> filterByTag(t);
        tagsWrap.appendChild(span);
      });

      // like
      const likeBtn = el.querySelector('.like-btn');
      likeBtn.addEventListener('click', ()=>{
        if (!currentUser) { alert('로그인이 필요합니다.'); return; }
        p.likedBy = p.likedBy || [];
        const idx = p.likedBy.indexOf(currentUser.email);
        if (idx === -1) {
          p.likedBy.push(currentUser.email);
          p.likes = (p.likes || 0) + 1;
        } else {
          p.likedBy.splice(idx, 1);
          p.likes = Math.max(0, (p.likes || 0) - 1);
        }
        save();
        render();
      });

      // comments
      const commentToggle = el.querySelector('.comment-toggle');
      const commentsArea = el.querySelector('.comments');
      const existingComments = el.querySelector('.existing-comments');
      
      existingComments.innerHTML = '';
      (p.comments||[]).forEach(c=>{
        const div = document.createElement('div');
        div.className = 'comment';
        div.innerHTML = `<strong>${c.author}</strong> · <small style="color:var(--muted)">${timeAgo(c.ts)}</small><div>${c.text}</div>`;
        existingComments.appendChild(div);
      });

      commentToggle.addEventListener('click', () => commentsArea.classList.toggle('hidden'));
      
      const addCommentBtn = el.querySelector('.add-comment-btn');
      const commentInput = el.querySelector('.comment-input');
      addCommentBtn.addEventListener('click', ()=>{
        if (!currentUser) { alert('로그인이 필요합니다.'); return; }
        const text = commentInput.value.trim();
        if (!text) return;
        p.comments = p.comments || [];
        p.comments.push({ author: currentUser.name, text, ts: Date.now() });
        commentInput.value = '';
        save();
        render();
      });

      DOM.feed.appendChild(el);
    });
  }
}

function updateAuthUI() {
  if (currentUser) {
    DOM.userSection.classList.add('hidden');
    DOM.authSection.classList.remove('hidden');
    DOM.userNameDisplay.textContent = `${currentUser.name}님`;
  } else {
    DOM.userSection.classList.remove('hidden');
    DOM.authSection.classList.add('hidden');
  }
}

// Auth Events
DOM.loginBtn.onclick = () => { isSignUpMode = false; openAuthModal(); };
DOM.signupBtn.onclick = () => { isSignUpMode = true; openAuthModal(); };
DOM.logoutBtn.onclick = () => { currentUser = null; save(); render(); };
DOM.modalCancel.onclick = () => DOM.authModal.classList.add('hidden');
DOM.modalSwitch.onclick = () => { isSignUpMode = !isSignUpMode; updateModalContent(); };

function openAuthModal() {
  DOM.authModal.classList.remove('hidden');
  updateModalContent();
}

function updateModalContent() {
  DOM.modalTitle.textContent = isSignUpMode ? '회원가입' : '로그인';
  DOM.authName.classList.toggle('hidden', !isSignUpMode);
  DOM.modalSwitch.textContent = isSignUpMode ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입';
}

DOM.modalSubmit.onclick = () => {
  const email = DOM.authEmail.value.trim();
  const password = DOM.authPassword.value.trim();
  const name = DOM.authName.value.trim();

  if (!email || !password) { alert('정보를 모두 입력해주세요.'); return; }

  if (isSignUpMode) {
    if (!name) { alert('이름을 입력해주세요.'); return; }
    if (users.find(u => u.email === email)) { alert('이미 존재하는 이메일입니다.'); return; }
    const newUser = { email, password, name, initials: name[0].toUpperCase() };
    users.push(newUser);
    currentUser = newUser;
    members.unshift({ name: newUser.name, initials: newUser.initials });
  } else {
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) { alert('이메일 또는 비밀번호가 틀렸습니다.'); return; }
    currentUser = user;
  }
  
  save();
  DOM.authModal.classList.add('hidden');
  DOM.authEmail.value = '';
  DOM.authPassword.value = '';
  DOM.authName.value = '';
  render();
};

// Post Events
DOM.newPostToggle.onclick = () => DOM.composer.classList.toggle('hidden');
DOM.postCancel.onclick = () => { DOM.composer.classList.add('hidden'); clearPostInputs(); };
DOM.postSubmit.onclick = () => {
  const title = DOM.postTitle.value.trim();
  const body = DOM.postBody.value.trim();
  const tags = DOM.postTags.value.split(',').map(s=>s.trim()).filter(Boolean).map(t=>t.replace(/\s+/g,'-').toLowerCase());
  if (!body) { alert('내용을 입력해주세요.'); return; }
  
  posts.push({
    id: 'p_'+Math.random().toString(36).slice(2,9),
    author: currentUser,
    title, body, tags, ts: Date.now(), likes: 0, comments: [], likedBy: []
  });
  save();
  clearPostInputs();
  DOM.composer.classList.add('hidden');
  render();
};

function clearPostInputs() {
  DOM.postTitle.value = ''; DOM.postBody.value = ''; DOM.postTags.value = '';
}

// Election Events
DOM.electionToggle.onclick = () => DOM.electionComposer.classList.toggle('hidden');
DOM.addOptionBtn.onclick = () => {
  const input = document.createElement('input');
  input.className = 'election-opt';
  input.placeholder = `옵션 ${DOM.electionOptions.children.length + 1}`;
  DOM.electionOptions.appendChild(input);
};
DOM.electionCancel.onclick = () => DOM.electionComposer.classList.add('hidden');
DOM.electionSubmit.onclick = () => {
  const title = DOM.electionTitle.value.trim();
  const options = Array.from(DOM.electionOptions.querySelectorAll('.election-opt'))
    .map(i => i.value.trim()).filter(Boolean);
    
  if (!title || options.length < 2) { alert('제목과 최소 2개의 옵션을 입력해주세요.'); return; }
  
  posts.push({
    id: 'e_'+Math.random().toString(36).slice(2,9),
    author: currentUser,
    title, body: '새로운 투표가 시작되었습니다!', isElection: true,
    options, votes: {}, ts: Date.now(), likes: 0, comments: [], likedBy: []
  });
  
  save();
  DOM.electionComposer.classList.add('hidden');
  DOM.electionTitle.value = '';
  DOM.electionOptions.innerHTML = '<input class="election-opt" placeholder="옵션 1" /><input class="election-opt" placeholder="옵션 2" />';
  render();
};

function filterByTag(tag){
  DOM.globalSearch.value = tag;
  render();
}

DOM.globalSearch.oninput = () => render();

(function init(){
  load();
  render();
})();
