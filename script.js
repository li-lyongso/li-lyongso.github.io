// Simple community app (client-only) with localStorage persistence

const STORAGE_KEYS = {
  POSTS: 'community_posts_v1',
  MEMBERS: 'community_members_v1',
  JOINED: 'community_joined_v1'
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
  joinBtn: document.getElementById('joinBtn'),
  globalSearch: document.getElementById('globalSearch'),
  postTemplate: document.getElementById('postTemplate').content
};

let posts = [];
let members = [];
let joined = false;
let currentUser = { name: "You", initials: "Y" };

function save() {
  localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  localStorage.setItem(STORAGE_KEYS.JOINED, JSON.stringify(joined));
}

function load() {
  posts = JSON.parse(localStorage.getItem(STORAGE_KEYS.POSTS) || "[]");
  members = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMBERS) || "[]");
  joined = JSON.parse(localStorage.getItem(STORAGE_KEYS.JOINED) || "false");
  if (members.length === 0) {
    // seed members
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
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}d`;
}

function render() {
  // members
  DOM.membersList.innerHTML = '';
  members.forEach(m => {
    const li = document.createElement('li');
    li.className = 'member-item';
    li.innerHTML = `<div class="avatar" title="${m.name}">${m.initials}</div><div>${m.name}</div>`;
    DOM.membersList.appendChild(li);
  });
  DOM.memberCount.textContent = members.length + (joined && !members.find(m => m.name === currentUser.name) ? 1 : 0);

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

  // feed (apply search)
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
      function updateLikeUI(){
        likeBtn.querySelector('.like-count').textContent = p.likes || 0;
        if (p.liked) likeBtn.classList.add('liked'); else likeBtn.classList.remove('liked');
      }
      likeBtn.addEventListener('click', ()=>{
        p.liked = !p.liked;
        p.likes = (p.likes||0) + (p.liked ? 1 : -1);
        save();
        updateLikeUI();
      });
      updateLikeUI();

      // comments
      const commentToggle = el.querySelector('.comment-toggle');
      const commentsArea = el.querySelector('.comments');
      const existingComments = el.querySelector('.existing-comments');
      function renderComments(){
        existingComments.innerHTML = '';
        (p.comments||[]).forEach(c=>{
          const div = document.createElement('div');
          div.className = 'comment';
          div.innerHTML = `<strong>${c.author}</strong> · <small style="color:var(--muted)">${timeAgo(c.ts)}</small><div>${c.text}</div>`;
          existingComments.appendChild(div);
        });
        el.querySelector('.comment-count').textContent = (p.comments||[]).length;
      }
      commentToggle.addEventListener('click', ()=>{
        commentsArea.classList.toggle('hidden');
      });
      const addCommentBtn = el.querySelector('.add-comment-btn');
      const commentInput = el.querySelector('.comment-input');
      addCommentBtn.addEventListener('click', ()=>{
        const text = commentInput.value.trim();
        if (!text) return;
        p.comments = p.comments || [];
        p.comments.push({ author: currentUser.name, text, ts: Date.now() });
        commentInput.value = '';
        save();
        renderComments();
      });
      renderComments();

      DOM.feed.appendChild(el);
    });
  }
}

function filterByTag(tag){
  DOM.globalSearch.value = tag;
  render();
}

// events
DOM.newPostToggle.addEventListener('click', ()=>{
  DOM.composer.classList.toggle('hidden');
});
DOM.postCancel.addEventListener('click', ()=> {
  DOM.composer.classList.add('hidden');
  DOM.postTitle.value = '';
  DOM.postBody.value = '';
  DOM.postTags.value = '';
});
DOM.postSubmit.addEventListener('click', ()=>{
  const title = DOM.postTitle.value.trim();
  const body = DOM.postBody.value.trim();
  const tags = DOM.postTags.value.split(',').map(s=>s.trim()).filter(Boolean).map(t=>t.replace(/\s+/g,'-').toLowerCase());
  if (!body) { alert('Please write something'); return; }
  const post = {
    id: 'p_'+Math.random().toString(36).slice(2,9),
    author: currentUser,
    title, body, tags, ts: Date.now(), likes: 0, comments: []
  };
  posts.push(post);
  save();
  DOM.postTitle.value = '';
  DOM.postBody.value = '';
  DOM.postTags.value = '';
  DOM.composer.classList.add('hidden');
  render();
});

// join handling
DOM.joinBtn.addEventListener('click', ()=>{
  joined = !joined;
  if (joined) {
    if (!members.find(m=>m.name===currentUser.name)) members.unshift({ name: currentUser.name, initials: currentUser.initials });
    DOM.joinBtn.textContent = 'Joined';
    DOM.joinBtn.classList.add('btn-ghost');
  } else {
    members = members.filter(m=>m.name !== currentUser.name);
    DOM.joinBtn.textContent = 'Join';
    DOM.joinBtn.classList.remove('btn-ghost');
  }
  save();
  render();
});

// search
DOM.globalSearch.addEventListener('input', ()=> render());

// initial load
(function init(){
  load();
  // ensure join button state
  if (joined) {
    DOM.joinBtn.textContent = 'Joined';
    DOM.joinBtn.classList.add('btn-ghost');
    if (!members.find(m=>m.name===currentUser.name)) members.unshift({ name: currentUser.name, initials: currentUser.initials });
  } else {
    DOM.joinBtn.textContent = 'Join';
    DOM.joinBtn.classList.remove('btn-ghost');
  }
  render();
})();
